'use strict';

// ================================================================
//  db.js  —  Conexión a Firebird con pool de conexiones
//
//  Modo servidor  → define DB_HOST, DB_PORT, DB_DATABASE en .env
//  Modo embebido  → define solo DB_DATABASE en .env y deja
//                   DB_HOST vacío o sin definir
// ================================================================

const Firebird = require('node-firebird');
const path     = require('path');

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

// Tamaño del pool configurable; 5 conexiones es más que suficiente
// para un sistema de consulta de precios
const POOL_SIZE = parseInt(process.env.DB_POOL_SIZE) || 5;

const pool = Firebird.pool(POOL_SIZE, options);

/**
 * Ejecuta una query con parámetros y devuelve las filas como array.
 * Obtiene una conexión del pool y la devuelve al terminar.
 * @param {string} sql
 * @param {Array}  params
 * @returns {Promise<Array>}
 */
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.get((err, db) => {
      if (err) return reject(err);

      db.query(sql, params, (err, result) => {
        // Siempre devolver la conexión al pool, haya error o no
        db.detach();

        if (err) return reject(err);
        resolve(result || []);
      });
    });
  });
}

/**
 * Comprueba que la conexión a la BD funciona obteniendo y
 * devolviendo una conexión del pool.
 * @returns {Promise<void>}
 */
function testConnection() {
  return new Promise((resolve, reject) => {
    pool.get((err, db) => {
      if (err) return reject(err);
      db.detach();
      resolve();
    });
  });
}

module.exports = { query, testConnection };
