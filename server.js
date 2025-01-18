const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const app = express();
const server = http.createServer(app);
const jwt = require("jsonwebtoken");
const cors = require("cors");
const ConnectDB = require("./ConnectDB");
const Message = require("./modles/dummyMessage");
const Users = require("./modles/User");
const bcrypt = require("bcrypt");
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

app.post("/register", async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        error: "Please enter all fields",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long",
      });
    }

    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "User already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new Users({
      email: email.toLowerCase(),
      password: hashedPassword,
      username: username.trim(),
      createdAt: new Date(),
    });

    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET);

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: newUser._id,
          email: newUser.email,
          username: newUser.username,
        },
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error during registration",
    });
  }
});

app.post("/login", async (res, req) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Please enter all fields" });
  }
  const user = await Users.findOne({ email });
  if (!user) {
    return res.status(400).json({ error: "User does not exist" });
  }
  try {
    if (!bcrypt.compare(user.password, password)) {
      return res.status(400).json({ error: "Invalid password" });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
