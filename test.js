import { Account, Wallet } from "@harmony-js/account";
import { Messenger, HttpProvider } from "@harmony-js/network";
import { ChainID, ChainType, Unit } from "@harmony-js/utils";
import { TransactionFactory } from "@harmony-js/transaction";
import { Harmony } from "@harmony-js/core";
// console.log("mnemonic ", Wallet.generateMnemonic());
// const mn1 = Wallet.generateMnemonic();

//=======REGEX amount==========
// amount() {
//   if (!RegExp(`^[0-9]*[.]?[0-9]{0,${Math.min(8, this.selectedToken.decimals)}}$`, "g").test(this.amount))
//     this.amount = this.amount.slice(0, this.amount.length - 1);
// },

const hmy = new Harmony("https://api.s0.t.hmny.io/", {
  chainType: ChainType.Harmony,
  chainId: ChainID.HmyMainnet,
});
// const mn1 =
//   "north fossil sun grant notable lyrics duck crystal inflict arrive picnic milk";
// console.log("mnemonic ", mn1);
// const wallet = new Wallet(hmy);
// let acc1 = wallet.addByMnemonic(mn1);
// console.log("account addr ", acc1.address);
// console.log("account bech32 addr ", acc1.bech32Address);
// acc1.getBalance().then((v) => {
//   console.log("account balance ", v);
//   console.log(v.balance);
// });

// const mn2 = Wallet.generateMnemonic();
// const mn2 =
//   "loud term gossip basket loop merry brass under glare wolf gun useless";
// console.log("mnemonic ", mn2);
// let acc2 = wallet.addByMnemonic(mn2);
// // console.log("account create " + JSON.stringify(acc2));
// console.log("account addr ", acc2.address);
// console.log("account bech32 addr ", acc2.bech32Address);
// console.log("account balance ", acc2.balance);
// const acc = new Account(
//   "45e497bd45a9049bcb649016594489ac67b9f052a6cdf5cb74ee2427a60bf25e",
//   new Messenger(
//     new HttpProvider("https://api.s0.b.hmny.io"),
//     ChainType.Harmony,
//     ChainID.HmyTestnet
//   )
// );

// console.log(acc.bech32Address);

// const factory = new TransactionFactory(hmy);
// hmy.wallet.addByMnemonic(mn2);

// const txn = hmy.transactions.newTx({
//   // to: "one14nt2lnn0jssxxpvmelmpxrvuktamr3ahhud8j4",
//   to: "one1j4792efsaqm8xf04erfwzcucxz3z5dq7yx90wf",
//   value: new Unit(1).asOne().toWei(),
//   // gas limit, you can use string
//   gasLimit: "21000",
//   // send token from shardID
//   shardID: 0,
//   // send token to toShardID
//   toShardID: 0,
//   // gas Price, you can use Unit class, and use Gwei, then remember to use toWei(), which will be transformed to BN
//   gasPrice: new Unit("1").asGwei().toWei(),
// });

// hmy.wallet.signTransaction(txn).then((signedTxn) => {
//   signedTxn.sendTransaction().then(([tx, hash]) => {
//     console.log("tx hash: " + hash);
//     signedTxn.confirm(hash).then((response) => {
//       console.log(response.receipt);
//     });
//   });
// });


//oswap contract address testnet: 0x759c7F96fD1F98Ab28b6f09b3282f0cC62c9A3Cc

import {abi} from "./artifacts.js";
import BN from "bn.js";
import BigNumber from "bignumber.js";
// console.log("abi ", abi);
const contractAddress = "0x087e1B11777e8612142334BE986aDb6F64aF71B5";
const contract = hmy.contracts.createContract(abi.abi, contractAddress);

async function balance(){
  let balance = await contract.methods.balanceOf("0xeE87fd68e7e878f9a858Dcc1010f2179E198886b").call();
  return balance;
}

try {
  const weiBalance = await balance();
  const hexDecimals = await contract.methods.decimals().call();
  const decimals = new BN(hexDecimals, 16).toNumber();

  let bl = BigNumber(weiBalance)
                .dividedBy(Math.pow(10, decimals))
                .toFixed();
  console.log(bl);
} catch (error) {
  console.log("error ", error);
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
    };
  } catch (err) {
    return {
      result: false,
      mesg: err,
    };
  }
}

async function send(amount, toHex, fromHex, pKey){
  try {
    const hexDecimals = await contract.methods.decimals().call();
    const decimals = new BN(hexDecimals, 16).toNumber();
    const weiAmount = new BN(new BigNumber(amount).multipliedBy(Math.pow(10, decimals)).toFixed(), 10);
    const gasLimit = "250000";
    const gasPrice = 1;
    const txn = await contract.methods.transfer(toHex, weiAmount).createTransaction();
    txn.setParams({
      ...txn.txParams,
      from: fromHex,
      gasLimit,
      gasPrice: new hmy.utils.Unit(gasPrice).asGwei().toWei(),
    });
    const account = hmy.wallet.addByPrivateKey(pKey);
    const signedTxn = await account.signTransaction(txn);
    const res = await sendTransaction(signedTxn);
    return res;
  } catch (error){
    return {
      result: false,
      mesg: err,
    };
  }
}

try {
  const toHex = "0x0180Bd56393851a46fab05Ae627FB574DaDB5049";
  const fromHex = "0xeE87fd68e7e878f9a858Dcc1010f2179E198886b";
  const pKey = "";
  const res = await send(100, toHex, fromHex, pKey);
  console.log("res ", res);
} catch (error) {
  console.log("send error ", error);
}
