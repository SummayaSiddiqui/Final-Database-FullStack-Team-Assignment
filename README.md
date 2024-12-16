# Real-Time Chat Application

## Objective
This project is a real-time chat application built as part of the "Final Sprint - Team Project" for Databases and Fullstack Development courses. It demonstrates the integration of **Express.js**, **MongoDB**, **EJS templates**, and **WebSockets** to build a feature-complete application. The application enables users to join chat rooms, send real-time messages, and maintain an active connection with a MongoDB backend.

This repository is templated from the instructor's base repository. You can find the original repository here:  
[Instructor's Base Repo](https://github.com/menglishca/combined-final-team-base)

---

## Project Due Date
**December 15th, 2024, at 11:59 PM**

---

## Getting Started

Follow the steps below to set up the project locally.

### 1. Clone the Repository
Click on the **"Use this template"** button on the GitHub repository page to create your own repository from this template. Name your repository and set its visibility.

Then, clone your repository locally:
```bash
git clone <your-new-repo-url>
cd <your-new-repo-name>
```
### 2. Install Dependencies
Make sure you have **Node.js** and **npm** installed. Then, install the necessary dependencies by running:

```bash
npm install
```

### 3. Set Up the MongoDB database with the link "mongodb://localhost:27017/Compulse" and connect


### 4. Run the Application
Start the server by running:

```bash
npm start
The application should now be running at http://localhost:3000.
```
## User Roles & Login Information

The application supports three types of user roles. Here are the login credentials for each role:

1. **Admin**  
   - **Username**: admin@example.com  
   - **Password**: admin123  
   - **Features**: As an admin, you have access to all user messages, the ability to ban or remove users, view/edit your profile, and view other users profiles.

2. **Regular User**  
   - **Username**: regular@example.com  
   - **Password**: regular123  
   - **Features**: As a regular user, you can send and receive messages in chat rooms, view chat history, manage your user profile, and view other users profiles.

3. **Banned User**  
   - **Username**: banned@example.com  
   - **Password**: banned123  
   - **Features**: Banned users are restricted from whole site.

## Key Features
- **Real-time Messaging**: Built with WebSockets for instant communication between users.
- **User Authentication**: Secure login and signup system with role-based access.
- **MongoDB Integration**: Store chat messages, user data, and session history.
- **Responsive UI**: Built with EJS templates for dynamic content rendering.

## Technologies Used
- **Express.js** for server-side routing
- **MongoDB** for database management
- **EJS** for frontend templating
- **WebSockets** for real-time messaging

## License
This project is licensed under the MIT License.
