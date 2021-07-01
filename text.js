import config from "config";
const botConfig = config.get("bot");

const linkPmReddit = (bot_name, subject, action) => {
    return `https://www.reddit.com/message/compose/?to=${bot_name}&subject=${subject}&message=${action}`;
}
      
//Account Created:    
const account_created = `Your account has been created. Address and balance are below.  
<addr & balance information>`  

export const ACCOUNT_CREATED = (info) => {
    return `Your account has been created. Address and balance are below.\n ${info}.${SIGNATURE(botConfig.name)}`
}
      
//Succssful Tip Reply:    
const tip_success = `Your tip was successful! Transaction ID below. <transactionID>`  
export const TIP_SUCCESS = (amount, receiveUser, txLink) => {
    return `Your tip of ${amount} ONE was successful to /u/${receiveUser}! Transaction ID [HERE](${txLink}).${SIGNATURE(botConfig.name)}`
}
      
//Failed Tip Reply:    
const tip_failed = `Your tip was unsuccessful. Please review your command and retry. Ensure you have a small amount of ONE for gas. For more information, send me the word INFO in private message by clicking HERE.
(make "HERE" a hyperlink to PM the bot)`
export const TIP_FAILED = (tip_bot_name) => {
    const link = linkPmReddit(tip_bot_name, "My Info", "info");
    return `Your tip was not successful. Please review your command and retry. ` + 
        `Ensure your balance covers the transaction and gas. For more information, send the word INFO in private message ` + 
        `by clicking [HERE](${link}).${SIGNATURE(botConfig.name)}`
}
      
//Info Reply:    
//(Current is good. Leave as-is)
export const INFO_REPLY = (one, eth, balance) => {
    return `One Address: ${one}` +
            `\n \n ` +
            `Eth Address: ${eth}` +
            `\n \n` +
            `Balance:  ${balance}` +
            ` ONE.${SIGNATURE(botConfig.name)}`;
}
      
//Withdraw Reply:    
const withdraw_reply = `Your withdraw was successful! Transaction ID below.`  
export const WITHDRAW_SUCCESS = (txlink) => {
    return `Your withdraw was successful! Transaction ID [HERE](${txlink}).${SIGNATURE(botConfig.name)}`
}

//Withdraw Failure:
export const WITHDRAW_FAILED = `Your withdraw was not successful. Please check your command and ensure the address is correct. Be sure you have enough funds and small amount for the transaction fee.`

export const ACCOUNT_NOT_EXISTED = (tip_bot_name) => {
    const linkPm = linkPmReddit(tip_bot_name, "Create Account", "create");
    return `Your account does not exist. Please send "CREATE" or "REGISTER" in private message to the tip bot by clicking [HERE](${linkPm}).${SIGNATURE(botConfig.name)}`;
}

export const INVALID_COMMAND = (tip_bot_name) => {
    const linkPm = linkPmReddit(tip_bot_name, "Get Help", "help");
    return `Invalid command, please send "HELP" in private message to the tip bot by clicking [HERE](${linkPm}).${SIGNATURE(botConfig.name)}`
}

export const PRIVATE_INFO = (mnemonic) => {
    return `Below is your wallet recovery phrase. Please keep it safe: \n\n ${mnemonic}.${SIGNATURE(botConfig.name)}`
}

export const SIGNATURE = (tip_bot_name) => {
    const base = "\n\n*****\n\n";
    const emojii = "♡ (っ◔◡◔)っ ♡";
    const get_started = ` | [Get Started](https://www.reddit.com/r/harmony_one/wiki/harmonytipbot)`;
    const show_balance = ` | [Show my balance](https://www.reddit.com/message/compose/?to=${tip_bot_name}&subject=My%20info&message=info)`
    const end = " | ♡";
    return base + emojii + get_started +  show_balance + end;
}

export const CREATE_USER = (oneAddress, ethAddress) => {
    return `One Address:  ${oneAddress}` +
            `\n \n` +
           `Eth Address:  ${ethAddress}.${SIGNATURE(botConfig.name)}`;
}