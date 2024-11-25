const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const app = express();
const server = http.createServer(app);
const jwt = require("jsonwebtoken");
const cors = require("cors");
const ConnectDB = require("./ConnectDB");
const Message = require("./modles/dummyMessage");
const User = require("./modles/User");
const bcrypt = require("bcrypt");
ConnectDB();
require("dotenv").config();
app.use(express.json());

app.use(cors());

const userSockets = new Map();

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new Error("User not found"));
    }

    socket.userId = user._id;
    socket.username = user.username;
    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
});

const PORT = 3001;
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.userId}`);

  userSockets.set(socket.userId.toString(), socket.id);

  socket.on("private-message", async (data) => {
    try {
      const { receiverId, content, type } = data;
      const senderId = socket.userId;

      const newMessage = new Message({
        senderId,
        receiverId,
        content: content.trim(),
        type,
        createdAt: new Date(),
      });

      await newMessage.save();

      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("new-message", newMessage);
      }

      socket.emit("message-sent", newMessage);
    } catch (error) {
      socket.emit("message-error", { error: "Failed to send message" });
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.userId}`);
    userSockets.delete(socket.userId.toString());
  });
});

app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/get-messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ _id: -1 });
    res.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ messages: [], error: error.message });
  }
});
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, error: "Token expired" });
    }
    return res.status(403).json({ success: false, error: "Invalid token" });
  }
};

app.post("/messages", authenticateToken, async (req, res) => {
  try {
    const { senderId, receiverId, content, type } = req.body;

    if (!senderId || !receiverId || !content || !type) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    if (senderId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized sender",
      });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        error: "Receiver not found",
      });
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      content: content.trim(),
      type,
      createdAt: new Date(),
    });

    await newMessage.save();

    io.to(receiverId).emit("new-message", newMessage);

    return res.status(201).json({
      success: true,
      data: newMessage,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while sending message",
    });
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

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "User already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
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

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Please enter all fields" });
  }
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ error: "User does not exist" });
  }
  try {
    if (!(await bcrypt.compare(password, user.password))) {
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
