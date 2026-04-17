'use strict';

// ================================================================
//  db.js  —  Conexión a Firebird (servidor o embebido)
//
//  Modo servidor  → define DB_HOST, DB_PORT, DB_DATABASE en .env
//  Modo embebido  → define solo DB_DATABASE en .env y deja
//                   DB_HOST vacío o sin definir
// ================================================================

const Firebird = require('node-firebird');
const path = require('path');

const getDatabasePath = (dbPath) => {
  if (!dbPath) return null;
  // Conexión remota: la ruta es del servidor, se pasa tal cual
  if (process.env.DB_HOST) return dbPath;
  // Modo embebido: resuelve relativa al cwd del proceso
  return path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
};

const options = {
  host:     process.env.DB_HOST     || null,
  port:     parseInt(process.env.DB_PORT) || 3050,
  database: getDatabasePath(process.env.DB_DATABASE),
  user:     process.env.DB_USER     || 'SYSDBA',
  password: process.env.DB_PASSWORD || 'masterkey',
};

/**
 * Ejecuta una query con parámetros y devuelve las filas como array.
 * @param {string} sql
 * @param {Array}  params
 * @returns {Promise<Array>}
 */
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    Firebird.attach(options, (err, db) => {
      if (err) return reject(err);

      db.query(sql, params, (err, result) => {
        db.detach();
        if (err) return reject(err);
        resolve(result || []);
      });
    });
  });
}

/**
 * Comprueba que la conexión a la BD funciona.
 * Se usa en server.js antes de arrancar el servidor.
 * @returns {Promise<void>}
 */
function testConnection() {
  return new Promise((resolve, reject) => {
    Firebird.attach(options, (err, db) => {
      if (err) return reject(err);
      db.detach();
      resolve();
    });
  });
}

module.exports = { query, testConnection };
