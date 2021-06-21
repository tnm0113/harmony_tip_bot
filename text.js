const linkPmReddit = (bot_name, subject, action) => {
    return `https://www.reddit.com/message/compose/?to=${bot_name}&subject=${subject}&message=${action})`;
}

// No Account:    
export const NO_ACCOUNT = "Your account does not exist. Please reply with the word CREATE or REGISTER to have the tip bot create your ONE address."  
      
//Account Created:    
const account_created = `Your account has been created. Address and balance are below.  
<addr & balance information>`  

export const ACCOUNT_CREATED = (info) => {
    return `Your account has been created. Address and balance are below.\n ${info}`
}
      
//Succssful Tip Reply:    
const tip_success = `Your tip was successful! Transaction ID below. <transactionID>`  
export const TIP_SUCCESS = (amount, receiveUser, txLink) => {
    return `Your tip of ${amount} ONE was successful to /u/${receiveUser}! Transaction ID [HERE](${txLink})`
}
      
//Failed Tip Reply:    
const tip_failed = `Your tip was unsuccessful. Please review your command and retry. Ensure you have a small amount of ONE for gas. For more information, send me the word INFO in private message by clicking HERE.
(make "HERE" a hyperlink to PM the bot)`
export const TIP_FAILED = (tip_bot_name) => {
    const link = linkPmReddit(tip_bot_name, "My Info", "info");
    return `Your tip was not successful. Please review your command and retry. ` + 
        `Ensure your balane covers the transaction and gas. For more information, send the word INFO in private message ` + 
        `by clicking [HERE](${link}).`
}
      
//Info Reply:    
//(Current is good. Leave as-is)
export const INFO_REPLY = (one, eth, balance) => {
    return `One Address: ${one}` +
            `\n \n ` +
            `Eth Address: ${eth}` +
            `\n \n` +
            `Balance:  ${balance}` +
            ` ONE`;
}
      
//Withdraw Reply:    
const withdraw_reply = `Your withdraw was successful! Transaction ID below.`  
export const WITHDRAW_SUCCESS = (txlink) => {
    return `Your withdraw was successful! Transaction ID [HERE](${txlink}).`
}

//Withdraw Failure:
export const WITHDRAW_FAILED = `Your withdraw was not successful. Please check your command and ensure the address is correct. Be sure you have enough funds and small amount for the transaction fee.`

export const ACCOUNT_NOT_EXISTED = (tip_bot_name) => {
    const linkPm = linkPmReddit(tip_bot_name, "Create Account", "create");
    return `Your account does not exist. Please send "CREATE" or "REGISTER" in private message to the tip bot by clicking [HERE](${linkPm}).`;
}

export const INVALID_COMMAND = (tip_bot_name) => {
    const linkPm = linkPmReddit(tip_bot_name, "Get Help", "help");
    return `Invalid command, please send "HELP" in private message to the tip bot by clicking [HERE](${linkPm}).`
}

export const PRIVATE_INFO = (mnemonic) => {
    return `Here is your mnemonic, keep it safe \n\n ${mnemonic}`
}