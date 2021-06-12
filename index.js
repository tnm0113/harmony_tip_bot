import { InboxStream, CommentStream } from "snoostorm";
import Snoowrap from "snoowrap";
import { createUser, findUser, saveLog, checkExistedInLog } from "./db.js";
import { logger } from "./logger.js";
import config from "config";
import {
    transfer,
    getAccountBalance,
    createAccount,
    removeAccount,
} from "./harmony.js";

const regexSend = /send\s(.*)/g;
const regexWithdraw = /withdraw\s(.*)/g;
const regexUser = /\/?u\/(.)*/g;
const snoowrapConfig = config.get("snoowrap");
const botConfig = config.get("bot");

const client = new Snoowrap(snoowrapConfig);
client.config({
    requestDelay: 1000,
    continueAfterRatelimitError: true,
    maxRetryAttempts: 5,
    logger: logger,
});

async function sendMessage(to, subject, text) {
    await client.composeMessage({ to: to, subject: subject, text: text });
}

async function tip(fromUser, toUserName, amount) {
    logger.info(
        "process tip request from " +
            fromUser.username +
            " to " +
            toUserName +
            " amount " +
            amount +
            " ONE"
    );
    try {
        const toUser = await findOrCreate(toUserName);
        const fromUserMn = fromUser.mnemonic;
        const addressTo = toUser.oneAddress;
        const fromUserAddress = fromUser.ethAddress;
        const hash = await transfer(fromUserMn, addressTo, amount);
        removeAccount(fromUserAddress);
        return hash;
    } catch (error) {
        logger.error("catch error " + JSON.stringify(error));
        return null;
    }
}

async function getBalance(username) {
    try {
        const user = await findUser(username);
        if (user) {
            const b = await getAccountBalance(user.mnemonic);
            removeAccount(user.ethAddress);
            return {
                oneAddress: user.oneAddress,
                ethAddress: user.ethAddress,
                balance: b,
            };
        } else {
            return null;
        }
    } catch (error) {
        logger.error("get balance error " + JSON.stringify(error));
    }
}

async function findOrCreate(username) {
    try {
        const u = await findUser(username);
        if (u) {
            return u;
        } else {
            const blockchainInfo = createAccount();
            logger.debug("blockchainInfo " + JSON.stringify(blockchainInfo));
            return createUser(
                username,
                blockchainInfo.ethAddress,
                blockchainInfo.oneAddress,
                0,
                blockchainInfo.mnemonic
            );
        }
    } catch (error) {
        logger.error("findOrCreate user error " + JSON.stringify(error));
        return null;
    }
}

async function returnHelp(username) {
    const helpText =
        `- 'info' - Retrieve your account info.\n\n` +
        `- 'create' or 'register' - Create a new account if one does not exist.\n\n` +
        `- 'send <amount> <currency> <user>' - Send ONE to a reddit user.\n\n` +
        `- 'withdraw <amount> <currency> <address>' - Withdraw ONE to an address.\n\n` +
        `- 'help' - Get this help message.`;
    try {
        await client.composeMessage({
            to: username,
            subject: "Tip Bot Help",
            text: helpText,
        });
    } catch (error) {
        logger.error("return help error " + JSON.stringify(error));
    }
}

async function processMention(item) {
    logger.info(
        "receive comment mention from " +
            item.author.name +
            " body " +
            item.body
    );
    let c = client.getComment(item.parent_id);
    let splitCms = item.body
        .replace("\n", " ")
        .replace("\\", " ")
        .split(" ");
    logger.debug("split cms " + splitCms);
    if (splitCms.length > 3) {
        if (splitCms[1].toLowerCase() === "tip") {
            let amount = -1;
            let currency = "";
            let toUser = "";
            if (splitCms[2].match(regexUser)){
                if (splitCms.length > 4){
                    toUser = splitCms[2].replace("/u/","").replace("u/","");
                    amount = splitCms[3];
                    currency = splitCms[4];
                    logger.debug("send from comment to user " + toUser +  " amount " + amount);
                } else {
                    item.reply(
                        "Failed to tip, please check your comment, balance and try again"
                    );
                }
            } else {
                amount = splitCms[2];
                currency = splitCms[3];
                const author = await c.author;
                toUser = author.name;
                logger.info("tip from comment to user " + toUser + " amount " + amount);
            }
            const sendUser = await findUser(item.author.name);
            if (sendUser) {
                const txnHash = await tip(sendUser, toUser, amount);
                if (txnHash) {
                    const txLink =
                        "https://explorer.testnet.harmony.one/#/tx/" + txnHash;
                    item.reply(
                        "You have tipped successfully, here is the tx link for that transaction " +
                            txLink
                    );
                } else {
                    logger.error("tip failed");
                    item.reply(
                        "Failed to tip, please check your comment, balance and try again"
                    );
                }
            } else {
                item.reply(
                    `Your account doesnt exist, please send "create" or "register" to create account`
                );
            }
            await saveLog(
                item.author.name,
                toUser,
                amount,
                item.id,
                currency,
                "tip"
            );
        } else {
            logger.debug("other case");
            item.reply(
                "Invalid command, send Private Message with help in the body to me to get help, tks !"
            );
        }
    } else {
        item.reply(
            "Invalid command, send Private Message with help in the body to me to get help, tks !"
        );
    }
}

async function processSendRequest(item) {
    const splitBody = item.body
        .toLowerCase()
        .replace("\n", " ")
        .replace("\\", " ")
        .split(" ");
    if (splitBody.length > 3) {
        try {
            const amount = splitBody[1];
            const currency = splitBody[2];
            const toUser = splitBody[3];
            const fromUser = await findUser(item.author.name);
            if (fromUser) {
                const txnHash = await tip(fromUser, toUser, amount);
                if (txnHash) {
                    const txLink =
                        "https://explorer.testnet.harmony.one/#/tx/" + txnHash;
                    await client.composeMessage({
                        to: item.author.name,
                        subject: "Send result",
                        text:
                            "You have tipped successfully, here is the tx link for that transaction " +
                            txLink,
                    });
                } else {
                    await client.composeMessage({
                        to: item.author.name,
                        subject: "Send result:",
                        text: "Failed to tip, please check your comment, balance and try again",
                    });
                }
            } else {
                await client.composeMessage({
                    to: item.author.name,
                    subject: "Send result:",
                    text: `Your account doesnt exist, please send "create" or "register" to create account`,
                });
            }
        } catch (error) {
            logger.error("process send request error " + JSON.stringify(error));
        }
    }
}

async function processInfoRequest(item) {
    const info = await getBalance(item.author.name);
    if (info) {
        const text =
            `One Address:  ` +
            info.oneAddress +
            `\n \n ` +
            `Eth Address: ` +
            info.ethAddress +
            `\n \n` +
            `Balance:  ` +
            info.balance +
            ` ONE`;
        const subject = "Your account info:";
        sendMessage(item.author.name, subject, text);
    } else {
        const text = `Your account doesnt exist, please send "create" or "register" to create account`;
        const subject = "Help message";
        sendMessage(item.author.name, subject, text);
    }
}

async function processWithdrawRequest(item) {
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

async function processCreateRequest(item) {
    const user = await findOrCreate(item.author.name);
    if (user) {
        const text =
            `One Address:  ` +
            user.oneAddress +
            `\n \n` +
            `Eth Address: ` +
            user.ethAddress;
        const subject = "Your account info:";
        sendMessage(item.author.name, subject, text);
    }
}

async function processComment(item){
    logger.info(
        "receive comment from " +
            item.author.name +
            " body " +
            item.body
    );
    let splitCms = item.body
        .replace("\n", " ")
        .replace("\\", " ")
        .split(" ");
    logger.debug("split cms " + splitCms);
    if (splitCms[0] === botConfig.command){
        const log = await checkExistedInLog(item.id);
        if (log){
            logger.info("comment already processed");
        } else {
            const sendUserName = item.author.name;
            let amount = splitCms[1];
            let toUserName = "";
            const sendUser = await findUserByUsername(sendUserName);
            if (sendUser){
                if (splitCms.length === 2){
                    const parentComment = client.getComment(item.parent_id);
                    toUserName = await (await parentComment).author.name;
                } else if (splitCms.length === 3){
                    toUserName = splitCms[2].replace("/u/","").replace("u/","");
                }
                tip(sendUser, toUserName, amount);
            } else {
                item.reply(
                    `Your account doesnt exist, please send "create" or "register" to create account`
                );
            }
            await saveLog(
                sendUserName,
                toUserName,
                amount,
                item.id,
                "ONE",
                "tip"
            );
        }
    } else {
        logger.debug("comment not valid command");
    }
}

try {
    const inbox = new InboxStream(client, {
        filter: "mentions" | "messages",
        limit: 0,
        pollTime: 2000,
    });

    const comments = new CommentStream(client, {
        subreddit: botConfig.subreddit,
        limit: 10,
        pollTime: 2000,
    })

    comments.on("item", async function(item){
        try {
            processComment(item);
        } catch (error) {
            logger.error("process comment error " + JSON.stringify(error));
        }
    });
    
    inbox.on("item", async function (item) {
        try {
            if (item.new) {
                const log = await checkExistedInLog(item.id);
                if (log) {
                    logger.info("tip action already processed");
                } else {
                    if (item.was_comment) {
                        processMention(item);
                    } else {
                        logger.info(
                            "process private message from " +
                                item.author.name +
                                " body " +
                                item.body
                        );
                        if (
                            item.body.toLowerCase() === "create" ||
                            item.body.toLowerCase() === "register"
                        ) {
                            processCreateRequest(item);
                        } else if (item.body.toLowerCase() === "help") {
                            returnHelp(item.author.name);
                        } else if (item.body.toLowerCase().match(regexSend)) {
                            processSendRequest(item);
                        } else if (item.body.toLowerCase() === "info") {
                            processInfoRequest(item);
                        } else if (item.body.toLowerCase().match(regexWithdraw)) {
                            processWithdrawRequest(item);
                        }
                        await item.markAsRead();
                    }
                }
            }
        } catch (error) {
            logger.error("process item inbox error " + JSON.stringify(error));
        }
    });

    inbox.on("end", () => logger.info("Inbox subcribe ended!!!"));
} catch (error){
    logger.error("snoowrap error " + JSON.stringify(error));
}

