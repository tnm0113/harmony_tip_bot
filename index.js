import { InboxStream, CommentStream, SubmissionStream } from "snoostorm";
import Snoowrap from "snoowrap";

import { Account, Wallet } from "@harmony-js/account";
import { Messenger, HttpProvider } from "@harmony-js/network";
import { ChainID, ChainType, Unit } from "@harmony-js/utils";
import { TransactionFactory } from "@harmony-js/transaction";
import { Harmony } from "@harmony-js/core";
import { createUser, findUser, User } from './db.js';
const hmy = new Harmony("https://api.s0.b.hmny.io/", {
  chainType: ChainType.Harmony,
  chainId: ChainID.HmyTestnet,
});

const wallet = new Wallet(hmy);

import config from "./credentials.js";
// const creds = require("./credentials.json");

const client = new Snoowrap(config);

// Options object is a Snoowrap Listing object, but with subreddit and pollTime options
// const comments = new CommentStream(client, {
//   subreddit: "TestMyBotTip",
//   limit: 10,
//   pollTime: 2000,
// });
// comments.on("item", console.log);

// const submissions = new SubmissionStream(client, {
//   subreddit: "AskReddit",
//   limit: 10,
//   pollTime: 2000,
// });
// submissions.on("item", console.log);

// const options = new InboxStreamOptions({filter: "mentio})

const inbox = new InboxStream(client, {
  filter: "mentions" | "messages",
  limit: 0,
  pollTime: 2000,
});

async function sendMessage(to, subject, text){
    await client.composeMessage({to: to, subject: subject, text: text});
}

inbox.on("item", function (item) {
    if (item.was_comment){
        console.log('receive comment mention from ', item.author)
        let c = client.getComment(item.parent_id);
        c.author.then((a) => {
            console.log("author ", a.name);
        });
        c.body.then((b) => {
            console.log("body ", b);
        });
    } else {
        console.log('receive private message from ', item.author)        
        if (item.body === "create"){
            if (findUser(item.author)){
                console.log('user already existed');
            } else {
                console.log('receive request create new address');
                let mn = Wallet.generateMnemonic();
                console.log('create mnemonic ', mn);
                console.log('create account');
                let account = hmy.wallet.addByMnemonic(mn);
                console.log('account address ', account.bech32Address);
                // client.composeMessage({
                //     to: item.author,
                //     subject: "Wallet Address",
                //     text: "Here is your address " + account.bech32Address + " and eth version " + account.address
                // }).then()
                let text = "Here is your address " + account.bech32Address + " and eth version " + account.address;
                sendMessage(item.author, "Wallet Address", text);
                createUser(item.author, account.address, account.bech32Address, 0);
                
            }
        }
    }
    console.log('item ', item);
});

// inbox.end();
inbox.on("end", () => console.log("And now my watch has ended"));
