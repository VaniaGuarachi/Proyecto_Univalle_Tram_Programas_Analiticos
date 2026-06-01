const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const [rows] = await pool.query("SELECT id_tramite, codigo_seguimiento FROM univalle_tramites.tramites");
    console.log('ALL TRAMITES IN DB:');
    rows.forEach(r => {
      console.log(`- ID: ${r.id_tramite}, CODIGO: '${r.codigo_seguimiento}' (len: ${r.codigo_seguimiento.length})`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
