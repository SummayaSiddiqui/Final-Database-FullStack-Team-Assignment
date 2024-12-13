const webSocket = new WebSocket("ws://localhost:3000/ws");
const messagesDiv = document.getElementById("messages");
const onlineUsersDiv = document.getElementById("user-list"); // Assuming you have a div for online users

// WebSocket connection established
webSocket.addEventListener("open", () => {
  console.log("WebSocket connection established");
  displayNotification("Connected to chat server.");
  clearMessages();
});

// Listen for messages
webSocket.addEventListener("message", async (event) => {
  try {
    const data = await JSON.parse(event.data);

    switch (data.type) {
      case "userJoined":
        console.log(
          "userJoined Data.type switch statement, and this is the data:",
          data
        );
        onUserConnected(data.username);

        // Check if users array is valid before updating
        if (Array.isArray(data.users)) {
          const usernames = data.users.map((client) => client.username);
          console.log(usernames);
          updateOnlineUsers(usernames);
        } else {
          console.warn(
            "Missing or invalid users array in userJoined event:",
            data
          );
        }
        break;

      case "userLeft":
        console.log(
          "userLeft Data.type switch statement, and this is the data:",
          data
        );
        onUserDisconnected(data.username);

        // Check if users array is valid before updating
        if (Array.isArray(data.users)) {
          const usernames = data.users.map((client) => client.username);
          console.log(usernames);
          updateOnlineUsers(usernames);
        } else {
          console.warn(
            "Missing or invalid users array in userLeft event:",
            data
          );
        }
        break;

      case "message":
        console.log(
          "message Data.type switch statement, and this is the data:",
          data
        );
        displayMessage(data);
        break;

      case "onlineUsers":
        console.log(
          "onlineUsers Data.type switch statement, and this is the data:",
          data
        );

        // Validate the users array
        if (Array.isArray(data.users)) {
          updateOnlineUsers(data.users); // Handle the initial list of online users
        } else {
          console.error(
            "Invalid or missing users array in onlineUsers event:",
            data
          );
          updateOnlineUsers([]); // Clear the online users list if the data is invalid
        }
        break;

      case "recentMessages":
        console.log(
          "recentMessages Data.type switch statement, and this is the data:",
          data
        );
        clearMessages();
        data.messages.forEach(displayMessage);
        break;

      case "error":
        console.log(data);
        console.error(`Server error: ${data.message}`);
        displayNotification(`Error: ${data.message}`, true);
        break;

      default:
        console.warn(`Unknown message type: ${data.type}`);
    }
  } catch (error) {
    console.error("Error parsing message:", error);
    displayNotification("An error occurred while receiving data.", true);
  }
});
// Connection closed
webSocket.addEventListener("close", () => {
  console.log("WebSocket connection closed");
  displayNotification("Disconnected from chat server.", true);
});

// Connection error
webSocket.addEventListener("error", (event) => {
  console.error("WebSocket error:", event);
  displayNotification("A connection error occurred.", true);
});

// Handle user joining
function onUserConnected(username) {
  console.log(`User ${username} has joined the chat`);
  const messageElement = document.createElement("div");
  messageElement.classList.add("system-message");
  messageElement.innerHTML = `<strong>${username}</strong> has joined the chat!`;
  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Handle user leaving
function onUserDisconnected(username) {
  console.log(`User ${username} has left the chat`);
  const messageElement = document.createElement("div");
  messageElement.classList.add("system-message");
  messageElement.innerHTML = `<strong>${username}</strong> has left the chat.`;
  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Display a chat message
function displayMessage(message) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message");

  const dateObj = new Date(message.timestamp);
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  const time = dateObj.toLocaleTimeString();

  messageElement.innerHTML = `<strong>${message.sender} ${formattedDate} ${time}</strong><br>${message.content}`;

  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Update online users list
function updateOnlineUsers(users) {
  console.log("Updating online users with:", users);

  // Check if users is a valid array
  if (!Array.isArray(users) || users.length === 0) {
    onlineUsersDiv.textContent = "No users online.";
    console.log("No users currently online.");
    return;
  }

  // Remove duplicate users
  const uniqueUsers = [...new Set(users)];

  // Clear the current list
  onlineUsersDiv.innerHTML = "";

  // Populate the users list with unique entries
  uniqueUsers.forEach((user) => {
    const userElement = document.createElement("div");
    userElement.textContent = user;
    onlineUsersDiv.appendChild(userElement);
  });

  console.log(`Updated online users: ${uniqueUsers.join(", ")}`);
}
// Display notifications to the user
function displayNotification(message, isError = false) {
  console.log(message);
}

function clearMessages() {
  messagesDiv.innerHTML = "";
}

// Handle form submission
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const messageContent = messageInput.value.trim();

  if (messageContent) {
    const messageData = {
      type: "message",
      content: messageContent,
      sender: currentUsername,
      timestamp: new Date().toISOString(),
    };

    webSocket.send(JSON.stringify(messageData)); // Send to server
    displayMessage(messageData); // Display locally
    messageInput.value = ""; // Clear input field
  }
});
