import pkg from "sequelize";
const { Sequelize, DataTypes } = pkg;

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite",
});

try {
  await sequelize.authenticate();
  console.log("Connection has been established successfully.");
} catch (error) {
  console.error("Unable to connect to the database:", error);
}

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUIDV4,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false
    },
    ethAddress: {
        type: DataTypes.STRING,
        allowNull: false
    },
    oneAddress: {
        type: DataTypes.STRING,
        allowNull: false
    },
    balance: {
        type: DataTypes.DOUBLE,
        defaultValue: 0.0
    }
})

await User.sync({ force: true });

const createUser = (username, ethAddress, oneAddress, balance) => {
  console.log('create user');
  User.create({username: username, ethAddress: ethAddress, oneAddress, balance: balance});
}

const findUser = async (username) => {
  const u = await User.findOne({ where: { username: username}});
  return u;
}

// module.exports = createUser;
export { createUser, findUser, User };