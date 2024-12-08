const express = require('express');
const expressWs = require('express-ws');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const PORT = 3000;
//TODO: Replace with the URI pointing to your own MongoDB setup
const MONGO_URI = 'mongodb://localhost:27017/keyin_test';
const app = express();
const SALT_ROUNDS = 10;

expressWs(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(session({
    secret: 'chat-app-secret',
    resave: false,
    saveUninitialized: true
}));

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ["user", "admin"],
  },
});
module.exports = mongoose.model("Role", RoleSchema);

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true }, 
  joinDate: { type: Date, default: Date.now },
  onlineStatus: { type: Boolean, default: false },
});
module.exports = mongoose.model("User", UserSchema);

const MessageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  timestamp: { type: Date, default: Date.now },
});
module.exports = mongoose.model("Message", MessageSchema);

const USERS = [
  {
    id: 1,
    username: "AdminUser",
    email: "admin@example.com",
    password: bcrypt.hashSync("admin123", SALT_ROUNDS), //In a database, you'd just store the hashes, but for
    // our purposes we'll hash these existing users when the
    // app loads
    role: "admin",
  },
  {
    id: 2,
    username: "RegularUser",
    email: "user@example.com",
    password: bcrypt.hashSync("user123", SALT_ROUNDS),
    role: "user", // Regular user
  },
];
let connectedClients = [];

//Note: These are (probably) not all the required routes, but are a decent starting point for the routes you'll probably need

app.ws('/ws', (socket, request) => {    
    socket.on('message', (rawMessage) => {
        const parsedMessage = JSON.parse(rawMessage);
        
    });

    socket.on('close', () => {
        
    });
});

app.get('/', async (request, response) => {
    response.render('home');
});

app.get("/chat", async (request, response) => {
  response.render("chat");
});

app.get('/login', async (request, response) => {
        response.render("login");

});

app.get('/signup', async (request, response) => {
    return response.render('signup', {errorMessage: null});
});

app.post('/signup', async (request, response) => {

});

app.get('/dashboard', async (request, response) => {

    return response.render("adminDashboard");
});

app.get('/profile', async (request, response) => {
        return response.render("profile");

    
});

app.get('/logout', (request, response) => {
         return response.render("logout");

});

mongoose.connect(MONGO_URI)
    .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
    .catch((err) => console.error('MongoDB connection error:', err));

/**
 * Handles a client disconnecting from the chat server
 * 
 * This function isn't necessary and should be deleted if unused. But it's left as a hint to how you might want 
 * to handle the disconnection of clients
 * 
 * @param {string} username The username of the client who disconnected
 */
function onClientDisconnected(username) {
   
}

/**
 * Handles a new client connecting to the chat server
 * 
 * This function isn't necessary and should be deleted if unused. But it's left as a hint to how you might want 
 * to handle the connection of clients
 * 
 * @param {WebSocket} newSocket The socket the client has opened with the server
 * @param {string} username The username of the user who connected
 */
function onNewClientConnected(newSocket, username) {
    
}

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
async function onNewMessage(message, username, id) {
    
}