import { Account, Wallet } from "@harmony-js/account";
import { Messenger, HttpProvider } from "@harmony-js/network";
import { ChainID, ChainType, Unit } from "@harmony-js/utils";
import { TransactionFactory } from "@harmony-js/transaction";
import { Harmony } from "@harmony-js/core";
// console.log("mnemonic ", Wallet.generateMnemonic());
// const mn1 = Wallet.generateMnemonic();

const hmy = new Harmony("https://api.s0.b.hmny.io/", {
  chainType: ChainType.Harmony,
  chainId: ChainID.HmyTestnet,
});
// const mn1 =
//   "north fossil sun grant notable lyrics duck crystal inflict arrive picnic milk";
// console.log("mnemonic ", mn1);
const wallet = new Wallet(hmy);
// let acc1 = wallet.addByMnemonic(mn1);
// console.log("account addr ", acc1.address);
// console.log("account bech32 addr ", acc1.bech32Address);
// acc1.getBalance().then((v) => {
//   console.log("account balance ", v);
//   console.log(v.balance);
// });

// const mn2 = Wallet.generateMnemonic();
const mn2 =
  "loud term gossip basket loop merry brass under glare wolf gun useless";
console.log("mnemonic ", mn2);
let acc2 = wallet.addByMnemonic(mn2);
// console.log("account create " + JSON.stringify(acc2));
console.log("account addr ", acc2.address);
console.log("account bech32 addr ", acc2.bech32Address);
console.log("account balance ", acc2.balance);
const acc = new Account(
  "45e497bd45a9049bcb649016594489ac67b9f052a6cdf5cb74ee2427a60bf25e",
  new Messenger(
    new HttpProvider("https://api.s0.b.hmny.io"),
    ChainType.Harmony,
    ChainID.HmyTestnet
  )
);

console.log(acc.bech32Address);

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
