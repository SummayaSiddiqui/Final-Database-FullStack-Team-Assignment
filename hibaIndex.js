const express = require("express");
const expressWs = require("express-ws");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcrypt");
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
  onlineStatus: { type: Boolean, default: false },
});
const User = mongoose.model("User", UserSchema, "users");

const MessageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  sender: { type: String, required: true }, // Store username instead of ObjectId
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", MessageSchema, "messages");

const USERS = [
  {
    username: "AdminUser",
    password: bcrypt.hashSync("admin123", SALT_ROUNDS),
    role: 0,
    onlineStatus: false,
  },
  {
    username: "RegularUser",
    password: bcrypt.hashSync("user123", SALT_ROUNDS),
    role: 1,
    onlineStatus: true,
  },
];

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
        onlineStatus: false,
      }).save();
    }

    if (!regularUser) {
      await new User({
        username: "RegularUser",
        password: bcrypt.hashSync("user123", SALT_ROUNDS),
        role: userRole.name,
        onlineStatus: true,
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
        {
          content: "Hi! Thanks for setting this up.",
          sender: "RegularUser",
          timestamp: new Date(),
        },
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
  socket.on("message", (rawMessage) => {
    const parsedMessage = JSON.parse(rawMessage);
  });

  socket.on("close", () => {});
});

app.get("/", async (request, response) => {
  try {
    const loggedInUsers = await User.find({ onlineStatus: true });
    response.render("home", { loggedInUsers });
  } catch (error) {
    console.error("Error fetching logged-in users:", error);
    response.status(500).send("Error fetching logged-in users");
  }
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

app.get("/dashboard", async (request, response) => {
  try {
    const users = await User.find();
    return response.render("adminDashboard", { users: users });
  } catch (error) {
    console.error("Error fetching users for admin dashboard:", error);
    response.status(500).send("Error fetching users for admin dashboard");
  }
});

app.get("/profile", async (request, response) => {
  return response.render("profile");
});

mongoose
  .connect(MONGO_URI)
  .then(() =>
    app.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`)
    )
  )
  .catch((err) => console.error("MongoDB connection error:", err));

/**
 * Handles a client disconnecting from the chat server
 *
 * This function isn't necessary and should be deleted if unused. But it's left as a hint to how you might want
 * to handle the disconnection of clients
 *
 * @param {string} username The username of the client who disconnected
 */
function onClientDisconnected(username) {}

/**
 * Handles a new client connecting to the chat server
 *
 * This function isn't necessary and should be deleted if unused. But it's left as a hint to how you might want
 * to handle the connection of clients
 *
 * @param {WebSocket} newSocket The socket the client has opened with the server
 * @param {string} username The username of the user who connected
 */
function onNewClientConnected(newSocket, username) {}

/**
 * Handles a new chat message being sent from a client
 *
 * This function isn't necessary and should be deleted if unused. But it's left as a hint to how you might want
 * to handle new messages
 *
 * @param {string} message The message being sent
 * @param {string} username The username of the user who sent the message
 * @param {strng} id The ID of the user who sent the message
 */
async function onNewMessage(message, username, id) {}
