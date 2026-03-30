'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const db      = require('./config/db');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS ──────────────────────────────────────────────────────
const corsOrigin = process.env.CORS_ORIGIN || '*';

app.use(cors({
  origin: corsOrigin,
  methods: ['GET'],
}));

// ── Middleware de logging ──────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration  = Date.now() - start;
    const timestamp = new Date().toISOString();
    const statusIcon = res.statusCode >= 500 ? '❌'
                     : res.statusCode >= 400 ? '⚠️ '
                     : '✅';

    console.log(`  ${statusIcon}  [${timestamp}]  ${req.method} ${req.originalUrl}  →  ${res.statusCode}  (${duration}ms)`);
  });

  next();
});

// ── Rutas ─────────────────────────────────────────────────────
app.use('/api/prices', require('./routes/pricesRoute'));

// ── Arranque ──────────────────────────────────────────────────
db.testConnection()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('  ✅  Price Server corriendo en http://localhost:' + PORT);
      console.log('  🗄️   BD conectada → ' + process.env.DB_DATABASE);
      console.log('  🌐  CORS origin    → ' + corsOrigin);
      console.log('');
      console.log('  GET /api/prices/:barcode');
      console.log('');
    });
  })
  .catch(err => {
    console.error('');
    console.error('  ❌  No se pudo conectar a la base de datos:');
    console.error('     ', err.message);
    console.error('');
    console.error('  Revisa DB_HOST, DB_PORT, DB_DATABASE, DB_USER y DB_PASSWORD en el fichero .env');
    console.error('');
    process.exit(1);
  });
