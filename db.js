import pkg from "sequelize";
import { logger } from "./logger.js";

const { Sequelize, DataTypes } = pkg;

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite",
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
  balance: {
    type: DataTypes.DOUBLE,
    defaultValue: 0.0,
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
});

TipLog.sync({});

const createUser = (username, ethAddress, oneAddress, balance, mnemonic) => {
  logger.info("create user " + username + " eth " + ethAddress + " one " + oneAddress);
  return User.create({
    username: username,
    ethAddress: ethAddress,
    oneAddress: oneAddress,
    balance: balance,
    mnemonic: mnemonic,
  })
    .then((u) => {
      return u;
    })
    .catch((e) => {
      logger.error("create user error " + e);
      throw e;
    });
};

const findUser = function (username) {
  return User.findOne({ where: { username: username } })
    .then((rs) => {
      // console.log("find user rs ", rs);
      if (rs) return rs.dataValues;
      return rs;
    })
    .catch((e) => {
      logger.error("findUse error " + e);
      throw e;
    });
};

const saveLog = function (
  fromUser,
  toUser,
  amount,
  reddit_source,
  currency,
  action
) {
  logger.info("save log");
  return TipLog.create({
    fromUser: fromUser,
    toUser: toUser,
    amount: amount,
    reddit_source: reddit_source,
    currency: currency,
    action: action,
  })
    .then((rs) => {
      return rs;
    })
    .catch((err) => {
      throw err;
    });
};

const checkExistedInLog = function (reddit_source) {
  return TipLog.findOne({ where: { reddit_source: reddit_source } })
    .then((rs) => {
      if (rs) return rs.dataValues;
      return rs;
    })
    .catch((e) => {
      throw e;
    });
};

export { createUser, findUser, saveLog, checkExistedInLog };
