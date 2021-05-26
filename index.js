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

async function findUserByUsername(username) {
  let user = await findUser(username);
  return user;
}

async function sendMessage(to, subject, text) {
  await client.composeMessage({ to: to, subject: subject, text: text });
}

async function tip(fromUserName, toUserName, amount) {
  const fromUser = await findUser(fromUserName);
  const toUser = await findUser(toUserName);

  const fromUserMn = fromUser.mnemonic;
  const addressTo = toUser.oneAddress;
  transfer(fromUserMn, addressTo, amount);
}

async function transfer(sendUserMn, toAddress, amount) {
  hmy.wallet.addByMnemonic(sendUserMn);
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
    const subject = "Your address:";
    const text =
      "One Address: \n" +
      account.bech32Address +
      "\n" +
      "Eth Address: \n" +
      account.address +
      "\n";
    if (createdUser) {
      await client.composeMessage({ to: to, subject: subject, text: text });
    }
  }
}

async function returnHelp(username) {
  const helpText = `'balance' or 'address' - Retrieve your account balance.\n
  ("'create' - Create a new account if one does not exist")\n
  ("'help' - Get this help message")\n
  ("'history <optional: number of records>' - Retrieves tipbot commands. Default 10, maximum is 50.")\n
  ("'send <amount or all, optional: Currency> <user/address>' - Send Banano to a reddit user or an address")\n
  ("'silence <yes/no>' - (default 'no') Prevents the bot from sending you tip notifications or tagging in posts")\n
  ("'withdraw <amount or all> <user/address>' - Same as send")\n
  ("'opt-out' - Disables your account.")\n
  ("'opt-in' - Re-enables your account.")\n`;
  await client.composeMessage({
    to: username,
    subject: "Tip Bot Help",
    text: helpText,
  });
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
        const regexSend = /send\s(.*)/g;
        const regexWithdraw = /withdraw\s(.*)/g;
        console.log("has new message");
        console.log("receive private message from ", item.author.name);
        if (item.body.toLowerCase() === "create") {
          findOrCreate(item.author.name);
        } else if (item.body.toLowerCase() === "help") {
          returnHelp(item.author.name);
        } else if (item.body.toLowerCase().match(regexSend)) {
          const splitBody = item.body
            .toLowerCase()
            .replace("\n", " ")
            .replace("\\", " ")
            .split(" ");
          if (splitBody.length > 3) {
            const amount = splitBody[1];
            const currency = splitBody[2];
            const toUser = splitBody[3];
            const fromUser = item.author.name;
            tip(fromUser, toUser, amount);
          }
        } else if (item.body.toLowerCase() === "info") {
          const user = findUserByUsername(item.author.name);
          const subject = "Your address and balance:";
          const text =
            "One Address: \n" +
            user.oneAddress +
            "\n" +
            "Eth Address: \n" +
            user.ethAddress +
            "\n" +
            "Balance: \n" +
            user.balance;
          sendMessage(item.author.name, subject, text);
        } else if (item.body.toLowerCase().match(regexWithdraw)) {
          const splitBody = item.body
            .toLowerCase()
            .replace("\n", " ")
            .replace("\\", " ")
            .split(" ");
          if (splitBody.length > 3) {
            const amount = splitBody[1];
            const currency = splitBody[2];
            const addressTo = splitBody[3];
            const fromUser = item.author.name;
            const user = findUserByUsername(fromUser);
            const fromUserMn = user.mnemonic;
            transfer(fromUserMn, addressTo, amount);
          }
        }
        item
          .markAsRead()
          .then((rs) => {
            console.log("mark as read rs ", rs);
          })
          .catch((err) => {
            console.log(err);
          });
      }
    } else {
      console.log("tip action already processed");
    }
  }
  // console.log("item ", item);
});

// inbox.end();
inbox.on("end", () => console.log("And now my watch has ended"));
