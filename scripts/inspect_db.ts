import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function main() {
  const connection = await createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [rows] = await connection.query('DESCRIBE Usuarios');
  console.log(rows);
  
  const [roles] = await connection.query('SELECT * FROM Roles');
  console.log('Roles:', roles);

  await connection.end();
}

main().catch(console.error);
