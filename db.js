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
});

User.sync({});

const createUser = (username, ethAddress, oneAddress, balance) => {
  console.log("create user");
  return User.create({
    username: username,
    ethAddress: ethAddress,
    oneAddress,
    balance: balance,
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

export { createUser, findUser };
