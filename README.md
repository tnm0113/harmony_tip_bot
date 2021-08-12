# Tip bot Guideline

## How to deploy
**Prerequisites: install nodejs [here](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-18-04)**
1. Clone code
`git clone https://github.com/tnm0113/harmony_tip_bot.git` (for pee bot, run another command to switch to pee branch `cd harmony_tip_bot && git checkout pee`)
2. Run `npm install` (if have some error, remove package-lock.json and run again)
3. Configure tipbot (next section), change file default.sample.json to default.json
4. Install screen package by `sudo apt install screen`
5. Run `screen -dm node index.js` to run bot in daemon mode in a detached screen
6. To attach screen to view log, run `screen -ls` to get screen name, and run `screen -dRR screename` to jump in, to detach screen, press Ctrl + A + D . Ctrl + C to terminate process.
7. Or just go to logs folder and run `tail -f logfilename` to read logs :)

**Important: Database is saved on file mainnet.db.sqlite for mainnet and testnet.db.sqlite for testnet. Remember to keep them safe**

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
