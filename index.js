import { InboxStream, CommentStream, SubmissionStream } from "snoostorm";
import Snoowrap from "snoowrap";

import { Account, Wallet } from "@harmony-js/account";
import { Messenger, HttpProvider } from "@harmony-js/network";
import { ChainID, ChainType, Unit } from "@harmony-js/utils";
import { TransactionFactory } from "@harmony-js/transaction";
import { Harmony } from "@harmony-js/core";
import { createUser, findUser } from "./db.js";
const hmy = new Harmony("https://api.s0.b.hmny.io/", {
  chainType: ChainType.Harmony,
  chainId: ChainID.HmyTestnet,
});

const wallet = new Wallet(hmy);

import config from "./credentials.js";

const client = new Snoowrap(config);

const inbox = new InboxStream(client, {
  filter: "mentions" | "messages",
  limit: 0,
  pollTime: 2000,
});

async function sendMessage(to, subject, text) {
  await client.composeMessage({ to: to, subject: subject, text: text });
}

async function tip(fromUserName, toUserName, amount) {
  const fromUser = await findUser(fromUserName);
  const toUser = await findUser(toUserName);

  const fromUserMn = fromUser.mnemonic;
  const addressTo = toUser.oneAddress;
  hmy.wallet.addByMnemonic(fromUserMn);
  const txn = hmy.transactions.newTx({
    to: addressTo,
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
  console.log(txnHash.result);
  hmy.wallet.removeAccount(fromUser.ethAddress);
}

async function findOrCreate(username) {
  const user = await findUser(username);
  if (user) {
    console.log("user already existed");
  } else {
    const mnemonic = Wallet.generateMnemonic();
    const account = hmy.wallet.createAccount(mnemonic);
    const createdUser = await createUser(
      username,
      account.address,
      account.bech32Address,
      0,
      mnemonic
    );
    if (createdUser) {
      await client.composeMessage({ to: to, subject: subject, text: text });
    }
  }
}

inbox.on("item", function (item) {
  if (item.new) {
    if (item.was_comment) {
      console.log("has new comment");
      console.log("receive comment mention from ", item.author);
      let c = client.getComment(item.parent_id);
      console.log("comment body ", item.body);
      let splitCms = item.body
        .toLowerCase()
        .replace("\n", " ")
        .replace("\\", " ")
        .split(" ");
      console.log("split cms ", splitCms);
      if (splitCms.length > 3) {
        if (splitCms[0] === "/u/tnm_tip_bot" && splitCms[1] === "tip") {
          let amount = Number.parseFloat(splitCms[2]);
          let currency = splitCms[3];
          c.author.then((author) => {
            tip(item.author.name, author.name, amount);
          });
          // findUser(item.author.name)
          //   .then((sendUser) => {
          //     let sendUserMn = sendUser.mnemonic;
          //     console.log("sendUserMn ", sendUserMn);
          //     c.author
          //       .then((author) => {
          //         findUser(author.name)
          //           .then((toUser) => {
          //             let addressTo = toUser.oneAddress;
          //             hmy.wallet.addByMnemonic(sendUserMn);
          //             let txn = hmy.transactions.newTx({
          //               to: addressTo,
          //               value: new Unit(amount).asOne().toWei(),
          //               // gas limit, you can use string
          //               gasLimit: "21000",
          //               // send token from shardID
          //               shardID: 0,
          //               // send token to toShardID
          //               toShardID: 0,
          //               // gas Price, you can use Unit class, and use Gwei, then remember to use toWei(), which will be transformed to BN
          //               gasPrice: new Unit("1").asGwei().toWei(),
          //             });
          //             hmy.wallet
          //               .signTransaction(txn)
          //               .then((signedTxn) => {
          //                 signedTxn
          //                   .sendTransaction()
          //                   .then(([tx, hash]) => {
          //                     console.log("tx hash: " + hash);
          //                     signedTxn
          //                       .confirm(hash)
          //                       .then((response) => {
          //                         console.log("receipt ", response.receipt);
          //                         item.reply(
          //                           "You have tipped successfully !!!"
          //                         );
          //                         hmy.wallet.removeAccount(sendUser.ethAddress);
          //                       })
          //                       .catch((e) => {
          //                         console.log("confirm signed tx error ", e);
          //                       });
          //                   })
          //                   .catch((e) => {
          //                     console.log("send error ", e);
          //                   });
          //               })
          //               .catch((e) => {
          //                 console.log("sign err ", e);
          //               });
          //           })
          //           .catch((e) => {
          //             console.log("db err ", e);
          //           });
          //       })
          //       .catch((e) => {
          //         console.log("get author name err ", e);
          //       });
          //   })
          //   .catch((e) => {
          //     console.log("find user error ", e);
          //   });
        }
      }
      // c.author.then((a) => {
      //   console.log("author ", a.name);
      // });
      // c.body.then((b) => {
      //   console.log("body ", b);
      // });
    } else {
      console.log("has new message");
      console.log("receive private message from ", item.author.name);
      if (item.body === "create") {
        // let u = await User.findOne({ where: { username: item.author } });
        findOrCreate(item.author.name);
        // findUser(item.author.name)
        //   .then((user) => {
        //     if (user) {
        //       console.log("user already existed");
        //     } else {
        //       console.log("receive request create new address");
        //       let mn = Wallet.generateMnemonic();
        //       console.log("create mnemonic ", mn);
        //       console.log("create account");
        //       let account = hmy.wallet.addByMnemonic(mn);
        //       console.log("account address ", account.bech32Address);
        //       createUser(
        //         item.author.name,
        //         account.address,
        //         account.bech32Address,
        //         0,
        //         mn
        //       )
        //         .then((u) => {
        //           if (u) {
        //             let text =
        //               "Here is your address " +
        //               account.bech32Address +
        //               " and eth version " +
        //               account.address;
        //             sendMessage(item.author, "Wallet Address", text);
        //           }
        //         })
        //         .catch((err) => {
        //           console.log("create user error ", err);
        //         });
        //     }
        //   })
        //   .catch((e) => {
        //     console.log("find user error ", e);
        //   });
      }
    }
    // item
    //   .markAsRead()
    //   .then((rs) => {})
    //   .catch((e) => {
    //     console.log("mark as read ", e);
    //   });
  }
  // console.log("item ", item);
});

// inbox.end();
inbox.on("end", () => console.log("And now my watch has ended"));
