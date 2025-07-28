# Polling App Backend

## Overview
The Polling App Backend is a Node.js application that provides a RESTful API for creating and managing polls. It includes user authentication and allows users to create, retrieve, and delete polls.

## Features
- User authentication (login and registration)
- Create, retrieve, and delete polls
- Middleware for authentication checks
- Database connection configuration

## Folder Structure
```
polling-app-backend
├── controllers
│   ├── authController.js
│   └── pollController.js
├── models
│   ├── User.js
│   └── Poll.js
├── routes
│   ├── authRoutes.js
│   └── pollRoutes.js
├── utils
│   └── generateCode.js
├── middleware
│   └── authMiddleware.js
├── config
│   └── db.js
├── server.js
├── package.json
├── .env
└── README.md
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd polling-app-backend
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Create a `.env` file in the root directory and add your environment variables.

## Usage
To start the server, run:
```
node server.js
```
The server will start on the specified port in the `.env` file.

## API Endpoints
- **Authentication**
  - `POST /api/auth/register` - Register a new user
  - `POST /api/auth/login` - Login an existing user

- **Polls**
  - `POST /api/polls` - Create a new poll
  - `GET /api/polls` - Retrieve all polls
  - `DELETE /api/polls/:id` - Delete a poll by ID

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License
This project is licensed under the MIT License.