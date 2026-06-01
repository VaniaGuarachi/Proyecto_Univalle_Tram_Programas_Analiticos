const fs = require('fs');
const mysql = require('mysql2/promise');

// Manual dotenv parser
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[match[2].trim().startsWith('"') ? 2 : 2].replace(/["']/g, '');
});

async function main() {
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  console.log('--- Usuarios Schema ---');
  let [rows] = await connection.query('DESCRIBE Usuarios');
  console.log(rows);
  
  console.log('--- Usuarios Data Sample ---');
  [rows] = await connection.query('SELECT * FROM Usuarios LIMIT 1');
  console.log(rows);

  await connection.end();
}

main().catch(console.error);
