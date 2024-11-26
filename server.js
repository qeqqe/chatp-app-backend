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

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
};

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
      const { receiverId, content } = data;
      const senderId = socket.userId;

      const receiver = await User.findOne({ username: receiverId });
      if (!receiver) {
        socket.emit("message-error", { error: "Receiver not found" });
        return;
      }

      const now = new Date();
      const newMessage = new Message({
        senderId: senderId,
        receiverId: receiver._id,
        message: content.trim(),
        createdAt: now,
      });

      const savedMessage = await newMessage.save();

      // Ensure we have a valid date before formatting
      const messageTime =
        savedMessage.createdAt instanceof Date
          ? savedMessage.createdAt.toISOString()
          : now.toISOString();

      const messageFormat = {
        _id: savedMessage._id,
        sender: socket.username,
        receiver: receiver.username,
        message: savedMessage.message,
        time: messageTime,
        senderUsername: socket.username,
        receiverUsername: receiver.username,
      };

      const receiverSocketId = userSockets.get(receiver._id.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("new-message", messageFormat);
      }

      socket.emit("message-sent", messageFormat);
    } catch (error) {
      console.error("Message error:", error);
      socket.emit("message-error", { error: "Failed to send message" });
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.userId}`);
    userSockets.delete(socket.userId.toString());
  });
});

app.get("/users", authenticateToken, async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/get-messages/:receiverId", authenticateToken, async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiver = await User.findOne({ username: req.params.receiverId });
    if (!receiver) {
      return res.status(404).json({
        success: false,
        error: "Receiver not found",
      });
    }

    const messages = await Message.find({
      $or: [
        { senderId, receiverId: receiver._id },
        { senderId: receiver._id, receiverId: senderId },
      ],
    }).sort({ createdAt: 1 });

    const formattedMessages = messages.map((msg) => ({
      _id: msg._id,
      sender: msg.senderId.toString(),
      receiver: msg.receiverId.toString(),
      message: msg.message,
      time:
        msg.createdAt instanceof Date
          ? msg.createdAt.toISOString()
          : new Date(msg.createdAt).toISOString(),
      senderUsername:
        msg.senderId.toString() === senderId.toString()
          ? req.user.username
          : receiver.username,
      receiverUsername:
        msg.receiverId.toString() === senderId.toString()
          ? req.user.username
          : receiver.username,
    }));

    res.json({
      success: true,
      data: formattedMessages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

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
