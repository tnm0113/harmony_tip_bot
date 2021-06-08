import { ChainID, ChainType, Unit } from "@harmony-js/utils";
import { Harmony } from "@harmony-js/core";
import { logger } from "./logger.js";
import { Wallet } from "@harmony-js/account";

const hmy = new Harmony("https://api.s0.b.hmny.io/", {
    chainType: ChainType.Harmony,
    chainId: ChainID.HmyTestnet,
});

const wallet = new Wallet(hmy);

async function transfer(sendUserMn, toAddress, amount) {
    logger.info("start tranfer to " + toAddress);
    try {
        wallet.addByMnemonic(sendUserMn);
        const txn = hmy.transactions.newTx({
            to: toAddress,
            value: new Unit(amount).asOne().toWei(),
            // gas limit, you can use string
            gasLimit: "21000",
            // send token from shardID
            shardID: 0,
            // send token to toShardID
            toShardID: 0,
            // gas Price, you can use Unit class, and use Gwei, then remember to use toWei(), which will be transformed to BN
            gasPrice: new Unit("1").asGwei().toWei(),
        });
        const signedTxn = await wallet.signTransaction(txn);
        const txnHash = await hmy.blockchain.sendTransaction(signedTxn).then();
        logger.info("txn hash " + txnHash.result);
        if (txnHash.error) {
            logger.error("transfer error " + txnHash.error);
            return null;
        }
        return txnHash.result;
    } catch (err) {
        logger.error("transfer error " + err);
        return null;
    }
}

function removeAccount(address) {
    logger.debug("remove account of addrees " + address);
    wallet.removeAccount(address);
}

async function getAccountBalance(mnemonic) {
    try {
        const account = wallet.addByMnemonic(mnemonic);
        const balance = await account.getBalance();
        logger.debug("balance get from blockchain " + JSON.stringify(balance));
        const result = new Unit(balance.balance).asWei().toOne();
        logger.info("real balance in ONE " + result);
        return result;
    } catch (error) {
        logger.error("get balance error " + error);
    }
}

async function createAccount() {
    const mnemonic = Wallet.generateMnemonic();
    const account = await wallet.createAccount(mnemonic);
    return {
        ethAddress: account.address,
        oneAddress: account.bech32Address,
        mnemonic: mnemonic,
    };
}

export { transfer, getAccountBalance, createAccount, removeAccount };
