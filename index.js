import { InboxStream, CommentStream, SubmissionStream } from "snoostorm";
import Snoowrap from "snoowrap";

import { Account, Wallet } from "@harmony-js/account";
import { Messenger, HttpProvider } from "@harmony-js/network";
import { ChainID, ChainType, Unit } from "@harmony-js/utils";
import { TransactionFactory } from "@harmony-js/transaction";
import { Harmony } from "@harmony-js/core";
import { createUser, findUser, saveLog, checkExistedInLog } from "./db.js";
import { pino } from "pino";
import config from "./credentials.js";

const hmy = new Harmony("https://api.s0.b.hmny.io/", {
  chainType: ChainType.Harmony,
  chainId: ChainID.HmyTestnet,
});

const wallet = new Wallet(hmy);
const logger = pino(
  {
    prettyPrint: {
      colorize: false,
      levelFirst: true,
      translateTime: "yyyy-dd-mm, h:MM:ss TT",
    },
  },
  pino.destination("./log/app.log")
);

const client = new Snoowrap(config);

const inbox = new InboxStream(client, {
  filter: "mentions" | "messages",
  limit: 0,
  pollTime: 2000,
});

async function findUserByUsername(username) {
  let user = await findUser(username);
  logger.info("find user result ", JSON.stringify(user));
  return user;
}

async function sendMessage(to, subject, text) {
  await client.composeMessage({ to: to, subject: subject, text: text });
}

async function tip(fromUserName, toUserName, amount) {
  console.log(
    "tip from " +
      fromUserName +
      " to  " +
      toUserName +
      " amount " +
      amount +
      " ONE"
  );
  try {
    const fromUser = await findUser(fromUserName);
    const toUser = await findOrCreate(toUserName);
    // if (fromUser && toUser) {
    const fromUserMn = fromUser.mnemonic;
    const addressTo = toUser.oneAddress;
    const fromUserAddress = fromUser.ethAddress;
    const hash = await transfer(fromUserMn, addressTo, amount, fromUserAddress);
    // } else {
    //   console.log("error find user");
    // }
    console.log("txnhash ", hash);
    return hash;
    // return txnHash.result;
  } catch (error) {
    console.log("catch error ", error);
    return null;
  }
}

async function transfer(sendUserMn, toAddress, amount, fromUserAddress) {
  console.log("start transfer");
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
  console.log("txn hash ", txnHash);
  if (txnHash.error) {
    return null;
  }
  hmy.wallet.removeAccount(fromUserAddress);
  return txnHash.result;
}

async function getBalance(username) {
  console.log("get balance of " + username);
  try {
    const user = await findUserByUsername(username);
    if (user) {
      const account = hmy.wallet.addByMnemonic(user.mnemonic);
      const balance = await account.getBalance();
      console.log("balance ", balance);
      const b = new Unit(balance.balance).asWei().toOne();
      console.log("real balance in ONE ", b);
      return {
        oneAddress: user.oneAddress,
        ethAddress: user.ethAddress,
        balance: b,
      };
    }
  } catch (error) {
    console.log("get balance error ", error);
  }
}

async function findOrCreate(username) {
  const u = await findUser(username);
  if (u) {
    return u;
  } else {
    const mnemonic = Wallet.generateMnemonic();
    const account = await hmy.wallet.createAccount(mnemonic);
    return createUser(
      username,
      account.address,
      account.bech32Address,
      0,
      mnemonic
    );
  }
}

async function returnHelp(username) {
  const helpText = `- 'balance' or 'address' - Retrieve your account balance.\n
  - 'create' or 'register' - Create a new account if one does not exist\n
  - 'help' - Get this help message"\n
  - 'history <optional: number of records>' - Retrieves tipbot commands. Default 10, maximum is 50.\n
  - 'send <amount> <currency> <user/address>' - Send Banano to a reddit user or an address\n
  - 'silence <yes/no>' - (default 'no') Prevents the bot from sending you tip notifications or tagging in posts\n
  - 'withdraw <amount> <currency> <user/address>' - Same as send\n
  - 'opt-out' - Disables your account.\n
  - 'opt-in' - Re-enables your account.\n`;
  await client.composeMessage({
    to: username,
    subject: "Tip Bot Help",
    text: helpText,
  });
}

inbox.on("item", async function (item) {
  try {
    if (item.new) {
      const log = await checkExistedInLog(item.id);
      if (!log) {
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
              const author = await c.author;
              const txnHash = await tip(item.author.name, author.name, amount);
              if (txnHash) {
                const txLink =
                  "https://explorer.testnet.harmony.one/#/tx/" + txnHash;
                item.reply(
                  "You have tipped successfully, here is the tx link for that transaction " +
                    txLink
                );
              } else {
                console.log("tip failed");
                item.reply(
                  "Failed to tip, please check your comment, balance and try again"
                );
              }
              await saveLog(
                item.author.name,
                author.name,
                amount,
                item.id,
                currency,
                "tip"
              );
            } else {
              console.log("other case");
              item.reply(
                "Invalid command, send Priavte Message with help in the body to me to get help, tks !"
              );
            }
          } else {
            item.reply(
              "Invalid command, send Private Message with help in the body to me to get help, tks !"
            );
          }
        } else {
          const regexSend = /send\s(.*)/g;
          const regexWithdraw = /withdraw\s(.*)/g;
          console.log("has new message");
          console.log("receive private message from ", item.author.name);
          if (
            item.body.toLowerCase() === "create" ||
            item.body.toLowerCase() === "register"
          ) {
            const user = await findOrCreate(item.author.name);
            if (user) {
              const text =
                `One Address:  ` +
                info.oneAddress +
                `\n 
                Eth Address: ` +
                info.ethAddress +
                `\n `;
              const subject = "Your account info:";
              sendMessage(item.author.name, subject, text);
            }
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
            const info = await getBalance(item.author.name);
            const text =
              `One Address:  ` +
              info.oneAddress +
              `\n +
              Eth Address: ` +
              info.ethAddress +
              `\n +
              Balance:  ` +
              info.balance +
              ` ONE \n`;
            const subject = "Your account info:";
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
              const user = await findUserByUsername(item.author.name);
              const fromUserMn = user.mnemonic;
              await transfer(fromUserMn, addressTo, amount, user.ethAddress);
              await saveLog(
                item.author.name,
                addressTo,
                amount,
                item.id,
                currency,
                "send"
              );
            }
          }
          await item.markAsRead();
        }
      } else {
        console.log("tip action already processed");
      }
    }
  } catch (error) {
    console.log("process item error ", error);
  }
});

// inbox.end();
inbox.on("end", () => console.log("And now my watch has ended"));
