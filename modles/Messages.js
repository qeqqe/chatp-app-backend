const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    senderId: {
      type: String,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: String,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "video", "audio"],
      required: true,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ senderId: 1, receiverId: 1 });

module.exports = mongoose.model("Message", MessageSchema);
