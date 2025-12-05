# Comprehensive Test Coverage & Methodology Report

## 1. Type of Testing Used

We have implemented a **Hybrid Testing Strategy** focusing on **Integration Testing** with **Unit-Level Isolation**.

### A. Integration Testing (API Layer)
* **What it is:** We test the application's external interface (HTTP Endpoints) rather than individual functions.
* **How we do it:** We use **Supertest** to simulate real HTTP requests (`GET`, `POST`, `PUT`, `DELETE`) sent to our Express application. This ensures that the **Router** correctly passes data to the **Controller**, and the Controller returns the correct **Response**.
* **Why:** This gives us confidence that the API actually works for the frontend.

### B. Unit Testing (with Mocks)
* **What it is:** We isolate the code being tested from external dependencies like the Database (MongoDB) and Authentication Middleware.
* **How we do it:** We use **Jest Mocks** (`jest.mock`) to fake the behavior of Mongoose Models (`User`, `Poll`, `Folder`).
    * *Example:* Instead of actually saving to a database, we tell the test: "Pretend the database saved successfully and returned this user."
* **Why:** This makes tests **extremely fast** and **deterministic** (they never fail due to network issues or dirty database states).

### C. Tools & Libraries
* **Jest:** The test runner and assertion library.
* **Supertest:** Used to make HTTP requests to the app.
* **Mocks:** Used for `bcryptjs` (hashing), `jsonwebtoken` (auth tokens), and `mongoose` (database).

---

## 2. Detailed Test Cases by Module

### Authentication Module (`tests/auth.test.js`)
**Objective:** Verify user onboarding and security controls.

| Endpoint | Test Scenario | Input Data | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **GET /health** | System Health Check | N/A | **200 OK**: Returns "Server is running". |
| **POST /register** | **Successful Registration** | New Name, Email, Password | **201 Created**: Returns success message; Mocks DB creation. |
| **POST /register** | **Duplicate Email** | Email that already exists in DB | **400 Bad Request**: Returns "User already exists". |
| **POST /login** | **Successful Login** | Valid Email & Password | **200 OK**: Returns valid **JWT Token**. |
| **POST /login** | **Invalid Password** | Valid Email, Wrong Password | **401 Unauthorized**: Returns "Invalid credentials". |
| **POST /login** | **User Not Found** | Unregistered Email | **404 Not Found**: Returns "User not found". |

---

### Poll Management Module (`tests/poll.test.js`)
**Objective:** Validate the lifecycle of a poll (Create -> Vote -> Close -> Delete).

| Endpoint | Test Scenario | Input Data | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **POST /create** | **Create New Poll** | Question, Options, Settings | **201 Created**: Returns unique Poll Code (e.g., "TEMPCODE"). |
| **POST /vote** | **Submit Valid Vote** | Poll Code, Option Index, Device Fingerprint | **200 OK**: Vote count increases; **Socket event** `vote_update` is emitted. |
| **POST /vote** | **Prevent Double Voting** | Same Fingerprint used twice | **403 Forbidden**: Returns "You have already voted". |
| **GET /:code** | **Fetch Poll Details** | Valid Poll Code | **200 OK**: Returns question, options, and status. |
| **GET /results/:code** | **Fetch Statistics** | Valid Poll Code | **200 OK**: Returns aggregated vote counts for charts. |
| **PUT /:code/status** | **Close/End Poll** | `isActive: false` | **200 OK**: Poll status updates; results saved to **History**. |
| **DELETE /:code** | **Delete by Owner** | Valid Code (Owner Request) | **204 No Content**: Poll deleted; Removed from all Folders. |
| **DELETE /:code** | **Unauthorized Delete** | Valid Code (Non-Owner Request) | **403 Forbidden**: Returns "Unauthorized". |

---

### Folder Organization Module (`tests/folder.test.js`)
**Objective:** Ensure users can group and manage their polls.
 
| Endpoint            | Test Scenario          | Input Data                  | Expected Outcome                                                  |
| :------------------ | :--------------------- | :-------------------------- | :---------------------------------------------------------------- |
| **POST /create**    | **Create Folder**      | Name, Description           | **201 Created**: Returns new Folder object.                       |
| **GET /**           | **List Folders**       | Authenticated User          | **200 OK**: Returns list of folders with **Populated** poll data. |
| **POST /.../:code** | **Add Poll to Folder** | Valid Folder ID & Poll Code | **200 OK**: Poll ID added to folder's array.                      |
| **POST /.../:code** | **Duplicate Poll**     | Poll already in Folder      | **400 Bad Request**: Returns "Poll already in folder".            |
| **GET /.../polls**  | **Get Folder Content** | Valid Folder ID             | **200 OK**: Returns specific polls inside that folder.            |

---

### Quiz Generator Module (`tests/quiz.test.js`)
**Objective:** Test the abstraction layer that creates multiple polls as a quiz.

| Endpoint | Test Scenario | Input Data | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **POST /create** | **Create Full Quiz** | Title, Array of Questions | **201 Created**: Generates unique **Quiz Code**; Creates multiple **Poll** entries in DB. |
| **POST /create** | **Validation Error** | Missing Title | **400 Bad Request**: Returns validation error message. |

---

## 3. Key Testing Highlights (Why this is good design)

1.  **Isolation:** We use `jest.mock('../middleware/authMiddleware')` to bypass real authentication. We manually inject a "Mock User" (`req.user = { id: ... }`). This allows us to test the *functionality* of the routes without needing a real logged-in user for every single test run.
2.  **Real-Time Simulation:** In `poll.test.js`, we mock the **Socket.io** instance (`mockIo.emit`). This verifies that our backend *attempts* to notify frontend clients about new votes, without needing a real WebSocket connection.
3.  **Data Integrity:** The "Delete Poll" test explicitly checks that when a poll is deleted, it is **also removed from any folders** (`Folder.updateMany`). This ensures our database doesn't end up with "orphan" references.