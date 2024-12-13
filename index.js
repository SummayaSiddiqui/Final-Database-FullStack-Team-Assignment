const express = require("express");
const expressWs = require("express-ws");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcrypt");
const { request } = require("http");
const PORT = 3000;
//TODO: Replace with the URI pointing to your own MongoDB setup
const MONGO_URI = "mongodb://localhost:27017/Compulse";
const app = express();
const SALT_ROUNDS = 10;

expressWs(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(
  session({
    secret: "chat-app-secret",
    resave: false,
    saveUninitialized: true,
  })
);
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isAuthenticated || false;
  res.locals.username = req.session.username || null;
  res.locals.role = req.session.role || null;
  res.locals.userId = req.session.userId || null;
  next();
});

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ["user", "admin"],
  },
});
const Role = mongoose.model("Role", RoleSchema, "roles");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  joinDate: { type: Date, default: Date.now },
  banned: { type: Boolean, default: false },
  onlineStatus: { type: Boolean, default: false },
  about: { type: String, default: "I am A new User" },
});
const User = mongoose.model("User", UserSchema, "users");

const MessageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  sender: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", MessageSchema, "messages");

const USERS = [
  {
    username: "AdminUser",
    password: bcrypt.hashSync("admin123", SALT_ROUNDS),
    role: 0,
    banned: false,
    onlineStatus: false,
  },
  {
    username: "RegularUser",
    password: bcrypt.hashSync("user123", SALT_ROUNDS),
    role: 1,
    banned: false,
    onlineStatus: true,
  },
];

async function getAllMessages() {
  try {
    const messages = await Message.find().sort({ timestamp: 1 }).limit(100);
    return messages;
  } catch (error) {
    console.error("Error retrieving messages:", error);
    throw error;
  }
}

async function getMessagesBeforeLogin(userLoginTimestamp) {
  try {
    // Filter messages that were sent before the user's login time
    const messages = await Message.find({
      timestamp: { $lt: userLoginTimestamp },
    })
      .sort({ timestamp: 1 }) // Sort in descending order based on timestamp (most recent first)
      .limit(100); // Limit to the most recent 100 messages before login
    return messages;
  } catch (error) {
    console.error("Error retrieving messages before login:", error);
    throw error;
  }
}
async function getMessagesAfterLogin(userLoginTimestamp) {
  try {
    // Filter messages that were sent after the user's login time
    const messages = await Message.find({
      timestamp: { $gt: userLoginTimestamp },
    })
      .sort({ timestamp: 1 }) // Sort in ascending order based on timestamp (oldest first)
      .limit(100); // Limit to the most recent 100 messages after login
    return messages;
  } catch (error) {
    console.error("Error retrieving messages after login:", error);
    throw error;
  }
}

async function insertSampleData() {
  try {
    // roles
    let adminRole = await Role.findOne({ name: "admin" });
    let userRole = await Role.findOne({ name: "user" });

    if (!adminRole) {
      adminRole = await new Role({ name: "admin" }).save();
    }
    if (!userRole) {
      userRole = await new Role({ name: "user" }).save();
    }

    // users
    const adminUser = await User.findOne({ username: "AdminUser" });
    const regularUser = await User.findOne({ username: "RegularUser" });

    if (!adminUser) {
      await new User({
        username: "AdminUser",
        password: bcrypt.hashSync("admin123", SALT_ROUNDS),
        role: adminRole.name,
        banned: false,
        onlineStatus: false,
        about:
          "I am the administrator of this platform, managing users and content.",
      }).save();
    }

    if (!regularUser) {
      await new User({
        username: "RegularUser",
        password: bcrypt.hashSync("user123", SALT_ROUNDS),
        role: userRole.name,
        banned: false,
        onlineStatus: false,
        about: "I am a regular user here to explore and connect with others.",
      }).save();
    }

    // messages
    const messageCount = await Message.countDocuments();
    if (messageCount === 0) {
      const MESSAGES = [
        {
          content: "Welcome to the chat, everyone!",
          sender: "AdminUser",
          timestamp: new Date(),
        },
        // {
        //   content: "Hi! Thanks for setting this up.",
        //   sender: "RegularUser",
        //   timestamp: new Date(),
        // },
        {
          content: "Let me know if you need help.",
          sender: "AdminUser",
          timestamp: new Date(),
        },
      ];

      await Message.insertMany(MESSAGES);
      console.log("Sample messages inserted");
    } else {
      console.log("Messages already exist; skipping sample message insertion.");
    }
  } catch (error) {
    console.error("Error inserting sample data:", error);
  }
}
insertSampleData();

let connectedClients = [];

app.ws("/ws", (socket, request) => {
  const username = request.session.username;
  const loginTime = new Date();
  connectedClients.push({ socket, username });

  sendRecentMessages(socket, loginTime);

  // Send the list of online users to the new client
  sendOnlineUsersList(socket, username);
  broadcastMessage(JSON.stringify({ type: "userJoined", username, users: connectedClients }), socket);

  socket.on("message", async (rawMessage) => {
    try {
      const parsedMessage = JSON.parse(rawMessage);
      parsedMessage.timestamp = new Date();

      const newMessage = new Message({
        content: parsedMessage.content,
        sender: parsedMessage.sender,
        timestamp: parsedMessage.timestamp,
      });
      await newMessage.save();
      broadcastMessage(JSON.stringify(parsedMessage), socket);
    } catch (error) {
      console.error("Error processing message:", error);
      socket.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format",
        })
      );
    }
  });

  socket.on("close", () => {
    connectedClients = connectedClients.filter(
      (client) => client.socket !== socket
    );
    const leaveMessage = JSON.stringify({ type: "userLeft", username, users: connectedClients});
    broadcastMessage(leaveMessage);
    updateOnlineUsersList();
  });

  socket.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

function broadcastMessage(message, excludeSocket = null) {
  connectedClients.forEach((client) => {
    if (client.socket !== excludeSocket && client.socket.readyState === 1) {
      try {
        client.socket.send(message);
      } catch (error) {
        console.error("Error sending message to client:", error);
      }
    }
  });
}

function sendOnlineUsersList(socket, newUsername) {
  // Ensure the new user is included in the list of online users
  const onlineUsers = connectedClients.map((client) => client.username);

  // Add the new user to the online users list if not already present
  if (newUsername && !onlineUsers.includes(newUsername)) {
    onlineUsers.push(newUsername);
  }

  try {
    // Send the online users list along with the new user
    socket.send(
      JSON.stringify({
        type: "onlineUsers",
        users: onlineUsers,
        newUser: newUsername,
      })
    );
  } catch (error) {
    console.error("Error sending online users list:", error);
  }
}

function updateOnlineUsersList() {
  const onlineUsers = connectedClients.map((client) => client.username);
  const updateMessage = JSON.stringify({
    type: "onlineUsers",
    users: onlineUsers,
  });
  broadcastMessage(updateMessage);
}

async function sendRecentMessages(socket, loginTime) {
  try {
    const recentMessages = await Message.find({
      timestamp: { $gte: loginTime },
    })
      .sort({ timestamp: 1 })
      .limit(50);
    socket.send(
      JSON.stringify({ type: "recentMessages", messages: recentMessages })
    );
  } catch (error) {
    console.error("Error sending recent messages:", error);
  }
}

app.get("/", async (request, response) => {
  const isAuthenticated = request.session.userId;
  if (!request.session.userId) {
    response.render("home");
  } else {
    try {
      const loggedInUsers = await User.find({ onlineStatus: true });
      response.render("home", { loggedInUsers, isAuthenticated });
    } catch (error) {
      console.error("Error fetching logged-in users:", error);
      response.status(500).send("Error fetching logged-in users");
    }
  }
});

app.get("/bannedUser", async (request, response) => {
  return response.render("bannedUser");
});

app.get("/signup", async (request, response) => {
  return response.render("signup", { errorMessage: null });
});

app.post("/signup", async (request, response) => {
  const { username, password } = request.body;

  try {
    //make sure no duplication
    const existingUser = await User.findOne({ username: username });

    if (existingUser) {
      return response.render("signup", {
        errorMessage: "Username already exists, choose another username.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = new User({
      username: username,
      password: hashedPassword,
      role: "user",
      onlineStatus: false,
    });
    await newUser.save();
    response.redirect("/login");
  } catch (error) {
    console.error("Error signing up user:", error);
    response.status(500).send("Server error");
  }
});

app.get("/membersProfiles", async (request, response) => {
  const isAuthenticated = request.session.userId;
  if (!isAuthenticated) {
    response.render("membersProfiles", { isAuthenticated });
  } else {
    try {
      const users = await User.find();
      response.render("membersProfiles", { isAuthenticated, users });
    } catch (error) {
      console.log(error);
    }
  }
});

app.get("/dashboard", async (request, response) => {
  let permission = null;
  if (!request.session.userId) {
    return response.render("adminDashboard", {
      isAuthenticated: false,
      message: "You need to log in or sign up to see admin dashboard.",
    });
  }
  // If user is authenticated and is an admin
  if (request.session.userId && request.session.role === "admin") {
    try {
      const users = await User.find(); // Get all users
      const message = request.query.message || null;
      const success = request.query.success || null;
      permission = true;

      console.log(success);

      return response.render("adminDashboard", {
        users,
        message,
        success,
        isAuthenticated: true,
        permission,
        username: request.session.username, // Send the username from session
      });
    } catch (error) {
      console.error("Error fetching users for admin dashboard:", error);
      return response
        .status(500)
        .send("Error fetching users for admin dashboard");
    }
  }

  if (request.session.userId && request.session.role !== "admin") {
    try {
      permission = false;

      return response.render("adminDashboard", {
        isAuthenticated: true,
        permission,
        username: request.session.username,
      });
    } catch (error) {
      console.error("Error fetching users for admin dashboard:", error);
      return response
        .status(500)
        .send("Error fetching users for admin dashboard");
    }
  }

  // If user is authenticated but not an admin
  return response.render("adminDashboard", {
    isAuthenticated: true,
    message: "You do not have the necessary permissions to view this page.",
  });
});

app.get("/profile/:username", async (request, response) => {
  const { userId, username, role } = request.session;
  if (!request.session.userId) {
    return response.render("profile", {
      isAuthenticated: false,
      message: "You need to log in or sign up to use live chat.",
    });
  }

  try {
    const user = await User.findById(request.session.userId);
    const param = request.params.username;
    const about = user.about;

    if (!user) {
      return response.render("profile", {
        isAuthenticated: false,
        message: "User not found. Please log in again.",
        username,
        role,
      });
    }
    response.render("profile", {
      isAuthenticated: true,
      username: user.username,
      joinDate: user.joinDate.toDateString(),
      param,
      role,
      about,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    response.status(500).send("An error occurred while fetching the profile.");
  }
  console.log(request.session);
});

app.post("/profile/:username", async (request, response) => {
  const { userId } = request.session;
  const { aboutMe } = request.body;
  const { username } = request.params;

  if (!userId) {
    return response.status(401).send("Unauthorized. Please log in.");
  }

  try {
    const user = await User.findById(userId);
    if (user && user.username === username) {
      const updatedUser = await User.findOneAndUpdate(
        { username },
        { about: aboutMe },
        { new: true }
      );
      if (updatedUser) {
        response.redirect(`/profile/${username}`);
      } else {
        return response.status(404).send("User not found.");
      }
    } else {
      return response.status(403).send("You can only update your own profile.");
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    return response.status(500).send("Internal server error.");
  }
});

app.get("/login", async (request, response) => {
  response.render("login");
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  try {
    // Find the user by username
    const user = await User.findOne({ username: username });

    // Check if user exists
    if (!user) {
      return response.render("login", {
        errorMessage: "Invalid username or password",
      });
    }

    // Compare the entered password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return response.render("login", {
        errorMessage: "Invalid username or password",
      });
    }

    // Set the user's online status and store user info in session
    user.onlineStatus = true;
    await user.save();

    request.session.userId = user._id; // Store user ID in the session
    request.session.username = user.username;
    request.session.role = user.role;
    request.session.loginTimestamp = Date.now(); // Store current timestamp
    request.session.banned = user.banned;
    if (user.banned) {
      response.redirect("/bannedUser");
    }
    else{
      // Redirect to the dashboard or home page
      if (user.role === "admin") {
        response.redirect("/dashboard");
      } else {
        response.redirect("/chat");
      }
    }
    console.log(request.session);
  } catch (error) {
    console.error("Error logging in user:", error);
    response.status(500).send("Server error");
  }
});

app.get("/chat", async (request, response) => {
  // Fetch all messages
  const messagesArray = await getAllMessages();
  const userLoginTimestamp = request.session.loginTimestamp;

  // Fetch messages before and after login
  const messagesBeforeLogin = await getMessagesBeforeLogin(userLoginTimestamp);
  const messagesAfterLogin = await getMessagesAfterLogin(userLoginTimestamp);

  // If the user is not logged in, show a message
  if (!request.session.userId) {
    return response.render("chat", {
      isAuthenticated: false,
      message: "You need to log in or sign up to use live chat.",
    });
  }

  // If the user is logged in, render chat with their username and messages
  response.render("chat", {
    isAuthenticated: true,
    username: request.session.username,
    messagesBeforeLogin,
    messagesAfterLogin,
    allMessages: messagesArray, // Pass all messages as well if needed
  });
});

app.post("/chat", async (request, response) => {});

app.get("/logout", (request, response) => {
  return response.render("logout");
});

app.post("/logout", (request, response) => {
  // Clear the user's session data
  request.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return response.status(500).send("Server error");
    }

    // Redirect the user to the homepage
    response.redirect("/");
  });
});

app.get("/ban/:username", (request, response) => {
  const username = request.params.username;
  return response.render("ban", { username });
});

app.post("/ban/:username", async (request, response) => {
  const username = request.params.username;

  try {
    // Locate user and update banned status
    const user = await User.findOneAndUpdate(
      { username },
      { banned: true },
      { new: true }
    );

    if (user) {
      return response.redirect(
        "/dashboard?message=" +
          encodeURIComponent(`${username} has been banned successfully`) +
          "&success=true"
      );
    } else {
      return response.redirect(
        "/dashboard?message=" +
          encodeURIComponent(`${username} not found`) +
          "&success=false"
      );
    }
  } catch (error) {
    console.error("Error banning user:", error);
    return response
      .status(500)
      .send("An error occurred while banning the user.");
  }
});

app.get("/unban/:username", (request, response) => {
  const username = request.params.username;
  return response.render("unban", { username });
});

app.post("/unban/:username", async (request, response) => {
  const username = request.params.username;

  try {
    // Locate user and update banned status
    const user = await User.findOneAndUpdate(
      { username },
      { banned: false },
      { new: true }
    );

    if (user) {
      return response.redirect(
        "/dashboard?message=" +
          encodeURIComponent(`${username} ban lifted successfully`) +
          "&success=true"
      );
    } else {
      return response.redirect(
        "/dashboard?message=" +
          encodeURIComponent(`${username} not found`) +
          "&success=false"
      );
    }
  } catch (error) {
    console.error("Error lifting user ban:", error);
    return response
      .status(500)
      .send("An error occurred while lifting the user ban.");
  }
});

app.get("/remove/:username", (request, response) => {
  const username = request.params.username;
  return response.render("remove", { username });
});

app.post("/remove/:username", async (request, response) => {
  const username = request.params.username;

  try {
    // Locate user to delete
    const user = await User.deleteOne({ username });
    if (user) {
      return response.redirect(
        "/dashboard?message=" +
          encodeURIComponent(`${username} has been removed successfully`) +
          "&success=true"
      );
    } else {
      return response.redirect(
        "/dashboard?message=" +
          encodeURIComponent(`${username} not found`) +
          "&success=false"
      );
    }
  } catch (error) {
    console.error("Error removing user:", error);
    return response
      .status(500)
      .send("An error occurred while removing the user.");
  }
});

mongoose
  .connect(MONGO_URI)
  .then(() =>
    app.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`)
    )
  )
  .catch((err) => console.error("MongoDB connection error:", err));

