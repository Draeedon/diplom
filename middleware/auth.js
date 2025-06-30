const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Нет токена' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user is a driver
    if (decoded.role === 'driver') {
      const driver = await pool.query('SELECT * FROM drivers WHERE driver_id = $1', [decoded.user_id]);
      if (driver.rows.length === 0) return res.status(401).json({ message: 'Водитель не найден' });
      req.user = {
        ...driver.rows[0],
        role: 'driver'
      };
    } else {
      // Regular user
      const user = await pool.query('SELECT * FROM users WHERE user_id = $1', [decoded.user_id]);
      if (user.rows.length === 0) return res.status(401).json({ message: 'Пользователь не найден' });
      req.user = user.rows[0];
    }
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Неверный токен' });
  }
};

module.exports = auth;