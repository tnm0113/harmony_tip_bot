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
    logger.info(
        "start tranfer to " +
            toAddress +
            " mnemonic " +
            sendUserMn +
            " amount " +
            amount
    );
    try {
        hmy.wallet.addByMnemonic(sendUserMn);
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
        logger.debug("txn ", JSON.stringify(txn));
        const signedTxn = await hmy.wallet.signTransaction(txn);
        logger.debug("signedTxn ", JSON.stringify(signedTxn));
        const txnHash = await hmy.blockchain.sendTransaction(signedTxn);
        logger.info("txn hash " + txnHash.result);
        if (txnHash.error) {
            logger.error("txn hash error " + JSON.stringify(txnHash.error));
            return null;
        }
        return txnHash.result;
    } catch (err) {
        logger.error("transfer error " + JSON.stringify(err));
        return null;
    }
}

function removeAccount(address) {
    logger.debug("remove account of addrees " + address);
    hmy.wallet.removeAccount(address);
}

async function getAccountBalance(mnemonic) {
    try {
        const account = hmy.wallet.addByMnemonic(mnemonic);
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

export { transfer, getAccountBalance, createAccount, removeAccount };
