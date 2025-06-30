const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Получение списка всех дорог
router.get('/roads', authMiddleware, async (req, res) => {
  try {
    const roads = await pool.query('SELECT * FROM roads');
    res.json(roads.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка получения дорог' });
  }
});

module.exports = router;