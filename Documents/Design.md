# Commentary on Software Design Decisions

## 1. How the Design of the Software has been Improved

The core design improvement in this project is the transition from a monolithic script approach to a **Maintained, Modular, and Layered Architecture**.

* **Backend (Node.js/Express):** I implemented a **Layered Architecture (MVC-pattern)**. instead of writing all logic inside route handlers, I separated concerns into **Routes** (endpoints), **Controllers** (business logic), and **Models** (data access). This makes the code easier to read, test, and debug.
* **Frontend (React/TypeScript):** I utilized a **Component-Based Architecture**. The UI is broken down into small, reusable building blocks (like Buttons, Cards) and Feature components (like Dashboards), which makes the application scalable and easier to maintain.
* **Decoupling:** I introduced a **Service Layer** in the frontend to handle API calls and WebSocket connections, completely decoupling the UI code from the network logic.

---

## 2. Application of Design Principles

I have strictly adhered to standard Software Engineering principles to ensure code quality.

### A. Separation of Concerns (SoC)
**Definition:** Dividing a computer program into distinct sections such that each section addresses a separate concern.

* **Where it is applied (Backend):**
    * **Routes:** Define *where* the request goes.
        * *Path:* `teachingaid-backend/routes/pollRoutes.js`
    * **Controllers:** Define *what* happens when the request arrives.
        * *Path:* `teachingaid-backend/controllers/pollController.js`
    * **Models:** Define *how* the data looks.
        * *Path:* `teachingaid-backend/models/Poll.js`
* **Where it is applied (Frontend):**
    * **Logic vs. View:** I separated the WebSocket connection logic from the component rendering it.
        * *Path:* `teachingaid-frontend/src/services/socket.ts` (Handles connection)
        * *Path:* `teachingaid-frontend/src/components/professor/LivePollView.tsx` (Handles rendering)

### B. Single Responsibility Principle (SRP)
**Definition:** A module or class should have only one reason to change.

* **Authentication (Backend):**
    * The `authMiddleware` has only one job: verifying the JWT token. It does not handle business logic or database queries.
    * *Code Path:* `teachingaid-backend/middleware/authMiddleware.js`
* **UI Components (Frontend):**
    * The `ProtectedRoute` component has the single responsibility of checking if a user is allowed to view a page. It doesn't care about what that page contains.
    * *Code Path:* `teachingaid-frontend/src/components/ProtectedRoute.tsx`

### C. Don't Repeat Yourself (DRY)
**Definition:** Every piece of knowledge must have a single, unambiguous representation within a system.

* **Utilities (Backend):**
    * Instead of writing the random code generation logic in every controller that needs it (Quiz, Polls), I abstracted it into a utility function.
    * *Code Path:* `teachingaid-backend/utils/generateUniqueCode.js`
* **UI Library (Frontend):**
    * I used a shared `ui` folder for common elements like Buttons and Inputs. If I need to change the style of a button, I only change it in one file, and it updates everywhere.
    * *Code Path:* `teachingaid-frontend/src/components/ui/button.tsx`

---

## 3. Key Refactoring for Design Improvement

Refactoring was done to clean up "code smells" and improve the structural integrity of the project.

| Refactoring Task | Description & Location | Why it improved the design |
| :--- | :--- | :--- |
| **Extracting Auth Middleware** | **Moved logic from:** Controllers<br>**To:** `middleware/authMiddleware.js` | Previously, every protected route had to manually check for tokens. Now, the middleware handles this centrally, reducing code duplication and security risks. |
| **Centralizing API Services** | **Moved logic from:** React Components<br>**To:** `src/services/api.ts` | Hardcoded `fetch` calls inside components made them messy and hard to test. Refactoring this into a service layer makes the components clean and focused purely on UI. |
| **Database Configuration** | **Moved logic from:** `server.js`<br>**To:** `config/db.js` | separating the database connection logic makes the application startup script (`server.js`) cleaner and allows for easier database switching or mocking in the future. |
| **Custom Hooks Extraction** | **Moved logic from:** Dashboard Component<br>**To:** `src/hooks/use-mobile.tsx` | Logic detecting if a user is on mobile was cluttering the visual component. Extracting this to a hook adheres to SRP and makes the logic reusable. |