import mysql from 'mysql2/promise';
import fs from 'fs';

async function discover() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const [tables] = await pool.query('SHOW TABLES');
        const schema = {};
        for (const row of tables) {
            const tableName = Object.values(row)[0];
            const [columns] = await pool.query(`DESCRIBE ${tableName}`);
            schema[tableName] = columns;
        }
        fs.writeFileSync('schema.json', JSON.stringify(schema, null, 2));
        console.log('Schema saved to schema.json');
    } catch (err) {
        console.error('Error discovering schema:', err);
    } finally {
        await pool.end();
    }
}

discover();
