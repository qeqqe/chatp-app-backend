const mongoose = require("mongoose");

const URI = "mongodb://127.0.0.1:27017/testChatApp";

const ConnectDB = async () => {
  await mongoose.connect(URI).then(() => {
    console.log(`Connected to the db`);
  });
};

module.exports = ConnectDB;
