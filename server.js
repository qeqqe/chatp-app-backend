const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const app = express();
const server = http.createServer(app);

const cors = require("cors");
const ConnectDB = require("./ConnectDB");
const Message = require("./modles/dummyMessage");
ConnectDB();
require("dotenv").config();
app.use(express.json());

app.use(cors());

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const PORT = 3001;
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  socket.on("message", (message) => {
    console.log(`Message from ${socket.id}: ${message}`);
    io.emit("message", { text: message, senderId: socket.id });
    const newMessage = new Message({ message });
    newMessage.save();
    console.log(`saved: ${newMessage}`);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

app.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ _id: -1 });
    res.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ messages: [], error: error.message });
  }
});

app.post("/login", (res, req) => {});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
