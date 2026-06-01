const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [rows] = await connection.query('DESCRIBE Usuarios');
  console.log('--- Usuarios Schema ---');
  console.log(rows);
  
  const [roles] = await connection.query('SELECT * FROM Trabaja_en LIMIT 1');
  console.log('--- Trabaja_en (roles?) ---', roles);

  await connection.end();
}

main().catch(console.error);
