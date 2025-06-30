const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const router = express.Router();

const checkAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Нет токена' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Неверный токен' });
  }
};

// Пользователи
router.get('/users', checkAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id, username, role FROM users');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/users', checkAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const result = await pool.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING user_id, username, role',
      [username, hashedPassword, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.delete('/users/:id', checkAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM users WHERE user_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Автомобили
router.get('/vehicles', checkAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vehicles');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/vehicles', checkAdmin, async (req, res) => {
  const { license_plate, type, fuel_type, fuel_consumption, user_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO vehicles (license_plate, type, fuel_type, fuel_consumption, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [license_plate, type, fuel_type, fuel_consumption, user_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.put('/vehicles/:id', checkAdmin, async (req, res) => {
  const { id } = req.params;
  const { license_plate, type, fuel_type, fuel_consumption, user_id } = req.body;
  try {
    const result = await pool.query(
      'UPDATE vehicles SET license_plate = $1, type = $2, fuel_type = $3, fuel_consumption = $4, user_id = $5 WHERE vehicle_id = $6 RETURNING *',
      [license_plate, type, fuel_type, fuel_consumption, user_id, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Автомобиль не найден' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.delete('/vehicles/:id', checkAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM vehicles WHERE vehicle_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Автомобиль не найден' });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Маршруты
router.get('/routes', checkAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM routes');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/routes', checkAdmin, async (req, res) => {
  const { name, total_distance_km, fuel_cost, toll_cost, duration_minutes, vehicle_id, user_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO routes (name, total_distance_km, fuel_cost, toll_cost, duration_minutes, vehicle_id, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, total_distance_km, fuel_cost, toll_cost, duration_minutes, vehicle_id, user_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.delete('/routes/:id', checkAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM routes WHERE route_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Маршрут не найден' });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Дороги
router.get('/roads', checkAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roads');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/roads', checkAdmin, async (req, res) => {
  const { name, road_type, start_latitude, start_longitude, end_latitude, end_longitude, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO roads (name, road_type, start_latitude, start_longitude, end_latitude, end_longitude, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, road_type, start_latitude, start_longitude, end_latitude, end_longitude, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.delete('/roads/:id', checkAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM roads WHERE road_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Дорога не найдена' });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Пункты покупки виньеток
router.get('/vignette-purchase-points', async (req, res) => { // Без checkAdmin для общего доступа
  try {
    const result = await pool.query('SELECT * FROM vignette_purchase_points');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/vignette-purchase-points', checkAdmin, async (req, res) => {
  const { latitude, longitude, name, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO vignette_purchase_points (latitude, longitude, name, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [latitude, longitude, name, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.delete('/vignette-purchase-points/:id', checkAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM vignette_purchase_points WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Пункт покупки виньетки не найден' });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;