# Manual Deployment Guide

This guide describes how to deploy the Transport Application manually without Docker.

## Prerequisites

- **Node.js**: Ensure Node.js (v18 or higher recommended) is installed.
- **PostgreSQL**: A running PostgreSQL instance.

## Database Setup

1.  **Create Database**:
    Create a new database in PostgreSQL (e.g., `transport_db`).

2.  **Schema Setup**:
    You can use the `server/db.js` file as a reference for connection, but you'll need to create the necessary tables.
    The application expects a `student` table.
    
    Example SQL to create the table:
    ```sql
    CREATE TABLE IF NOT EXISTS student (
        id SERIAL PRIMARY KEY,
        student_code VARCHAR(255) UNIQUE NOT NULL,
        branch_name VARCHAR(255),
        route_name VARCHAR(255),
        latitude DECIMAL,
        longitude DECIMAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ```

## Server Setup

1.  Navigate to the `server` directory:
    ```bash
    cd server
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Environment Variables:
    - Copy `.env.example` to `.env`:
      ```bash
      cp .env.example .env
      ```
    - Edit `.env` and set your database connection details:
      ```
      PORT=3000
      DATABASE_URL=postgres://user:password@localhost:5432/transport_db
      ```

4.  Start the Server:
    - For development:
      ```bash
      npm run dev
      ```
    - For production:
      ```bash
      npm start
      ```
    The server should be running on `http://localhost:3000` (or your configured port).

## Client Setup

1.  Navigate to the `client` directory:
    ```bash
    cd client
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Build for Production:
    ```bash
    npm run build
    ```
    This will create a `dist` folder containing the static files.

4.  Serve the Static Files:
    You can serve the `dist` folder using any static file server (e.g., `serve`, Nginx, Apache).
    
    Using `serve`:
    ```bash
    npm install -g serve
    serve -s dist
    ```

## Local Development (Simultaneous)

To run both client and server for development:

1.  **Terminal 1 (Server)**:
    ```bash
    cd server
    npm run dev
    ```

2.  **Terminal 2 (Client)**:
    ```bash
    cd client
    npm run dev
    ```
    The client will be available at `http://localhost:5173` (by default) and proxy API requests to the server.
