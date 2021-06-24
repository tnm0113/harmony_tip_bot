import Snoowrap from "snoowrap";
import config from "config";
import { logger } from "./logger.js";

const snoowrapConfig = config.get("snoowrap");

export function getRedditClient(){
    const client = new Snoowrap(snoowrapConfig);
    client.config({
        requestDelay: 0,
        continueAfterRatelimitError: true,
        maxRetryAttempts: 5,
        debug: true,
        logger: logger,
    });
    return client;
}

export async function sendMessage(to, subject, text) {
    try {
        const client = getRedditClient();
        await client.composeMessage({ to: to, subject: subject, text: text });
    } catch (error) {
        logger.error("send message error " + JSON.stringify(error));
    }
}