import { ChainID, ChainType, Unit } from "@harmony-js/utils";
import { Harmony } from "@harmony-js/core";
import { logger } from "./logger.js";
import { Wallet } from "@harmony-js/account";
import { getAllUser } from "./db.js";
import config from "config";

const botConfig = config.get("bot");

const blockChainUrl = botConfig.mainnet ? "https://api.s0.t.hmny.io/" : "https://api.s0.b.hmny.io/";
const chainId = botConfig.mainnet ? ChainID.HmyMainnet : ChainID.HmyTestnet;

const hmy = new Harmony(blockChainUrl, {
    chainType: ChainType.Harmony,
    chainId: chainId,
});

async function addAllAccounts(){
    const users = await getAllUser();
    users.forEach((user) => {
        hmy.wallet.addByMnemonic(user.mnemonic);
    })
    hmy.wallet.accounts.forEach(addr => {
        const account = hmy.wallet.getAccount(addr);
        logger.debug("one address " + account.bech32Address + " eth " + account.address);
    });
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
        const txn = hmy.transactions.newTx({
            to: toAddress,
            value: new Unit(parseFloat(amount)).asOne().toWei(),
            gasLimit: "21000",
            shardID: 0,
            toShardID: 0,
            gasPrice: new Unit("1").asGwei().toWei(),
        });
        const signedTxn = await account.signTransaction(txn);
        const res = await sendTransaction(signedTxn);
        logger.info("res send transaction " + JSON.stringify(res));
        if (res.result) {
            return res.txnHash;
        } else {
            logger.error("txn hash error " + res.mesg);
            return null;
        }
    } catch (err) {
        logger.error("transfer error " + JSON.stringify(err) + " " + err);
        return null;
    }
}

export async function sendTransaction(signedTxn) {
    try {
        signedTxn
            .observed()
            .on("transactionHash", (txnHash) => {})
            .on("confirmation", (confirmation) => {
            if (confirmation !== "CONFIRMED")
                throw new Error(
                    "Transaction confirm failed. Network fee is not enough or something went wrong."
                );
            })
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
        logger.debug("balance get from blockchain " + JSON.stringify(balance));
        const result = new Unit(balance.balance).asWei().toOne();
        logger.info("real balance in ONE " + result);
        return result;
    } catch (error) {
        logger.error("get balance error " + error);
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

export { transfer, getAccountBalance, createAccount, addAllAccounts };
