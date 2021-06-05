import { InboxStream } from "snoostorm";
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

const botConfig = config.get("bot");
const client = new Snoowrap(botConfig);

const inbox = new InboxStream(client, {
    filter: "mentions" | "messages",
    limit: 0,
    pollTime: 2000,
});

async function sendMessage(to, subject, text) {
    await client.composeMessage({ to: to, subject: subject, text: text });
}

async function tip(fromUserName, toUserName, amount) {
    logger.info(
        "process tip request from " +
            fromUserName +
            " to " +
            toUserName +
            " amount " +
            amount +
            " ONE"
    );
    try {
        const fromUser = await findUser(fromUserName);
        const toUser = await findOrCreate(toUserName);
        const fromUserMn = fromUser.mnemonic;
        const addressTo = toUser.oneAddress;
        const fromUserAddress = fromUser.ethAddressq;
        const hash = await transfer(fromUserMn, addressTo, amount);
        removeAccount(fromUserAddress);
        return hash;
    } catch (error) {
        logger.error("catch error " + error);
        return null;
    }
}

async function getBalance(username) {
    try {
        const user = await findUser(username);
        if (user) {
            const b = await getAccountBalance(user.mnemonic);
            return {
                oneAddress: user.oneAddress,
                ethAddress: user.ethAddress,
                balance: b,
            };
        }
    } catch (error) {
        logger.error("get balance error " + error);
    }
}

async function findOrCreate(username) {
    try {
        const u = await findUser(username);
        if (u) {
            return u;
        } else {
            const blockchainInfo = await createAccount();
            return createUser(
                username,
                blockchainInfo.ethAddress,
                blockchainInfo.oneAddress,
                0,
                blockchainInfo.mnemonic
            );
        }
    } catch (error) {
        logger.error({ err: error }, "findOrCreate user error ");
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
        logger.error("return help error " + error);
    }
}

async function processComment(item) {
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
    if (splitCms.length > 3) {
        if (
            (splitCms[0] === "/u/tnm_tip_bot" ||
                splitCms[0] === "u/tnm_tip_bot") &&
            splitCms[1] === "tip"
        ) {
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
                logger.error("tip failed");
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
            logger.debug("other case");
            item.reply(
                "Invalid command, send Priavte Message with help in the body to me to get help, tks !"
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
        const amount = splitBody[1];
        const currency = splitBody[2];
        const toUser = splitBody[3];
        const fromUser = item.author.name;
        const txnHash = await tip(fromUser, toUser, amount);
        if (txnHash) {
            const txLink =
                "https://explorer.testnet.harmony.one/#/tx/" + txnHash;
            await client.composeMessage({
                to: fromUser,
                subject: "Send result",
                text:
                    "You have tipped successfully, here is the tx link for that transaction " +
                    txLink,
            });
        } else {
            await client.composeMessage({
                to: fromUser,
                subject: "Send result:",
                text: "Failed to tip, please check your comment, balance and try again",
            });
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

inbox.on("item", async function (item) {
    try {
        if (item.new) {
            const log = await checkExistedInLog(item.id);
            if (log) {
                logger.info("tip action already processed");
            } else {
                if (item.was_comment) {
                    processComment(item);
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
        logger.error("process item error " + error);
    }
});

inbox.on("end", () => logger.info("Inbox subcribe ended!!!"));
