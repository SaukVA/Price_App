'use strict';

const express    = require('express');
const priceRepo  = require('../repositories/priceRepository');

const router = express.Router();

// GET /api/prices/:barcode
router.get('/:barcode', async (req, res) => {
  const { barcode } = req.params;

  try {
    const product = await priceRepo.getByBarcode(barcode);

    if (!product) {
      return res.status(404).json({
        error:   'Producto no encontrado',
        barcode,
      });
    }

    res.json(product);

  } catch (err) {
    console.error('  ❌  Error en consulta:', err.message);
    res.status(500).json({
      error:  'Error interno del servidor',
      detail: err.message,
    });
  }
});

module.exports = router;
