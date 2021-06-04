import { ChainID, ChainType, Unit } from "@harmony-js/utils";
import { Harmony } from "@harmony-js/core";
import { logger } from "./logger.js";
import { Wallet } from "@harmony-js/account";

const hmy = new Harmony("https://api.s0.b.hmny.io/", {
  chainType: ChainType.Harmony,
  chainId: ChainID.HmyTestnet,
});

async function transfer(sendUserMn, toAddress, amount, fromUserAddress) {
  console.log("start transfer");
  logger.info("start tranfer user mn " + sendUserMn + " to " + toAddress);
  try {
    hmy.wallet.addByMnemonic(sendUserMn);
    const txn = hmy.transactions.newTx({
      from: fromUserAddress,
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
    const signedTxn = await hmy.wallet.signTransaction(txn);
    const txnHash = await hmy.blockchain.sendTransaction(signedTxn);
    console.log("txn hash ", txnHash);
    if (txnHash.error) {
      return null;
    }
    // hmy.wallet.removeAccount(fromUserAddress);
    return txnHash.result;
  } catch (err) {
    logger.error({ err: err }, "transfer error ");
    return null;
  }
}

async function getAccountBalance(mnemonic) {
  try {
    const account = hmy.wallet.addByMnemonic(mnemonic);
    const balance = await account.getBalance();
    console.log("balance ", balance);
    const result = new Unit(balance.balance).asWei().toOne();
    logger.info("real balance in ONE " + result);
    return result;
  } catch (error) {
    console.log("get balance error ", error);
    logger.error({ err: error }, "get balance error ");
  }
}

async function createAccount() {
  const mnemonic = Wallet.generateMnemonic();
  const account = await hmy.wallet.createAccount(mnemonic);
  return {
    ethAddress: account.address,
    oneAddress: account.bech32Address,
    mnemonic: mnemonic,
  };
}

export { transfer, getAccountBalance, createAccount };
