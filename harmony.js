import { ChainID, ChainType, Unit, hexToNumber } from "@harmony-js/utils";
import { Harmony } from "@harmony-js/core";
import { logger } from "./logger.js";
import { Wallet } from "@harmony-js/account";
import { RPCMethod } from "@harmony-js/network";
import { getAllUser } from "./db.js";
import config from "config";
import BN from "bn.js";
import BigNumber from "bignumber.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const artifacts = require("./artifacts.json");
// import artifacts from "./artifacts.json"; 

const botConfig = config.get("bot");

const blockChainUrl = botConfig.mainnet ? "https://api.s0.t.hmny.io/" : "https://api.s0.b.hmny.io/";
const chainId = botConfig.mainnet ? ChainID.HmyMainnet : ChainID.HmyTestnet;
const botWalletSeed = botConfig.wallet_seed;

const hmy = new Harmony(blockChainUrl, {
    chainType: ChainType.Harmony,
    chainId: chainId,
});

const mapAccountNonce = new Map();

async function addAllAccounts(){
    const users = await getAllUser();
    users.forEach((user) => {
        hmy.wallet.addByMnemonic(user.mnemonic);
    })
    if (botWalletSeed){
        logger.debug("add bot wallet");
        hmy.wallet.addByMnemonic(botWalletSeed);
    }
    hmy.wallet.accounts.forEach(addr => {
        const account = hmy.wallet.getAccount(addr);
        logger.debug("one address " + account.bech32Address + " eth " + account.address);
        mapAccountNonce.set(account.address, 0);
    });
}

function addNewAccount(mnemonic){
    hmy.wallet.addByMnemonic(mnemonic);
}

async function transferOne(sendAddress, toAddress, amount) {
    logger.info(
        "start tranfer to " +
            toAddress +
            " from address " +
            sendAddress +
            " amount " +
            amount
    );
    try {
        const account = hmy.wallet.getAccount(sendAddress);
        // const nonce = await account.getShardNonce(0);
        let nonce = 0;
        if (mapAccountNonce.get(sendAddress) === 0){
            const data = await hmy.messenger.send(
                RPCMethod.GetTransactionCount,
                [sendAddress, 'latest'],
                hmy.messenger.chainPrefix,
                0,
            );
            logger.debug('data ' + JSON.stringify(data));
            nonce = Number.parseInt(hexToNumber(data.result), 10);
        } else {
            nonce = mapAccountNonce.get(sendAddress) + 1;
        }
        mapAccountNonce.set(sendAddress, nonce);
        logger.debug("account nonce " + nonce);
        const txn = hmy.transactions.newTx({
            nonce: nonce,
            to: toAddress,
            value: new Unit(parseFloat(amount)).asOne().toWei(),
            gasLimit: "21000",
            shardID: 0,
            toShardID: 0,
            gasPrice: new Unit("2").asGwei().toWei(),
        });
        const signedTxn = await account.signTransaction(txn, false);
        const tx = hmy.transactions.recover(signedTxn.getRawTransaction());
        logger.debug('tx ' + JSON.stringify(tx));
        const res = await sendTransaction(signedTxn);
        logger.info("res send transaction " + JSON.stringify(res));
        if (res.result) {
            return res.txnHash;
        } else {
            logger.error("txn hash error " + res.mesg);
            return null;
        }
    } catch (error) {
        logger.error("transfer error " + JSON.stringify(error) + " " + error);
        return null;
    }
}

async function getAccountBalance(address) {
    try {
        // const account = hmy.wallet.addByMnemonic(mnemonic);
        const account = hmy.wallet.getAccount(address);
        const balance = await account.getBalance();
        logger.debug("balance get from blockchain " + JSON.stringify(balance));
        const result = new Unit(balance.balance).asWei().toOne();
        logger.info("real balance in ONE " + result);
        return result;
    } catch (error) {
        logger.error("get balance error " + error);
    }
}

async function getTokenBalance(contractAddress, userAddress){
    try {
        const contract = getContractInstance(contractAddress);
        const weiBalance = await contract.methods.balanceOf(userAddress).call();
        const hexDecimals = await contract.methods.decimals().call();
        const decimals = new BN(hexDecimals, 16).toNumber();
      
        const rs = BigNumber(weiBalance)
                      .dividedBy(Math.pow(10, decimals))
                      .toFixed();
        return rs;
      } catch (error) {
        console.log("error ", error);
      }
}

function createAccount() {
    const mnemonic = Wallet.generateMnemonic();
    const account = hmy.wallet.addByMnemonic(mnemonic);
    logger.debug(
        "account create " +
            account.address +
            " one address " +
            account.bech32Address
    );
    return {
        ethAddress: account.address,
        oneAddress: account.bech32Address,
        mnemonic: mnemonic,
    };
}

export async function sendTransaction(signedTxn) {
    try {
        signedTxn
            .observed()
            .on("transactionHash", (txnHash) => {})
            .on("confirmation", (confirmation) => {
                logger.debug("confirmation " + confirmation);
                if (confirmation !== "CONFIRMED")
                throw new Error(
                    "Transaction confirm failed. Network fee is not enough or something went wrong."
                );
            }
            )
            .on("error", (error) => {
                throw new Error(error);
            });
    
        const [sentTxn, txnHash] = await signedTxn.sendTransaction();
        const confirmedTxn = await sentTxn.confirm(txnHash);
    
        var explorerLink;
        if (confirmedTxn.isConfirmed()) {
            explorerLink = "/tx/" + txnHash;
        } else {
            return {
                result: false,
                mesg: "Can not confirm transaction " + txnHash,
            };
        }
  
        return {
            result: true,
            mesg: explorerLink,
            txnHash: txnHash
        };
    } catch (err) {
        return {
            result: false,
            mesg: err,
        };
    }
}

export const getContractInstance = (contractAddress) => {
    const contract = hmy.contracts.createContract(artifacts.abi, contractAddress);
    return contract;
};
  
async function transferToken(contractAddress, amount, toHex, fromHex){
    try {
        const contract = getContractInstance(contractAddress);
        const hexDecimals = await contract.methods.decimals().call();
        const decimals = new BN(hexDecimals, 16).toNumber();
        const weiAmount = new BN(new BigNumber(amount).multipliedBy(Math.pow(10, decimals)).toFixed(), 10);
        const gasLimit = "25000";
        const gasPrice = 1;
        let nonce = 0;
        if (mapAccountNonce.get(fromHex) === 0){
            const data = await hmy.messenger.send(
                RPCMethod.GetTransactionCount,
                [fromHex, 'latest'],
                hmy.messenger.chainPrefix,
                0,
            );
            logger.debug('data ' + JSON.stringify(data));
            nonce = Number.parseInt(hexToNumber(data.result), 10);
        } else {
            nonce = mapAccountNonce.get(fromHex) + 1;
        }
        mapAccountNonce.set(fromHex, nonce);
        logger.debug("account nonce " + nonce);
        const txn = await contract.methods.transfer(toHex, weiAmount).createTransaction();
        txn.setParams({
            ...txn.txParams,
            from: fromHex,
            gasLimit,
            gasPrice: new hmy.utils.Unit(gasPrice).asGwei().toWei(),
            nonce: nonce
        });
        const account = hmy.wallet.getAccount(fromHex);
        const signedTxn = await account.signTransaction(txn, false);
        const res = await sendTransaction(signedTxn);
        logger.info("res send transaction " + JSON.stringify(res));
        if (res.result) {
            return res.txnHash;
        } else {
            logger.error("tranfer token hash error " + res.mesg);
            return null;
        }
    } catch (error){
        logger.error("tranfer token error " + error);
        return {
            result: false,
            mesg: error,
        };
    }
}

export { transferOne, getAccountBalance, createAccount, addAllAccounts, transferToken, getTokenBalance, addNewAccount };
