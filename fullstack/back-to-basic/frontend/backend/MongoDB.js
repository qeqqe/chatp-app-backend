const mongoose = require("mongoose");
const URI = "mongodb://localhost:27017/task";

const ConnectDB = async () => {
  await mongoose
    .connect(URI)
    .then(() => {
      console.log(`Connected to the db`);
    })
    .catch((err) => {
      console.log(`error: ${err}`);
    });
};

module.exports = ConnectDB;
