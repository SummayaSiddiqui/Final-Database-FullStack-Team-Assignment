const webSocket = new WebSocket("ws://localhost:3000/ws");
const messagesDiv = document.getElementById("messages");

webSocket.addEventListener("open", (event) => {
  console.log("WebSocket connection established");
});

// Listen for messages
webSocket.addEventListener("message", (event) => {
  try {
    const data = JSON.parse(event.data);
    if (data.type === "userJoined") {
      onUserConnected(data.username);
    } else {
      displayMessage(data);
    }
  } catch (error) {
    console.error("Error parsing message:", error);
  }
});

// Connection closed
webSocket.addEventListener("close", (event) => {
  console.log("WebSocket connection closed");
});

// Connection error
webSocket.addEventListener("error", (event) => {
  console.error("WebSocket error:", event);
});

/**
 * Handles updating the chat user list when a new user connects
 *
 * This function isn't necessary and should be deleted if unused. But it's left as a hint to how you might want
 * to handle users connecting
 *
 * @param {string} username The username of the user who joined the chat
 */

function onUserConnected(username) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("system-message");
  messageElement.textContent = `User ${username} has joined the chat!`;
  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function displayMessage(message) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message");
  messageElement.textContent = `${message.sender}: ${message.content}`;
  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Handle form submission
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (message) {
    socket.send(
      JSON.stringify({ content: message, sender: "<%= username %>" })
    );
    messageInput.value = "";
  }
});

/**
 * Handles updating the chat list when a user disconnects from the chat
 *
 * This function isn't necessary and should be deleted if unused. But it's left as a hint to how you might want
 * to handle users disconnecting
 *
 * @param {string} username The username of the user who left the chat
 */
function onUserDisconnected(username) {}

/**
 * Handles updating the chat when a new message is receieved
 *
 * This function isn't necessary and should be deleted if unused. But it's left as a hint to how you might want
 * to handle new messages arriving
 *
 * @param {string} username The username of the user who sent the message
 * @param {string} timestamp When the message was sent
 * @param {string} message The message that was sent
 */
function onNewMessageReceived(username, timestamp, message) {}

/**
 * Handles sending a message to the server when the user sends a new message
 * @param {FormDataEvent} event The form submission event containing the message information
 */
function onMessageSent(event) {
  //Note: This code might not work, but it's left as a bit of a hint as to what you might want to do when handling
  //      new messages. It assumes that user's are sending messages using a <form> with a <button> clicked to
  //      do the submissions.
  event.preventDefault();
  const formData = new FormData(event.target, event.submitter);
  const inputs = event.target.querySelectorAll("input");
}

//Note: This code might not work, but it's left as a bit of a hint as to what you might want to do trying to setup
//      adding new messages
document
  .getElementById("chat-form")
  .addEventListener("submit", onMessageSent);
