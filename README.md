# 🚀 TeachingAid-Backend

![Project Status](https://img.shields.io/badge/Status-Active-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![Express.js](https://img.shields.io/badge/Express.js-4.x-blue)
![Database](https://img.shields.io/badge/Database-MongoDB-orange)
![License](https://img.shields.io/badge/License-ISC-yellow)

**The Powerhouse Behind Your Interactive Polling Application.** ⚙️

This repository contains the backend server for the TeachingAid application. It is a robust, scalable, and secure API built with Node.js and Express, designed to handle user authentication, poll creation, real-time voting, and results broadcasting.

## 🎯 Table of Contents

-   [✨ Features](#-features)
-   [🛠️ Technologies Used](#%EF%B8%8F-technologies-used)
-   [📂 Project Structure](#-project-structure)
-   [🔧 API Endpoints](#-api-endpoints)
-   [🚀 Getting Started](#-getting-started)
    -   [Prerequisites](#prerequisites)
    -   [Installation](#installation)
    -   [Running the Server](#running-the-server)
-   [🔑 Environment Variables](#-environment-variables)
-   [📞 Contact](#-contact)
-   [🙏 Acknowledgements](#-acknowledgements)

## ✨ Features

-   **🔐 Secure User Authentication:** JWT-based authentication for poll creators, ensuring secure access to poll management features.
-   **📝 Full Poll Management:** Complete CRUD (Create, Read, Update, Delete) functionality for polls.
-   **⚡ Real-Time Voting & Results:** Utilizes WebSockets via **Socket.IO** to broadcast votes and poll results to the frontend instantly.
-   **🌐 RESTful API Design:** Follows REST principles for predictable and well-structured API endpoints.
-   **⚙️ Scalable Architecture:** Organized into controllers, models, routes, and middleware for maintainability and scalability.

## 🛠️ Technologies Used

This server is built with a modern and efficient technology stack:

-   **Runtime Environment:** **Node.js**
-   **Framework:** **Express.js**
-   **Database:** **MongoDB** with **Mongoose** as the ODM (Object Data Modeling) library.
-   **Real-time Communication:** **Socket.IO** for WebSocket-based, bidirectional communication.
-   **Authentication:** **JSON Web Tokens (JWT)** for securing routes (`jsonwebtoken`).
-   **Password Hashing:** **bcryptjs** for securely hashing and comparing user passwords.
-   **Middleware:** **CORS** for handling Cross-Origin Resource Sharing.
-   **Environment Variables:** **dotenv** for managing environment-specific configurations.
-   **Development Tools:** **Nodemon** for automatic server restarts during development.

## 📂 Project Structure

The project is organized following a standard MVC (Model-View-Controller) pattern for Node.js applications:
```text
polling-app-backend/
├── config/ # Database connection and other configurations
├── controllers/ # Logic for handling requests and sending responses
├── middleware/ # Custom middleware (e.g., authentication checks)
├── models/ # Mongoose schemas for database collections (User, Poll)
├── routes/ # API route definitions
├── utils/ # Utility functions
├── .env # Environment variables (needs to be created)
├── .gitignore # Files to be ignored by Git
├── package.json # Project dependencies and scripts
├── package-lock.json # Exact dependency tree
└── server.js # Main server entry point
```

## 🔧 API Endpoints

The API provides the following endpoints, organized by functionality.

### Authentication (`/api/auth`)

| Method | Endpoint         | Auth Required | Description                      |
| :----- | :--------------- | :------------ | :------------------------------- |
| `POST` | `/register`      | No            | Registers a new user (poll creator). |
| `POST` | `/login`         | No            | Logs in a user and returns a JWT.   |

### Poll Management (`/api/poll`)

| Method | Endpoint            | Auth Required | Description                                       |
| :----- | :------------------ | :------------ | :------------------------------------------------ |
| `POST` | `/create`           | **Yes**       | Creates a new poll for the authenticated user.    |
| `POST` | `/vote`             | No            | Submits a vote for a specific poll option.        |
| `POST` | `/relaunch`         | **Yes**       | Relaunches a poll (e.g., resets votes).           |
| `GET`  | `/mypolls`          | **Yes**       | Retrieves all polls created by the authenticated user. |
| `GET`  | `/:code`            | **Yes**            | Fetches a specific poll by its unique code.       |
| `GET`  | `/results/:code`    |  **Yes**            | Gets the real-time results for a specific poll.   |
| `PUT`  | `/:code/status`     |  **Yes**            | Updates the status of a poll (e.g., open, closed). |

## 🚀 Getting Started

Follow these instructions to get the backend server running on your local machine.

### Prerequisites

-   [Node.js](https://nodejs.org/en/) (v18.x or later recommended)
-   [MongoDB](https://www.mongodb.com/try/download/community) (running locally or a connection URI from a service like MongoDB Atlas)

### Installation

1.  **Clone the repository:**
    ```
    git clone https://github.com/19harshmehta/TeachingAid-Backend.git
    ```
2.  **Navigate to the project directory:**
    ```
    cd TeachingAid-Backend
    ```
3.  **Install dependencies:**
    ```
    npm install
    ```
4.  **Create an environment file:**
    Create a `.env` file in the root directory and add the necessary environment variables. See the [Environment Variables](#-environment-variables) section below for the required keys.

### Running the Server

-   **For development (with auto-reload):**
    ```
    nodemon server.js
    ```
-   **For production:**
    ```
    npm start
    ```

The server will start on the port specified in your `.env` file (e.g., `http://localhost:5000`).

## 🔑 Environment Variables

To run this project, you need to create a `.env` file in the root of your project folder and add the following configuration variables.
```text
Port for the server to run on
PORT=5000

MongoDB Connection URI
MONGO_URI=your_mongodb_connection_string

Secret key for signing JSON Web Tokens
JWT_SECRET=your_super_secret_jwt_key
```

## 📞 Contact

For any questions, feedback, or collaborations, feel free to reach out:

*   **Harsh Mehta** - mehtah631@gmail.com
*   **GitHub Profile:** [https://github.com/19harshmehta](https://github.com/19harshmehta)
*   **LinkedIn:** https://www.linkedin.com/in/harsh-mehta19/

## 🙏 Acknowledgements

*   Thanks to all open-source libraries and tools that made this project possible.
*   Special thanks to the online communities and resources that provide invaluable learning.
*   Thanks Prof Ankush For such an opportunity to work on such project 


