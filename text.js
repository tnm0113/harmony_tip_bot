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
export const TIP_SUCCESS = (txLink) => {
    return `Your tip was successful! Transaction ID [here] (${txLink})`
}
      
//Failed Tip Reply:    
const tip_failed = `Your tip was not successful. Please review your command and retry. Ensure you have a small amount of ONE for gas. For more information, send me the word INFO in private message by clicking HERE.
(make "HERE" a hyperlink to PM the bot)`
export const TIP_FAILED = (tip_bot_name) => {
    const link = ""
    return `Your tip was not successful. Please review your command and retry.` + 
        `Ensure you have a small amount of ONE for gas. For more information, send me the word INFO in private message` + 
        `by clicking [HERE] (${link}).`
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
    return `Your withdraw was successful! Transaction ID [here] (${txLink}).`
}

//Withdraw Failure:
export const WITHDRAW_FAILED = `Your withdraw was not successful. Please check your command and ensure the address is correct. Be sure you have enough funds and small amount for the transaction fee.`

export const ACCOUNT_NOT_EXISTED = (tip_bot_name) => {
    const linkPm = ""
    return `Your account doesnt exist, please send "CREATE" or "REGISTER" in private message or click [here] (${linkPm})`;
}