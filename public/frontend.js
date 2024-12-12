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
webSocket.addEventListener("message", (event) => {
  try {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case "userJoined":
        onUserConnected(data.username);
        updateOnlineUsers(data.users); // Update online users if provided
        break;

      case "userLeft":
        onUserDisconnected(data.username);
        updateOnlineUsers(data.users); // Update online users if provided
        break;

      case "message":
        displayMessage(data);
        break;

      case "onlineUsers":
        updateOnlineUsers(data.users); // Handle the initial list of online users
        break;

      case "recentMessages":
        data.messages.forEach(displayMessage);
        break;

      case "error":
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

  const time = new Date(message.timestamp).toLocaleTimeString();
  messageElement.innerHTML = `<strong>${message.sender} (${time})</strong><br>${message.content}`;

  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Update online users list
function updateOnlineUsers(users) {
  onlineUsersDiv.innerHTML = ""; // Clear the current list

  if (users && users.length > 0) {
    users.forEach((user) => {
      const userElement = document.createElement("div");
      userElement.textContent = user;
      onlineUsersDiv.appendChild(userElement);
    });
    console.log(`Updated online users: ${users.join(", ")}`);
  } else {
    onlineUsersDiv.textContent = "No users online.";
    console.log("No users currently online.");
  }
}

// Display notifications to the user
function displayNotification(message, isError = false) {
  const notification = document.createElement("div");
  notification.classList.add(
    isError ? "error-notification" : "success-notification"
  );
  notification.textContent = message;

  document.body.appendChild(notification);

  // Remove notification after a few seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
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
