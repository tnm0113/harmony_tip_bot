import { InboxStream, CommentStream } from "snoostorm";
import Snoowrap from "snoowrap";
import { createUser, findUser, saveLog, checkExistedInLog } from "./db.js";
import { logger } from "./logger.js";
import { COMMANDS } from "./const.js";
import tokens from "./tokens.json";
import config from "config";
import {
    transferOne,
    getAccountBalance,
    createAccount,
    addAllAccounts,
    transferToken
} from "./harmony.js";
import * as TEXT from "./text.js";

const regexSend = /send\s(.*)/g;
const regexWithdraw = /withdraw\s(.*)/g;
const regexUser = /\/?u\/(.)*/g;
const regexNumber = /^[0-9]*[.]?[0-9]{0,18}/g
const snoowrapConfig = config.get("snoowrap");
const botConfig = config.get("bot");
const tokenCommands = tokens.map((token) => {
    return token.command;
})

function getTokenWithCommand(tokenCommand){
    return tokens.filter((token) => token.command.toLowerCase() === tokenCommand.toLowerCase());
}

function getTokenWithName(tokenName){
    return tokens.filter((token) => token.name.toLowerCase() === tokenName.toLowerCase());
}

const explorerLink = botConfig.mainnet ? "https://beta.explorer.harmony.one/tx/" : "https://explorer.testnet.harmony.one/#/tx/";

const client = new Snoowrap(snoowrapConfig);
client.config({
    requestDelay: 0,
    continueAfterRatelimitError: true,
    maxRetryAttempts: 5,
    debug: botConfig.snoowrap_debug,
    logger: logger,
});

async function sendMessage(to, subject, text) {
    try {
        await client.composeMessage({ to: to, subject: subject, text: text });
    } catch (error) {
        logger.error("send message error " + JSON.stringify(error));
    }
}

async function tip(fromUser, toUserName, amount, token) {
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
        if (token.name === "one"){
            const hash = await transferOne(fromUserAddress, addressTo, amount);
            return hash;
        } else {
            const res = await transferToken(token.contract_address, amount, toUser.ethAddress, fromUserAddress, pkey);
            return res.txnHash;
        }
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
    try {
        await client.composeMessage({
            to: username,
            subject: "Tip Bot Help",
            text: TEXT.HELP_TEXT,
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
        .replace(/\n/g, " ")
        .replace("\\", " ")
        .split(/\s+/g);
    logger.debug("split cms " + splitCms);
    if (splitCms[0] === botConfig.command){
        // processComment(item);
        logger.debug("process in comment section");
        return;
    }
    if (splitCms.length > 3) {
        if (splitCms[1] === COMMANDS.TIP) {
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
            if (amount.match(regexNumber)){
                amount = parseFloat(amount);
            } else {
                item.reply(TEXT.INVALID_COMMAND(botConfig.name));
                return;
            }
            // if (currency.toLowerCase() != "one"){
            //     item.reply("Tip bot only support ONE currently !!!");
            //     return;
            // }
            const token = getTokenWithName(currency)[0] || null;
            if (token){
                const sendUserName = await item.author.name.toLowerCase();
                const sendUser = await findUser(sendUserName);
                if (sendUser) {
                    const txnHash = await tip(sendUser, toUser, amount, token);
                    if (txnHash) {
                        const txLink = explorerLink + txnHash;
                        item.reply(TEXT.TIP_SUCCESS(amount, toUser, txLink));
                    } else {
                        logger.error("tip failed");
                        item.reply(TEXT.TIP_FAILED(botConfig.name));
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
                    COMMANDS.TIP
                );
            } else {
                item.reply(TEXT.INVALID_COMMAND(botConfig.name));
            }
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
        .replace(/\n/g, " ")
        .replace("\\", " ")
        .split(/\s+/g);
    if (splitBody.length > 3) {
        try {
            const amount = splitBody[1];
            const currency = splitBody[2];
            const toUser = splitBody[3].match(regexUser) ? splitBody[3].replace("/u/","").replace("u/","") : splitBody[3];
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
                COMMANDS.SEND
            );
        } catch (error) {
            logger.error("process send request error " + JSON.stringify(error));
        }
    } else {
        await client.composeMessage({
            to: item.author.name,
            subject: "Widthdraw result",
            text: TEXT.INVALID_COMMAND(botConfig.name)
        });
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
        .replace(/\n/g, " ")
        .replace("\\", " ")
        .split(/\s+/g);
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
            const txnHash = await transferOne(fromUserAddress, addressTo, amount);
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
            COMMANDS.WITHDRAW
        );
    } else {
        await client.composeMessage({
            to: item.author.name,
            subject: "Widthdraw result",
            text: TEXT.INVALID_COMMAND(botConfig.name)
        });
    }
}

async function processCreateRequest(item) {
    const user = await findOrCreate(item.author.name.toLowerCase());
    if (user) {
        const subject = "Your account info:";
        sendMessage(item.author.name, subject, TEXT.CREATE_USER(user.oneAddress, user.ethAddress));
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
        let text = item.body
            .toLowerCase()
            .replace(/\n/g, " ")
            .replace("\\", " ");
        logger.debug("text " + text);
        let splitCms  = text.split(/\s+/g);
        logger.debug("split cms " + splitCms);
        const command = botConfig.command;
        if (splitCms.findIndex((e) => e === command) > -1 || splitCms.findIndex((e => tokenCommands.includes(e)) > -1)){
            // if (splitCms[0] === botConfig.command){
            const log = await checkExistedInLog(item.id);
            if (log){
                logger.info("comment already processed");
            } else {
                const index = splitCms.findIndex((e) => e === command);
                const indexTokenCommand = splitCms.findIndex((e => tokenCommands.includes(e)) > -1);
                const sliceCms = index > -1 ? splitCms.slice(index) : splitCms.slice(indexTokenCommand);
                const token = index > -1 ? getTokenWithCommand(command)[0] : getTokenWithCommand(splitCms[indexTokenCommand])[0];
                console.log("sliceCms ", sliceCms);
                if (sliceCms.length < 2){
                    logger.debug("comment not valid command");
                    item.reply(TEXT.INVALID_COMMAND(botConfig.name));
                    return;
                }
                const sendUserName = item.author.name.toLowerCase();
                let amount = sliceCms[1];
                if (amount.match(regexNumber)){
                    amount = parseFloat(amount);
                } else {
                    item.reply(TEXT.INVALID_COMMAND(botConfig.name));
                    return;
                }
                let toUserName = "";
                const sendUser = await findUser(sendUserName);
                if (sendUser){
                    const parentComment = client.getComment(item.parent_id);
                    toUserName = await parentComment.author.name;
                    toUserName = toUserName.toLowerCase();
                    if (sliceCms.length > 2){
                        if (sliceCms[2].match(regexUser)){
                            toUserName = sliceCms[2].replace("/u/","").replace("u/","");
                        }
                    }
                    const txnHash = await tip(sendUser, toUserName, amount, token);
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
                    COMMANDS.TIP
                );
            }
            // } else {
            //     logger.debug("comment not valid command");
            // }
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
                            item.body.toLowerCase() === COMMANDS.CREATE ||
                            item.body.toLowerCase() === COMMANDS.REGISTER
                        ) {
                            processCreateRequest(item);
                        } else if (item.body.toLowerCase() === COMMANDS.HELP) {
                            returnHelp(item.author.name);
                        } else if (item.body.toLowerCase().match(regexSend)) {
                            processSendRequest(item);
                        } else if (item.body.toLowerCase() === COMMANDS.INFO) {
                            processInfoRequest(item);
                        } else if (item.body.toLowerCase().match(regexWithdraw)) {
                            processWithdrawRequest(item);
                        } 
                        // else if (item.body.toLowerCase() === "recovery") {
                        //     processPrivateRequest(item);
                        // }
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

