const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true,
  },
});

const Messages = mongoose.model("Message", messageSchema);

module.exports = Messages;
