import { InboxStream, CommentStream } from "snoostorm";
import Snoowrap from "snoowrap";
import { createUser, findUser, saveLog, checkExistedInLog } from "./db.js";
import { logger } from "./logger.js";
import config from "config";
import {
    transfer,
    getAccountBalance,
    createAccount,
    addAllAccounts,
    addNewAccount,
    faucetForNewUser
} from "./harmony.js";
import * as TEXT from "./text.js";

const regexSend = /send\s(.*)/g;
const regexWithdraw = /withdraw\s(.*)/g;
const regexUser = /\/?u\/(.)*/g;
const regexNumber = /^[0-9]*[.]?[0-9]{0,18}/g
const snoowrapConfig = config.get("snoowrap");
const botConfig = config.get("bot");
const itemExpireTime = botConfig.item_expire_time || 60;
const inbox_poll_time = botConfig.inbox_poll_time || 10000;
const comment_poll_time = botConfig.comment_poll_time || 5000;

const explorerLink = botConfig.mainnet ? "https://explorer.harmony.one/#/tx/" : "https://explorer.testnet.harmony.one/#/tx/";

const client = new Snoowrap(snoowrapConfig);
client.config({
    requestDelay: botConfig.request_delay || 0,
    // continueAfterRatelimitError: true,
    maxRetryAttempts: 5,
    debug: botConfig.snoowrap_debug,
    logger: logger,
});

async function sendMessage(to, subject, text) {
    try {
        subject = "[TipBot Message] " + subject;
        logger.debug("send message " + subject +  " to " + to);
        await client.composeMessage({ to: to, subject: subject, text: text });
    } catch (error) {
        logger.error("send message error " + error);
    }
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
        logger.error("catch error " + JSON.stringify(error) + error);
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
        logger.error("get balance error " + JSON.stringify(error) + error);
    }
}

async function findOrCreate(username) {
    try {
        const u = await findUser(username);
        if (u) {
            return u;
        } else {
            const blockchainInfo = createAccount();
            // addNewAccount(blockchainInfo.mnemonic);
            logger.debug("blockchainInfo " + JSON.stringify(blockchainInfo));
            return createUser(
                username,
                blockchainInfo.ethAddress,
                blockchainInfo.oneAddress,
                blockchainInfo.mnemonic
            );
        }
    } catch (error) {
        logger.error("findOrCreate user error " + JSON.stringify(error) + error);
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
        `- 'help' - Get this help message.`+
        `${TEXT.SIGNATURE(botConfig.name)}`;
    try {
        await sendMessage(username, "Tip Bot Help", helpText);
    } catch (error) {
        logger.error("return help error " + JSON.stringify(error) + error);
    }
}

async function processMention(item) {
    logger.info(
        "receive comment mention from " +
            item.author.name +
            " body " +
            item.body
    );
    if (item.author.name === botConfig.name)
        return;
    let c = client.getComment(item.parent_id);
    let splitCms = item.body
        .toLowerCase()
        .replace(/\n/g, " ")
        .replace("\\", " ")
        .split(/\s+/g);
    logger.debug("split cms " + splitCms);

    // if (item.body.toLowerCase() === "!faucet"){
    //     const rs = await processFaucetRequest(item);
    //     if (rs){
    //         item.reply(TEXT.FAUCET_SUCCESS);
    //     } else {
    //         item.reply(TEXT.FAUCET_ERROR);
    //     }
    //     return;
    // }
    if (splitCms.findIndex((e) => e === botConfig.command) > -1){
        logger.debug("process in comment section");
        return;
    }

    const indexSlice = splitCms.findIndex((e) => e.includes(botConfig.name));
    
    if (indexSlice > -1){
        const sliceCms = splitCms.slice(indexSlice);
        logger.debug("slicecms " + sliceCms);
        // const index = splitCms.findIndex((e) => e === 'tip');
        const commandAction = sliceCms[1];
        const parseNumber = parseInt(commandAction);
        if (sliceCms.length >= 3){
            if (commandAction === 'tip'){
                let amount = -1;
                let currency = "";
                let toUser = "";
                if (sliceCms[2].match(regexUser)){
                    if (sliceCms.length > 4){
                        toUser = sliceCms[2].replace("/u/","").replace("u/","");
                        amount = sliceCms[3];
                        currency = sliceCms[4];
                        logger.debug("send from comment to user " + toUser +  " amount " + amount);
                    } else {
                        item.reply(TEXT.TIP_FAILED(botConfig.name));
                    }
                } else {
                    amount = sliceCms[1];
                    currency = sliceCms[2];
                    const author = await c.author;
                    toUser = author.name;
                    logger.info("tip from comment to user " + toUser + " amount " + amount);
                }
                if (amount.match(regexNumber)){
                    amount = parseFloat(amount);
                    if (isNaN(amount)){
                        item.reply(TEXT.INVALID_COMMAND(botConfig.name));
                        return;    
                    }
                } else {
                    item.reply(TEXT.INVALID_COMMAND(botConfig.name));
                    return;
                }
                if (currency.toLowerCase() != "one"){
                    item.reply("Tip bot only support ONE currently !!!");
                    return;
                }
                const sendUserName = item.author.name.toLowerCase();
                const sendUser = await findUser(sendUserName);
                if (sendUser) {
                    const txnHash = await tip(sendUser, toUser, amount);
                    if (txnHash) {
                        const txLink = explorerLink + txnHash;
                        item.reply(TEXT.TIP_SUCCESS(amount, toUser, txLink));
                        await saveLog(
                            item.author.name,
                            toUser,
                            amount,
                            item.id,
                            currency,
                            "tip",
                            1
                        );
                    } else {
                        logger.error("tip failed");
                        await saveLog(
                            item.author.name,
                            toUser,
                            amount,
                            item.id,
                            currency,
                            "tip",
                            0
                        );
                        item.reply(TEXT.TIP_FAILED(botConfig.name));
                    }
                } else {
                    item.reply(TEXT.ACCOUNT_NOT_EXISTED(botConfig.name));
                }
            } else if (!isNaN(parseNumber)){
                let amount = parseInt(sliceCms[1]);
                let toUser = sliceCms[2].replace("/u/","").replace("u/","");
                const sendUserName = item.author.name.toLowerCase();
                const sendUser = await findUser(sendUserName);
                if (sendUser) {
                    const txnHash = await tip(sendUser, toUser, amount);
                    if (txnHash) {
                        const txLink = explorerLink + txnHash;
                        item.reply(TEXT.TIP_SUCCESS(amount, toUser, txLink));
                        await saveLog(
                            item.author.name,
                            toUser,
                            amount,
                            item.id,
                            'ONE',
                            "tip",
                            1
                        );
                    } else {
                        logger.error("tip failed");
                        item.reply(TEXT.TIP_FAILED(botConfig.name));
                        await saveLog(
                            item.author.name,
                            toUser,
                            amount,
                            item.id,
                            'ONE',
                            "tip",
                            0
                        );
                    }
                } else {
                    item.reply(TEXT.ACCOUNT_NOT_EXISTED(botConfig.name));
                }
            } else {
                item.reply(TEXT.INVALID_COMMAND(botConfig.name));
            }
        } else {
            logger.debug('comment not a command');
            item.reply(TEXT.INVALID_COMMAND(botConfig.name));
        }
    }  else {
        logger.debug("comment mention is not a command");
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
                await sendMessage(item.author.name, "Send result", "Tip bot only support ONE currently !!");
            } else {
                if (fromUser) {
                    const txnHash = await tip(fromUser, toUser, amount);
                    if (txnHash) {
                        const txLink = explorerLink + txnHash;
                        await sendMessage(item.author.name, "Send result", TEXT.TIP_SUCCESS(amount, toUser, txLink));
                        await saveLog(
                            item.author.name.toLowerCase(),
                            toUser,
                            amount,
                            item.id,
                            currency,
                            "send",
                            1
                        );
                    } else {
                        await sendMessage(item.author.name, "Send result", TEXT.TIP_FAILED(botConfig.name));
                        await saveLog(
                            item.author.name.toLowerCase(),
                            toUser,
                            amount,
                            item.id,
                            currency,
                            "send",
                            0
                        );
                    }
                } else {
                    await sendMessage(item.author.name, "Send result", TEXT.ACCOUNT_NOT_EXISTED(botConfig.name));
                    await saveLog(
                        item.author.name.toLowerCase(),
                        toUser,
                        amount,
                        item.id,
                        currency,
                        "send",
                        0
                    );
                }
            }
        } catch (error) {
            logger.error("process send request error " + JSON.stringify(error) + error);
        }
    }
}

async function processFaucetRequest(item){
    const username = item.author.name.toLowerCase();
    const user = await findUser(username);
    if (user){
        logger.debug('user ' + username + ' already have account');
        return -1;
    }
    const newUserInfo = createAccount();
    await createUser(
        username,
        newUserInfo.ethAddress,
        newUserInfo.oneAddress,
        newUserInfo.mnemonic
    );
    const rs = await faucetForNewUser(newUserInfo.oneAddress);
    if (rs){
        return 1
    }
    return 0;
}

async function processInfoRequest(item) {
    const info = await getBalance(item.author.name.toLowerCase());
    if (info) {
        const text = TEXT.INFO_REPLY(info.oneAddress, info.ethAddress, info.balance);
        const subject = "Your account info:";
        await sendMessage(item.author.name, subject, text);
    } else {
        const text = TEXT.ACCOUNT_NOT_EXISTED(botConfig.name);
        const subject = "Help message";
        await sendMessage(item.author.name, subject, text);
    }
}

async function processPrivateRequest(item){
    const user = await findUser(item.author.name.toLowerCase());
    if (user) {
        const text = TEXT.PRIVATE_INFO(user.mnemonic);
        const subject = "Your private info:";
        await sendMessage(item.author.name, subject, text);
    } else {
        const text = TEXT.ACCOUNT_NOT_EXISTED(botConfig.name);
        const subject = "Help message";
        await sendMessage(item.author.name, subject, text);
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
            await sendMessage(item.author.name, "Widthdraw result", "Tip bot only support ONE currently !!");
        } else {
            const txnHash = await transfer(fromUserAddress, addressTo, amount);
            if (txnHash){
                const txLink = explorerLink + txnHash;
                await sendMessage(item.author.name, "Widthdraw result", TEXT.WITHDRAW_SUCCESS(txLink));
                await saveLog(
                    item.author.name.toLowerCase(),
                    addressTo,
                    amount,
                    item.id,
                    currency,
                    "withdraw",
                    1
                );
            } else {
                await sendMessage(item.author.name, "Widthdraw result", TEXT.WITHDRAW_FAILED);
                await saveLog(
                    item.author.name.toLowerCase(),
                    addressTo,
                    amount,
                    item.id,
                    currency,
                    "withdraw",
                    0
                );
            }
        }
    }
}

async function processCreateRequest(item) {
    const user = await findOrCreate(item.author.name.toLowerCase());
    if (user) {
        const subject = "Your account info:";
        await sendMessage(item.author.name, subject, TEXT.CREATE_USER(user.oneAddress, user.ethAddress));
    }
}

async function processComment(item){
    if (item.author.name.toLowerCase() === botConfig.name.toLowerCase())
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
        if (splitCms.findIndex((e) => e === command) > -1){
            let allowProcess = false;
            if (Date.now()/1000 - item.created_utc < itemExpireTime){
                logger.debug("need to check log in db");
                const log = await checkExistedInLog(item.id);
                allowProcess = log === null;
            }
            if (allowProcess){
                let sliceCms = [];
                // const index = splitCms.findIndex((e) => e === command);
                if (splitCms[splitCms.length - 2] === command){
                    sliceCms = splitCms.slice(splitCms.length - 2);
                } else if (splitCms[splitCms.length - 3] === command){
                    sliceCms = splitCms.slice(splitCms.length - 3);
                } else if (splitCms[0] === command){
                    sliceCms = splitCms;
                } else {
                    logger.debug("comment not valid command");
                    // item.reply(TEXT.INVALID_COMMAND(botConfig.name));
                    return;
                }
                // sliceCms = splitCms.slice(index);
                logger.debug("sliceCms ", sliceCms);
                if (sliceCms.length < 2){
                    logger.debug("comment not valid command");
                    item.reply(TEXT.INVALID_COMMAND(botConfig.name));
                    return;
                }
                const sendUserName = item.author.name.toLowerCase();
                let amount = sliceCms[1];
                if (amount.match(regexNumber)){
                    amount = parseFloat(amount);
                    if (isNaN(amount)){
                        item.reply(TEXT.INVALID_COMMAND(botConfig.name));
                        return;    
                    }
                } else {
                    item.reply(TEXT.INVALID_COMMAND(botConfig.name));
                    return;
                }
                let toUserName = "";
                logger.debug("find user " + sendUserName);
                const sendUser = await findUser(sendUserName);
                if (sendUser){
                    logger.debug("get user sucess, start get parent comment author");
                    // const parentComment = client.getComment(item.parent_id);
                    toUserName = await client.getComment(item.parent_id).author.name;
                    logger.debug("get parent comment author name done");
                    // toUserName = await parentComment.author.name;
                    toUserName = toUserName.toLowerCase();
                    if (sliceCms.length > 2){
                        if (sliceCms[2].match(regexUser)){
                            toUserName = sliceCms[2].replace("/u/","").replace("u/","");
                        }
                    }
                    logger.debug("start tip");
                    const txnHash = await tip(sendUser, toUserName, amount);
                    if (txnHash) {
                        const txLink = explorerLink + txnHash;
                        item.reply(TEXT.TIP_SUCCESS(amount, toUserName, txLink));
                        await saveLog(
                            item.author.name,
                            toUserName,
                            amount,
                            item.id,
                            'ONE',
                            "tip",
                            1
                        );
                    } else {
                        logger.error("tip failed");
                        await saveLog(
                            item.author.name,
                            toUserName,
                            amount,
                            item.id,
                            'ONE',
                            "tip",
                            0
                        );
                        item.reply(TEXT.TIP_FAILED(botConfig.name));
                    }
                } else {
                    item.reply(TEXT.ACCOUNT_NOT_EXISTED(botConfig.name));
                }
            } else {
                logger.debug("comment item already process");
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
        limit: 50,
        pollTime: inbox_poll_time,
    });

    const comments = new CommentStream(client, {
        subreddit: botConfig.subreddit,
        limit: 30,
        pollTime: comment_poll_time,
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
                if (item.was_comment) {
                    let allowProcess = false;
                    if (Date.now()/1000 - item.created_utc < itemExpireTime){
                        logger.debug("need to check log in db");
                        const log = await checkExistedInLog(item.id);
                        allowProcess = log ? false : true;
                    } 
                    if (allowProcess)
                        processMention(item);
                    else
                        logger.debug("inbox item mention already processed");    
                } else {
                    logger.info("process private message from " + item.author.name + " body " + item.body);
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
                    } else if (item.body.toLowerCase() === "faucet") {
                        const result = await processFaucetRequest(item);
                        if (result === 1){
                            await sendMessage(item.author.name, "Faucet result", TEXT.FAUCET_SUCCESS());
                        } else if (result === -1){
                            await sendMessage(item.author.name, "Faucet result", `You already have account !${TEXT.SIGNATURE(botConfig.name)}`);
                        } else if (result === 0){
                            await sendMessage(item.author.name, "Faucet result", TEXT.FAUCET_ERROR());
                        }
                    }
                    // else if (item.body.toLowerCase() === "recovery") {
                    //     processPrivateRequest(item);
                    // }
                    await item.markAsRead();
                }
            }
        } catch (error) {
            logger.error("process item inbox error " + error);
        }
    });

    inbox.on("end", () => logger.info("Inbox subcribe ended!!!"));
} catch (error){
    logger.error("snoowrap error " + JSON.stringify(error) + error);
}

