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
    const [stats_dash] = await pool.query("SELECT SUM(CASE WHEN estado_pago = 'PENDIENTE' THEN 1 ELSE 0 END) as p FROM univalle_tramites.pagos");
    console.log('DASHBOARD STYLE PENDIENTES:', stats_dash[0].p);

    const [stats_pagos] = await pool.query("SELECT SUM(CASE WHEN estado_pago = 'PENDIENTE' THEN 1 ELSE 0 END) as p, COUNT(*) as total FROM univalle_tramites.pagos p");
    console.log('PAGOS STYLE PENDIENTES:', stats_pagos[0].p);
    console.log('TOTAL PAGOS:', stats_pagos[0].total);

    const [rows] = await pool.query("SELECT * FROM univalle_tramites.pagos");
    console.log('RAW ROWS IN pagos:', rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
