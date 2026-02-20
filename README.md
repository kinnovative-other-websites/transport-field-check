# Transport Field Check Application

A comprehensive full-stack application designed to track and manage student transportation data. It allows field staff to log student pickup/drop-off locations and provides administrators with a dashboard to visualize data and manage records.

## 🚀 Key Features

### 1. Student Location Logging (Public Interface)
-   **Mobile-First Design**: Optimized for handheld devices used by bus coordinators or drivers.
-   **Deep Linking**: specific URLs for branches and routes (e.g., `/:branch/:route`) allow quick access to relevant student lists.
-   **Real-time Logging**: Users can select students and log their current GPS location with a single tap.
-   **Live Updates**: Logged students are automatically removed from the "pending" list to prevent duplicates.

### 2. Admin Dashboard (Protected Interface)
-   **Authentication**: Secure login with Role-Based Access Control (Admin & Viewer roles).
-   **Data Visualization**:
    -   **Interactive Map**: Visualizes student locations with distinct markers and connected route lines.
    -   **Live Stats**: Real-time counters for Total Students, Logged (Boarded), and Pending.
-   **Data Management**:
    -   **Advanced Filtering**: Filter students by Branch, Route, Status (Logged/Pending), or Search by name/ID.
    -   **Pagination**: Optimized performance for large datasets.
    -   **Bulk Operations**:
        -   **CSV Upload**: Bulk import students with automatic creation of Branches and Routes.
        -   **Clear Locations**: Reset location data for new trips (All or Selected).
        -   **Delete Data**: Permanently remove old records.

### 3. Backend Architecture
-   **RESTful API**: Built with Node.js and Express.
-   **Database**: PostgreSQL with normalized schema (Students, Branches, Routes, Vehicles).
-   **Security**: JWT (JSON Web Tokens) for session management.
-   **Scalability**: Connection pooling and optimized SQL queries using `pg` node module.

## 🛠 Tech Stack

-   **Frontend**: React (Vite), React Router, Axios, CSS Modules.
-   **Backend**: Node.js, Express.js.
-   **Database**: PostgreSQL.
-   **Deployment**: Support for manual PM2 deployment (Ubuntu/Windows).

## 📂 Project Structure

-   `client/`: React frontend application.
    -   `src/pages/LogLocation.jsx`: Public logging interface.
    -   `src/pages/Dashboard.jsx`: Admin dashboard with map and tables.
-   `server/`: Node.js backend.
    -   `index.js`: Main API entry point.
    -   `db.js`: Database connection pool.
    -   `migrate.sql`: Database schema definitions.

## 🔧 Setup & Installation

1.  **Install Dependencies**:
    ```bash
    cd server && npm install
    cd ../client && npm install
    ```

2.  **Environment Variables**:
    Create `.env` in `server/` with:
    ```env
    PORT=3055
    DB_USER=postgres
    DB_HOST=localhost
    DB_NAME=transport_db
    DB_PASSWORD=yourpassword
    DB_PORT=5432
    JWT_SECRET=your_secret
    ADMIN_USER=admin
    ADMIN_PASS=admin123
    ```

3.  **Run Locally**:
    -   Server: `npm start` (in `server/`)
    -   Client: `npm run dev` (in `client/`)

## 📜 Recent Updates
-   **Database Normalization**: Separated Branches and Routes into distinct tables for better data integrity.
-   **Map Feature**: Added visual mapping of student coordinates.
-   **Security**: Implemented View-Only user role for auditors.
