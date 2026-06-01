import mysql from 'mysql2/promise';

// Creamos un "Pool" de conexiones para que la app sea rápida y no sature la base de datos
export const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    timezone: 'Z',
    ssl: {
        rejectUnauthorized: false
    }
});
