# Tip bot Guideline

## How to deploy
**Prerequisites: install nodejs [here](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-18-04)**
1. Clone code
`git clone https://github.com/tnm0113/harmony_tip_bot.git`
2. Run `npm install` (if have some error, remove package-lock.json and run again)
3. Configure tipbot (next section)
4. Run `node index.js`

## How to configure tipbot
**File config: config/default.json**
### Sample
```
{
  "snoowrap": {
    "clientId": "", //get at https://www.reddit.com/prefs/apps create a script app
    "clientSecret": "", //get at https://www.reddit.com/prefs/apps create a script app
    "password": "", //password of bot reddit account
    "username": "tnm_tip_bot", // bot reddit account
    "userAgent": "Tnm Bot 0.6" // can be anything
  },
  "bot": {
    "name": "tnm_tip_bot", // bot reddit account
    "subreddit": "TestPeeBot", //main subreddit where bot support command !one
    "command": "!one",
    "mainnet": true, 
    "wiki_link": "https://www.reddit.com/r/AltStreetBets/wiki/peeing_bot-hrc20_tipping"
  },
  "logger": {
    "dir": "log",
    "file": {
      "level": "debug",
      "maxSize": "5242880",
      "maxFiles": "5"
    },
    "console": {
      "level": "debug"
    }
  }
}
```
