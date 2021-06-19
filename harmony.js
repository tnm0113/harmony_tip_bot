import { ChainID, ChainType, Unit } from "@harmony-js/utils";
import { Harmony } from "@harmony-js/core";
import { logger } from "./logger.js";
import { Wallet } from "@harmony-js/account";
import { getAllUser } from "./db.js";
import config from "config";

const botConfig = config.get("bot");

const blockChainUrl = botConfig.mainet ? "https://api.s0.t.hmny.io/" : "https://api.s0.b.hmny.io/";
const chainId = botConfig.mainet ? ChainID.HmyMainnet : ChainID.HmyTestnet;

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
            // gas limit, you can use string
            gasLimit: "21000",
            // send token from shardID
            shardID: 0,
            // send token to toShardID
            toShardID: 0,
            // gas Price, you can use Unit class, and use Gwei, then remember to use toWei(), which will be transformed to BN
            gasPrice: new Unit("1").asGwei().toWei(),
        });
        const signedTxn = await account.signTransaction(txn);
        const txnHash = await hmy.blockchain.sendTransaction(signedTxn);
        logger.info("txn hash " + txnHash.result);
        if (txnHash.error) {
            logger.error("txn hash error " + JSON.stringify(txnHash));
            return null;
        }
        return txnHash.result;
    } catch (err) {
        logger.error("transfer error " + JSON.stringify(err) + " " + err);
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
