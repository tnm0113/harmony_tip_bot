import { Sequelize, DataTypes } from "sequelize";

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
        defaultValue: Sequelize.UUIDV4
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

