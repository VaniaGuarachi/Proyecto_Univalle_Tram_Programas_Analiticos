const { pool } = require('./src/lib/db');

async function diagnostic() {
  try {
    const [pagos]: any = await pool.query('SELECT id_pago, id_tramite, estado_pago FROM univalle_tramites.pagos WHERE estado_pago = "PENDIENTE"');
    console.log(`Total PENDIENTE in pagos table: ${pagos.length}`);
    
    for (const p of pagos) {
      const [tramite]: any = await pool.query('SELECT * FROM univalle_tramites.tramites WHERE id_tramite = ?', [p.id_tramite]);
      if (tramite.length === 0) {
        console.log(`ORPHAN PAGO FOUND: id_pago=${p.id_pago}, id_tramite=${p.id_tramite} (Tramite does not exist)`);
      } else {
        console.log(`VALID PAGO: id_pago=${p.id_pago}, id_tramite=${p.id_tramite}`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

diagnostic();
