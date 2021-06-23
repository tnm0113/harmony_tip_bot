import { InboxStream, CommentStream } from "snoostorm";
import Snoowrap from "snoowrap";
import { createUser, findUser, saveLog, checkExistedInLog } from "./db.js";
import { logger } from "./logger.js";
import config from "config";
import {
    transfer,
    getAccountBalance,
    createAccount,
    addAllAccounts
} from "./harmony.js";
import * as TEXT from "./text.js";

const regexSend = /send\s(.*)/g;
const regexWithdraw = /withdraw\s(.*)/g;
const regexUser = /\/?u\/(.)*/g;
const snoowrapConfig = config.get("snoowrap");
const botConfig = config.get("bot");

const explorerLink = botConfig.mainnet ? "https://explorer.harmony.one/#/tx/" : "https://explorer.testnet.harmony.one/#/tx/";

const client = new Snoowrap(snoowrapConfig);
client.config({
    requestDelay: 0,
    continueAfterRatelimitError: true,
    maxRetryAttempts: 5,
    debug: true,
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
        const addressTo = toUser.oneAddress;
        const fromUserAddress = fromUser.ethAddress;
        const hash = await transfer(fromUserAddress, addressTo, amount);
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
            const b = await getAccountBalance(user.ethAddress);
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
        `Commands supported via Private Message: \n\n` +
        `- 'info' - Retrieve your account info.\n\n` +
        `- 'create' or 'register' - Create a new account if one does not exist.\n\n` +
        `- 'send <amount> ONE <user>' - Send ONE to a reddit user.\n\n` +
        `- 'withdraw <amount> ONE <address>' - Withdraw ONE to an address.\n\n` +
        `- 'private ' - Get wallet recovery phrase.\n\n` +
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
        .toLowerCase()
        .replace("\n", " ")
        .replace("\\", " ")
        .split(" ");
    logger.debug("split cms " + splitCms);
    if (splitCms[0] === botConfig.command){
        // processComment(item);
        logger.debug("process in comment section");
        return;
    }
    if (splitCms.length > 3) {
        if (splitCms[1] === "tip") {
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
                    item.reply(TEXT.TIP_FAILED(botConfig.name));
                }
            } else {
                amount = splitCms[2];
                currency = splitCms[3];
                const author = await c.author;
                toUser = author.name;
                logger.info("tip from comment to user " + toUser + " amount " + amount);
            }
            if (currency.toLowerCase() != "one"){
                item.reply("Tip bot only support ONE currently !!!");
                await saveLog(
                    item.author.name,
                    toUser,
                    amount,
                    item.id,
                    currency,
                    "tip"
                );
                return;
            }
            const sendUser = await findUser(item.author.name);
            if (sendUser) {
                const txnHash = await tip(sendUser, toUser, amount);
                if (txnHash) {
                    const txLink = explorerLink + txnHash;
                    item.reply(TEXT.TIP_SUCCESS(amount, toUser, txLink));
                } else {
                    logger.error("tip failed");
                    item.reply(TEXT.TIP_FAILED);
                }
            } else {
                item.reply(TEXT.ACCOUNT_NOT_EXISTED(botConfig.name));
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
            item.reply(TEXT.INVALID_COMMAND(botConfig.name));
        }
    } else {
        item.reply(TEXT.INVALID_COMMAND(botConfig.name));
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
            const fromUser = await findUser(item.author.name.toLowerCase());
            if (currency.toLowerCase() != "one"){
                await client.composeMessage({
                    to: item.author.name,
                    subject: "Send result",
                    text:"Tip bot only support ONE currently !!"
                });
            } else {
                if (fromUser) {
                    const txnHash = await tip(fromUser, toUser, amount);
                    if (txnHash) {
                        const txLink = explorerLink + txnHash;
                        await client.composeMessage({
                            to: item.author.name,
                            subject: "Send result",
                            text: TEXT.TIP_SUCCESS(amount, toUser, txLink)
                        });
                    } else {
                        await client.composeMessage({
                            to: item.author.name,
                            subject: "Send result:",
                            text: TEXT.TIP_FAILED(botConfig.name)
                        });
                    }
                } else {
                    await client.composeMessage({
                        to: item.author.name,
                        subject: "Send result:",
                        text: TEXT.ACCOUNT_NOT_EXISTED(botConfig.name)
                    });
                }
            }
            await saveLog(
                item.author.name.toLowerCase(),
                toUser,
                amount,
                item.id,
                currency,
                "send"
            );
        } catch (error) {
            logger.error("process send request error " + JSON.stringify(error));
        }
    }
}

async function processInfoRequest(item) {
    const info = await getBalance(item.author.name.toLowerCase());
    if (info) {
        const text = TEXT.INFO_REPLY(info.oneAddress, info.ethAddress, info.balance);
        const subject = "Your account info:";
        sendMessage(item.author.name, subject, text);
    } else {
        const text = TEXT.ACCOUNT_NOT_EXISTED(botConfig.name);
        const subject = "Help message";
        sendMessage(item.author.name, subject, text);
    }
}

async function processPrivateRequest(item){
    const user = await findUser(item.author.name.toLowerCase());
    if (user) {
        const text = TEXT.PRIVATE_INFO(user.mnemonic);
        const subject = "Your private info:";
        sendMessage(item.author.name, subject, text);
    } else {
        const text = TEXT.ACCOUNT_NOT_EXISTED(botConfig.name);
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
        const user = await findUser(item.author.name.toLowerCase());
        const fromUserAddress = user.ethAddress;
        if (currency != "one"){
            await client.composeMessage({
                to: item.author.name,
                subject: "Widthdraw result",
                text:"Tip bot only support ONE currently !!"
            });
        } else {
            const txnHash = await transfer(fromUserAddress, addressTo, amount);
            const txLink = explorerLink + txnHash;
            await client.composeMessage({
                to: item.author.name,
                subject: "Widthdraw result",
                text: TEXT.WITHDRAW_SUCCESS(txLink)
            });
        }
        await saveLog(
            item.author.name.toLowerCase(),
            addressTo,
            amount,
            item.id,
            currency,
            "withdraw"
        );
    }
}

async function processCreateRequest(item) {
    const user = await findOrCreate(item.author.name.toLowerCase());
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
    if (item.author.name === botConfig.name)
        return;
    logger.info(
        "receive comment from " +
            item.author.name +
            " body " +
            item.body
    );        
    try {
        let splitCms = item.body
            .toLowerCase()
            .replace("\n", " ")
            .replace("\\", " ")
            .split(" ");
        logger.debug("split cms " + splitCms);
        if (splitCms[0] === botConfig.command){
            const log = await checkExistedInLog(item.id);
            if (log){
                logger.info("comment already processed");
            } else {
                const sendUserName = item.author.name.toLowerCase();
                let amount = splitCms[1];
                let toUserName = "";
                const sendUser = await findUser(sendUserName);
                if (sendUser){
                    const parentComment = client.getComment(item.parent_id);
                    toUserName = await parentComment.author.name;
                    toUserName = toUserName.toLowerCase();
                    if (splitCms.length > 2){
                        if (splitCms[2].match(regexUser)){
                            toUserName = splitCms[2].replace("/u/","").replace("u/","");
                        }
                    }
                    const txnHash = await tip(sendUser, toUserName, amount);
                    if (txnHash) {
                        const txLink = explorerLink + txnHash;
                        item.reply(TEXT.TIP_SUCCESS(amount, toUserName, txLink));
                    } else {
                        logger.error("tip failed");
                        item.reply(TEXT.TIP_FAILED(botConfig.name));
                    }
                } else {
                    item.reply(TEXT.ACCOUNT_NOT_EXISTED(botConfig.name));
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
    } catch (error){
        logger.error("process comment error " + JSON.stringify(error) + " " + error);
    }
    
}

try {
    addAllAccounts();

    const inbox = new InboxStream(client, {
        filter: "mentions" | "messages",
        limit: 10,
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
                        } else if (item.body.toLowerCase() === "private") {
                            processPrivateRequest(item);
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

