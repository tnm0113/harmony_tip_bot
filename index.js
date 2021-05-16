import { InboxStream, CommentStream, SubmissionStream } from "snoostorm";
import Snoowrap from "snoowrap";

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

// // const submissions = new SubmissionStream(client, {
// //   subreddit: "AskReddit",
// //   limit: 10,
// //   pollTime: 2000,
// // });
// // submissions.on("item", console.log);

// const inbox = new InboxStream(client);
// inbox.on("item", console.log);

// inbox.end();
// inbox.on("end", () => console.log("And now my watch has ended"));

import { Account } from "@harmony-js/account";
import { Messenger, HttpProvider } from "@harmony-js/network";
import { ChainID, ChainType } from "@harmony-js/utils";

const acc = new Account(
  '45e497bd45a9049bcb649016594489ac67b9f052a6cdf5cb74ee2427a60bf25e',
  new Messenger(
    new HttpProvider('https://api.s0.b.hmny.io'),
    ChainType.Harmony,
    ChainID.HmyTestnet,
  ),
);

console.log(acc.bech32Address);

