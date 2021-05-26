import pkg from "sequelize";
const { Sequelize, DataTypes } = pkg;

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite",
});

try {
  sequelize.authenticate();
  console.log("Connection has been established successfully.");
} catch (error) {
  console.error("Unable to connect to the database:", error);
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
  console.log("create user");
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
      console.log("create user error ", e);
      throw e;
    });
};

const findUser = function (username) {
  return User.findOne({ where: { username: username } })
    .then((rs) => {
      return rs;
    })
    .catch((e) => {
      console.log("findUse error ", e);
      throw e;
    });
};

const findOrCreateUser = function (
  username,
  ethAddress,
  oneAddress,
  balance,
  mnemonic
) {
  return User.findOrCreate({
    where: { username: username },
    username: username,
    ethAddress: ethAddress,
    oneAddress: oneAddress,
    balance: balance,
    mnemonic: mnemonic,
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
    .create((err) => {
      throw err;
    });
};

const checkExistedInLog = function (reddit_source) {
  return TipLog.findOne({ where: { reddit_source: reddit_source } })
    .then((rs) => {
      return rs;
    })
    .catch((e) => {
      throw e;
    });
};

export { createUser, findUser, saveLog, checkExistedInLog };
