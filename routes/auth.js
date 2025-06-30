const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const router = express.Router();

// Middleware для проверки токена
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Нет токена' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Сохраняем данные из токена в req.user
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Неверный токен' });
  }
};

// Регистрация
router.post('/register', async (req, res) => {
  const { username, password, user_type, country, company_id, company_name } = req.body;

  try {
    // Проверка существования пользователя
    const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Пользователь уже существует' });
    }

    // Валидация для юридического лица
    if (user_type === 'legal') {
      if (!company_id || !company_name) {
        return res.status(400).json({ message: 'Для юридического лица обязательны идентификационный номер и название компании' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Вставка нового пользователя
    const newUser = await pool.query(
      'INSERT INTO users (username, password, role, user_type, country, company_id, company_name) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING user_id, username, role, user_type, country, company_id, company_name',
      [username, hashedPassword, 'user', user_type || 'individual', country || 'Belarus', company_id || null, company_name || null]
    );

    const token = jwt.sign(
      { 
        user_id: newUser.rows[0].user_id, 
        username: newUser.rows[0].username, 
        role: newUser.rows[0].role,
        user_type: newUser.rows[0].user_type,
        country: newUser.rows[0].country
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({ 
      token, 
      username: newUser.rows[0].username, 
      role: newUser.rows[0].role,
      user_type: newUser.rows[0].user_type,
      country: newUser.rows[0].country,
      company_id: newUser.rows[0].company_id,
      company_name: newUser.rows[0].company_name
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Логин
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Неверные данные' });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Неверные данные' });
    }

    const token = jwt.sign(
      { 
        user_id: user.rows[0].user_id, 
        username: user.rows[0].username, 
        role: user.rows[0].role,
        user_type: user.rows[0].user_type,
        country: user.rows[0].country
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ 
      token, 
      role: user.rows[0].role, 
      username: user.rows[0].username,
      user_type: user.rows[0].user_type,
      country: user.rows[0].country,
      company_id: user.rows[0].company_id,
      company_name: user.rows[0].company_name
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Новый маршрут для получения данных пользователя
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const user = await pool.query('SELECT username, role, user_type, country, company_id, company_name FROM users WHERE user_id = $1', [userId]);
    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.json(user.rows[0]); // Возвращаем все доступные данные пользователя
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка получения данных пользователя' });
  }
});

module.exports = router;