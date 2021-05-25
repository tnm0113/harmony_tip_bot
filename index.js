import { InboxStream, CommentStream, SubmissionStream } from "snoostorm";
import Snoowrap from "snoowrap";

import { Account, Wallet } from "@harmony-js/account";
import { Messenger, HttpProvider } from "@harmony-js/network";
import { ChainID, ChainType, Unit } from "@harmony-js/utils";
import { TransactionFactory } from "@harmony-js/transaction";
import { Harmony } from "@harmony-js/core";
import { createUser, findUser, saveLog, checkExistedInLog } from "./db.js";
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
    if (checkExistedInLog(item.id)) {
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
            saveLog(
              item.author.name,
              author.name,
              amount,
              item.id,
              currency,
              "tip"
            );
          }
        }
      } else {
        console.log("has new message");
        console.log("receive private message from ", item.author.name);
        if (item.body === "create") {
          findOrCreate(item.author.name);
        } else if (item.body === "") {
        }
      }
    } else {
      console.log("tip action already processed");
    }
  }
  // console.log("item ", item);
});

// inbox.end();
inbox.on("end", () => console.log("And now my watch has ended"));
