import pkg from "sequelize";
import { logger } from "./logger.js";
import config from "config";

const botConfig = config.get("bot");

const storage = botConfig.mainnet ? "./mainnet.db.sqlite" : "./testnet.db.sqlite";

const { Sequelize, DataTypes } = pkg;

const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: storage,
    logging: msg => logger.debug(msg)
});

try {
    sequelize.authenticate();
    logger.info("Connection has been established successfully.");
} catch (error) {
    logger.error("Unable to connect to the database: " + error);
}

const User = sequelize.define("User", {
    id: {
        type: DataTypes.UUIDV4,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    ethAddress: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    oneAddress: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    mnemonic: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

User.sync({});

const TipLog = sequelize.define("TipLog", {
    id: {
        type: DataTypes.UUIDV4,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
    },
    fromUser: {
        type: DataTypes.STRING,
    },
    toUser: {
        type: DataTypes.STRING,
    },
    amount: {
        type: DataTypes.DOUBLE,
    },
    reddit_source: {
        type: DataTypes.STRING,
    },
    currency: {
        type: DataTypes.STRING,
    },
    action: {
        type: DataTypes.STRING,
    },
    result: {
        type: DataTypes.INTEGER, 
        defaultValue: 0
    }
});

TipLog.sync({});

const createUser = (username, ethAddress, oneAddress, mnemonic) => {
    logger.info(
        "create user " + username + " eth " + ethAddress + " one " + oneAddress
    );
    return User.create({
        username: username,
        ethAddress: ethAddress,
        oneAddress: oneAddress,
        mnemonic: mnemonic,
    })
        .then((u) => {
            return u;
        })
        .catch((e) => {
            logger.error("create user error " + JSON.stringify(e));
            throw e;
        });
};

const getAllUser = function () {
    return User.findAll();
};

const findUser = function (username) {
    // return User.findOne({ where: { username: username } })
    //     .then((rs) => {
    //         // console.log("find user rs ", rs);
    //         if (rs) return rs.dataValues;
    //         return rs;
    //     })
    //     .catch((e) => {
    //         logger.error("findUse error " + JSON.stringify(e));
    //         throw e;
    //     });
    const sql = `SELECT * from Users where username = '${username}'`;
    return sequelize.query(sql)
        .then(([results, metadata] ) => {
            console.log(results);
            if (results.length > 0)
                return results[0];
            else 
                return null;
        })
        .catch((e) => {
            throw e;
        })    
};

const saveLog = function (
    fromUser,
    toUser,
    amount,
    reddit_source,
    currency,
    action,
    result
) {
    logger.info("save log");
    return TipLog.create({
        fromUser: fromUser,
        toUser: toUser,
        amount: amount,
        reddit_source: reddit_source,
        currency: currency,
        action: action,
        result: result
    })
        .then((rs) => {
            return rs;
        })
        .catch((err) => {
            throw err;
        });
};

const checkExistedInLog = function (reddit_source) {
    // return TipLog.findOne({ where: { reddit_source: reddit_source } })
    //     .then((rs) => {
    //         if (rs) return rs.dataValues;
    //         return rs;
    //     })
    //     .catch((e) => {
    //         throw e;
    //     });
    const sql = `SELECT * from TipLogs where reddit_source = '${reddit_source}'`;
    return sequelize.query(sql)
        .then(([results, metadata] ) => {
            if (results.length > 0)
                return results[0];
            else 
                return null;
        })
        .catch((e) => {
            throw e;
        })
};

export { createUser, findUser, saveLog, checkExistedInLog, getAllUser };
