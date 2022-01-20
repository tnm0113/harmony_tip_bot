import { ChainID, ChainType, Unit, hexToNumber } from "@harmony-js/utils";
import { Harmony } from "@harmony-js/core";
import { logger } from "./logger.js";
import { Wallet } from "@harmony-js/account";
import { RPCMethod } from "@harmony-js/network";
import { getAllUser } from "./db.js";
import config from "config";

const botConfig = config.get("bot");
const faucetAmount = botConfig.faucet_amount || 0.1;

const blockChainUrl = botConfig.mainnet ? "https://api.harmony.one/" : "https://api.s0.b.hmny.io/";
const chainId = botConfig.mainnet ? ChainID.HmyMainnet : ChainID.HmyTestnet;

let tipbotWallet = '';

const hmy = new Harmony(blockChainUrl, {
    chainType: ChainType.Harmony,
    chainId: chainId,
});

const mapAccountNonce = new Map();

async function addAllAccounts(){
    const users = await getAllUser();
    users.forEach((user) => {
        hmy.wallet.addByMnemonic(user.mnemonic);
        if (user.username.toLowerCase() === botConfig.name.toLowerCase()){
            tipbotWallet = user.oneAddress;
        }
    })
    hmy.wallet.accounts.forEach(addr => {
        const account = hmy.wallet.getAccount(addr);
        logger.debug("one address " + account.bech32Address + " eth " + account.address);
        mapAccountNonce.set(account.address, 0);
    });
}

function addNewAccount(mnemonic){
    hmy.wallet.addByMnemonic(mnemonic);
}

async function faucetForNewUser(userAddress){
    const hash = await transfer(tipbotWallet, userAddress, faucetAmount);
    return hash;
}

async function transfer(sendAddress, toAddress, amount) {
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
        if (mapAccountNonce.get(sendAddress) === 0 || mapAccountNonce.get(sendAddress) === undefined){
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
        if (isNaN(nonce)){
            nonce = 0;
        }
        logger.debug("account nonce " + nonce);
        const txn = hmy.transactions.newTx({
            nonce: nonce,
            to: toAddress,
            value: new Unit(parseFloat(amount)).asOne().toWei(),
            gasLimit: "31000",
            shardID: 0,
            toShardID: 0,
            gasPrice: new Unit("1").asGwei().toWei(),
        });
        mapAccountNonce.set(sendAddress, nonce);
        const signedTxn = await account.signTransaction(txn, false);
        // const tx = hmy.transactions.recover(signedTxn.getRawTransaction());
        // logger.debug('tx ' + JSON.stringify(tx));
        const res = await sendTransaction(signedTxn);
        logger.info("res send transaction " + JSON.stringify(res));
        if (res.result) {
            return res.txnHash;
        } else {
            logger.error("txn hash error " + res.mesg);
            mapAccountNonce.set(sendAddress, 0);
            return null;
        }
    } catch (err) {
        mapAccountNonce.set(sendAddress, 0);
        logger.error("transfer error " + JSON.stringify(err) + " " + err);
        return null;
    }
}

export async function sendTransaction(signedTxn) {
    try {
        signedTxn
            .observed()
            .on("transactionHash", (txnHash) => {
                logger.debug("txnhash " + txnHash);
            })
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
    
        logger.debug("send transaction");
        const [sentTxn, txnHash] = await signedTxn.sendTransaction();
        logger.debug("confirm transaction " + txnHash);
        const confirmedTxn = await sentTxn.confirm(txnHash);
    
        if (confirmedTxn.isConfirmed()) {
            return {
                result: true,
                txnHash: txnHash
            };
        } else {
            return {
                result: false,
                mesg: "Can not confirm transaction " + txnHash,
            };
        }
    } catch (err) {
        return {
            result: false,
            mesg: err,
        };
    }
}

async function getAccountBalance(address) {
    try {
        // const account = hmy.wallet.addByMnemonic(mnemonic);
        const account = hmy.wallet.getAccount(address);
        const balance = await account.getBalance();
        if (!balance){
            return null;
        }
        console.log('balance ' + balance);
        logger.debug('balance ' + balance);
        // logger.debug("balance get from blockchain " + JSON.stringify(balance));
        const result = new Unit(balance.balance).asWei().toOne();
        console.log('result ' + result);
        logger.debug('result ' + result);
        // logger.info("real balance in ONE " + result);
        return result;
    } catch (error) {
        logger.error("get balance error " + error);
        return null;
    }
}

function createAccount() {
    const mnemonic = Wallet.generateMnemonic();
    const account = hmy.wallet.addByMnemonic(mnemonic);
    hmy.wallet.addByMnemonic(mnemonic);
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

export { transfer, getAccountBalance, createAccount, addAllAccounts, addNewAccount, faucetForNewUser };
