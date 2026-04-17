'use strict';

// ================================================================
//  priceRepository.js  —  Acceso a datos de precios / artículos
// ================================================================

const db = require('../config/db');

const SQL_GET_BY_BARCODE = `
  SELECT CAST(? AS VARCHAR(50)) AS barcode, a.NOMBRE AS name, a.PVP_IVA_1 AS price
  FROM ARTICULOS a
  LEFT JOIN ARTICULOS_CODBARRAS ac ON ac.ARTICULO = a.CODIGO
  WHERE ac.CODIGO_BARRA     LIKE ?
     OR ac.CODIGO_BARRA_AUX LIKE ?
     OR a.CODIGO2            LIKE ?
`;

/**
 * Busca un artículo por código de barras (principal o auxiliar).
 * @param {string} barcode
 * @returns {Promise<{barcode, name, price}|null>}
 */
async function getByBarcode(barcode) {
  const rows = await db.query(SQL_GET_BY_BARCODE, [barcode, barcode, barcode, barcode]);

  if (!rows || rows.length === 0) return null;

  const row = rows[0];
  return {
    barcode: row.BARCODE ?? row.barcode,
    name:    row.NAME    ?? row.name,
    price:   row.PRICE   ?? row.price,
  };
}

module.exports = { getByBarcode };
