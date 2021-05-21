import { InboxStream, CommentStream, SubmissionStream } from "snoostorm";
import Snoowrap from "snoowrap";

import { Account, Wallet } from "@harmony-js/account";
import { Messenger, HttpProvider } from "@harmony-js/network";
import { ChainID, ChainType, Unit } from "@harmony-js/utils";
import { TransactionFactory } from "@harmony-js/transaction";
import { Harmony } from "@harmony-js/core";
import { createUser, findUser, User } from "./db.js";
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

inbox.on("item", function (item) {
  if (item.new) {
    if (item.was_comment) {
      console.log("has new comment");
      console.log("receive comment mention from ", item.author);
      let c = client.getComment(item.parent_id);
      // if (c.body.)
      c.author.then((a) => {
        console.log("author ", a.name);
      });
      c.body.then((b) => {
        console.log("body ", b);
      });
    } else {
      console.log("has new message");
      console.log("receive private message from ", item.author.name);
      if (item.body === "create") {
        // let u = await User.findOne({ where: { username: item.author } });
        findUser(item.author.name)
          .then((user) => {
            if (user) {
              console.log("user already existed");
            } else {
              console.log("receive request create new address");
              let mn = Wallet.generateMnemonic();
              console.log("create mnemonic ", mn);
              console.log("create account");
              let account = hmy.wallet.addByMnemonic(mn);
              console.log("account address ", account.bech32Address);
              createUser(
                item.author.name,
                account.address,
                account.bech32Address,
                0
              )
                .then((u) => {
                  if (u) {
                    let text =
                      "Here is your address " +
                      account.bech32Address +
                      " and eth version " +
                      account.address;
                    sendMessage(item.author, "Wallet Address", text);
                  }
                })
                .catch((err) => {
                  console.log("create user error ", err);
                });
            }
          })
          .catch((e) => {
            console.log("find user error ", e);
          });
      }
    }
    item.markAsRead().then((rs) => {
      console.log(rs);
    });
  }
  // console.log("item ", item);
});

// inbox.end();
inbox.on("end", () => console.log("And now my watch has ended"));
