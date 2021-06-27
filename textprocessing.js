import { logger } from "./logger.js";
import { COMMANDS } from "./const.js";
import config from "config";
const botConfig = config.get("bot");

export const processText = (text) => {
    const splitText = text
                        .toLowerCase()
                        .replace("\n", " ")
                        .replace("\\", " ")
                        .split(" ");
    
    logger.debug("split text " + splitText);

    switch (splitText[0]){
        case botConfig.command:
            break;
        case COMMANDS.HELP:
            break;
        case COMMANDS.WITHDRAW:
            break;
        case COMMANDS.INFO:
            break;
        case COMMANDS.CREATE:
        case COMMANDS.REGISTER:
            break;
        case COMMANDS.RECOVERY:
            break;
        case COMMANDS.TIP:
            break;
        case COMMANDS.SEND:
            break;
        default:
            break;
    }
}

const processBotCommand = (splitText) => {
    
}

const processInfo = (splitText) => {
    
}