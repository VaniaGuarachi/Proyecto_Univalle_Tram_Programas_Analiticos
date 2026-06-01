import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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
        const [tables]: any = await pool.query('SHOW TABLES');
        console.log('--- TABLES ---');
        for (const row of tables) {
            const tableName = Object.values(row)[0] as string;
            console.log(`\nTable: ${tableName}`);
            const [columns]: any = await pool.query(`DESCRIBE ${tableName}`);
            for (const col of columns) {
                console.log(`  - ${col.Field} (${col.Type}) ${col.Key === 'PRI' ? '[PK]' : ''}`);
            }
        }
    } catch (err) {
        console.error('Error discovering schema:', err);
    } finally {
        await pool.end();
    }
}

discover();
