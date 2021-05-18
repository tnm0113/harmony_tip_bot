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

// const submissions = new SubmissionStream(client, {
//   subreddit: "AskReddit",
//   limit: 10,
//   pollTime: 2000,
// });
// submissions.on("item", console.log);

// const options = new InboxStreamOptions({filter: "mentio})

const inbox = new InboxStream(client, {
  filter: "mentions",
  limit: 0,
  pollTime: 2000,
});
inbox.on("item", function (item) {
  let c = client.getComment(item.parent_id);
  c.author.then((a) => {
    console.log("author ", a.name);
  });
  c.body.then((b) => {
    console.log("body ", b);
  });
});

// inbox.end();
inbox.on("end", () => console.log("And now my watch has ended"));
