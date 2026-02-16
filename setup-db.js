require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function setup() {
    try {
        const client = await pool.connect();
        console.log('Successfully connected to the database.');

        // Check if table exists
        const res = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'students'
            );
        `);

        if (!res.rows[0].exists) {
            console.log('Table "students" does not exist. Creating it...');
            await client.query(`
                CREATE TABLE students (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    branch VARCHAR(100),
                    route VARCHAR(100),
                    latitude DECIMAL(10, 8),
                    longitude DECIMAL(11, 8),
                    stop_name VARCHAR(255),
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('Table "students" created successfully.');

            // Insert dummy data
            console.log('Inserting sample data...');
            await client.query(`
                INSERT INTO students (name, branch, route, latitude, longitude, stop_name) VALUES
                ('Alice Johnson', 'Branch A', 'Route 1', 17.4455, 78.3855, 'Hitech City'),
                ('Bob Smith', 'Branch B', 'Route 2', 17.4000, 78.4000, 'Banjara Hills'),
                ('Charlie Brown', 'Branch A', 'Route 1', 17.4200, 78.4200, 'Jubilee Hills')
            `);
            console.log('Sample data inserted.');
        } else {
            console.log('Table "students" already exists.');
        }

        client.release();
    } catch (err) {
        console.error('Database connection error:', err);
    } finally {
        await pool.end();
    }
}

setup();
