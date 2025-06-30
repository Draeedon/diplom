const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const router = express.Router();

const validCountries = [
  'Belarus', 'Russia', 'Kazakhstan', 'Armenia', 'Kyrgyzstan', // ЕАЭС
  'Poland', 'Lithuania', 'Latvia', 'Estonia', 'Finland', 'Sweden', 'Norway', // Европа (Балтия и Скандинавия)
  'Germany', 'France', 'Italy', 'Spain', 'Portugal', 'Netherlands', 'Belgium', 'Austria', 'Switzerland', // Европа (Западная и Центральная)
  'Czech Republic', 'Slovakia', 'Hungary', 'Romania', 'Bulgaria', 'Greece', 'Serbia', 'Croatia', // Европа (Центральная и Южная)
  'Uzbekistan', 'Tajikistan', 'Turkmenistan', 'Afghanistan', 'Pakistan', 'India', 'China', 'Mongolia', // Азия (Центральная и Южная)
  'Japan', 'South Korea', 'Thailand', 'Vietnam', 'Malaysia', 'Indonesia', 'Philippines', // Азия (Восточная и Юго-Восточная)
  'Turkey', 'Georgia', 'Azerbaijan', 'Iran', // Ближний Восток и Кавказ
  'Ukraine', 'Moldova' // Восточная Европа
];

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

// Middleware для проверки юридического лица
const checkLegalUser = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const userQuery = await pool.query('SELECT user_type FROM users WHERE user_id = $1', [userId]);
    if (userQuery.rows.length === 0 || userQuery.rows[0].user_type !== 'legal') {
      return res.status(403).json({ message: 'Доступ только для юридических лиц' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Ошибка проверки пользователя' });
  }
};

// Добавление столбцов для дат в таблицу routes
const addDateColumns = async () => {
  try {
    // Проверяем существование столбцов
    const checkColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'routes' 
      AND column_name IN ('start_date', 'end_date')
    `);

    const existingColumns = checkColumns.rows.map(row => row.column_name);

    // Добавляем отсутствующие столбцы
    if (!existingColumns.includes('start_date')) {
      await pool.query('ALTER TABLE routes ADD COLUMN start_date DATE');
    }
    if (!existingColumns.includes('end_date')) {
      await pool.query('ALTER TABLE routes ADD COLUMN end_date DATE');
    }
  } catch (error) {
  }
};

// Вызываем функцию при запуске сервера
addDateColumns();

// Регистрация
router.post('/register', async (req, res) => {
  const { username, password, user_type, country, company_id, company_name } = req.body;

  try {
    // Проверка существования пользователя
    const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Пользователь уже существует' });
    }

    // Валидация страны
    if (!validCountries.includes(country)) {
      return res.status(400).json({ message: 'Недопустимая страна' });
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
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение данных пользователя
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const user = await pool.query('SELECT username, role, user_type, country, company_id, company_name FROM users WHERE user_id = $1', [userId]);
    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.json(user.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения данных пользователя' });
  }
});

// Создание водителя
router.post('/drivers', authenticateToken, checkLegalUser, async (req, res) => {
  const { vehicle_id, last_name, initials, birth_date, login, password } = req.body;
  const user_id = req.user.user_id;

  try {
    const vehicleQuery = await pool.query(
      'SELECT * FROM vehicles WHERE vehicle_id = $1 AND user_id = $2',
      [vehicle_id, user_id]
    );
    if (vehicleQuery.rows.length === 0) {
      return res.status(400).json({ message: 'Автомобиль не найден или не принадлежит вашей компании' });
    }

    const driverExists = await pool.query('SELECT * FROM drivers WHERE login = $1', [login]);
    if (driverExists.rows.length > 0) {
      return res.status(400).json({ message: 'Водитель с таким логином уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO drivers (user_id, vehicle_id, last_name, initials, birth_date, login, password, balance) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [user_id, vehicle_id, last_name, initials, birth_date, login, hashedPassword, 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение списка водителей компании
router.get('/drivers', authenticateToken, checkLegalUser, async (req, res) => {
  const user_id = req.user.user_id;

  try {
    const result = await pool.query(
      'SELECT d.*, v.license_plate FROM drivers d LEFT JOIN vehicles v ON d.vehicle_id = v.vehicle_id WHERE d.user_id = $1',
      [user_id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Пополнение баланса водителя
router.post('/drivers/:driver_id/deposit', authenticateToken, checkLegalUser, async (req, res) => {
  const { driver_id } = req.params;
  const { amount } = req.body;
  const user_id = req.user.user_id;

  if (amount <= 0) {
    return res.status(400).json({ message: 'Сумма должна быть больше 0' });
  }

  try {
    const driverQuery = await pool.query(
      'SELECT * FROM drivers WHERE driver_id = $1 AND user_id = $2',
      [driver_id, user_id]
    );
    if (driverQuery.rows.length === 0) {
      return res.status(400).json({ message: 'Водитель не найден или не принадлежит вашей компании' });
    }

    await pool.query(
      'UPDATE drivers SET balance = balance + $1 WHERE driver_id = $2',
      [amount, driver_id]
    );

    await pool.query(
      'INSERT INTO driver_transactions (driver_id, amount, transaction_type, description) VALUES ($1, $2, $3, $4)',
      [driver_id, amount, 'deposit', `Пополнение баланса на ${amount} от компании`]
    );

    res.status(200).json({ message: 'Баланс успешно пополнен' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение транзакций водителя
router.get('/drivers/:driver_id/transactions', authenticateToken, checkLegalUser, async (req, res) => {
  const { driver_id } = req.params;
  const user_id = req.user.user_id;

  try {
    const driverQuery = await pool.query(
      'SELECT * FROM drivers WHERE driver_id = $1 AND user_id = $2',
      [driver_id, user_id]
    );
    if (driverQuery.rows.length === 0) {
      return res.status(400).json({ message: 'Водитель не найден или не принадлежит вашей компании' });
    }

    const result = await pool.query(
      'SELECT * FROM driver_transactions WHERE driver_id = $1 ORDER BY created_at DESC',
      [driver_id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Логин водителя
router.post('/drivers/login', async (req, res) => {
  const { login, password } = req.body;

  try {
    const driver = await pool.query('SELECT * FROM drivers WHERE login = $1', [login]);
    if (driver.rows.length === 0) {
      return res.status(400).json({ message: 'Неверные данные' });
    }

    const validPassword = await bcrypt.compare(password, driver.rows[0].password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Неверные данные' });
    }

    const token = jwt.sign(
      { 
        user_id: driver.rows[0].driver_id, 
        username: driver.rows[0].login,
        role: 'driver',
        last_name: driver.rows[0].last_name,
        initials: driver.rows[0].initials
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ 
      token, 
      username: driver.rows[0].login,
      role: 'driver', 
      last_name: driver.rows[0].last_name,
      initials: driver.rows[0].initials
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение профиля водителя
router.get('/driver/profile', authenticateToken, async (req, res) => {
  try {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ message: 'Доступ только для водителей' });
  }

    const driverId = req.user.user_id;
    const driver = await pool.query(
      `SELECT d.*, v.license_plate 
       FROM drivers d 
       LEFT JOIN vehicles v ON d.vehicle_id = v.vehicle_id 
       WHERE d.driver_id = $1`,
      [driverId]
    );

    if (driver.rows.length === 0) {
      return res.status(404).json({ message: 'Водитель не найден' });
    }

    res.json(driver.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения профиля водителя' });
  }
});

// Списание средств с баланса водителя за платные дороги
router.post('/drivers/:driver_id/toll-payment', authenticateToken, async (req, res) => {
  const { driver_id } = req.params;
  const { amount, description, route_id } = req.body;

  if (req.user.role !== 'driver' || req.user.user_id !== parseInt(driver_id)) {
    return res.status(403).json({ message: 'Доступ только для данного водителя' });
  }

  if (amount <= 0) {
    return res.status(400).json({ message: 'Сумма должна быть больше 0' });
  }

  try {
    const driverQuery = await pool.query('SELECT balance FROM drivers WHERE driver_id = $1', [driver_id]);
    if (driverQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Водитель не найден' });
    }

    const driver = driverQuery.rows[0];
    if (driver.balance < amount) {
      return res.status(400).json({ message: 'Недостаточно средств на балансе' });
    }

    await pool.query(
      'UPDATE drivers SET balance = balance - $1 WHERE driver_id = $2',
      [amount, driver_id]
    );

    await pool.query(
      'INSERT INTO driver_transactions (driver_id, route_id, amount, transaction_type, description) VALUES ($1, $2, $3, $4, $5)',
      [driver_id, route_id, -amount, 'toll_payment', description]
    );

    res.status(200).json({ message: 'Оплата успешно произведена' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение списка маршрутов пользователя
router.get('/routes', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'driver') {
      // Получаем автомобиль водителя
      const driverResult = await pool.query(
        'SELECT vehicle_id FROM drivers WHERE driver_id = $1',
        [req.user.user_id]
      );

      if (driverResult.rows.length === 0) {
        return res.status(404).json({ message: 'Водитель не найден' });
      }

      const vehicleId = driverResult.rows[0].vehicle_id;

      // Получаем маршруты, связанные с этим автомобилем
      const routesResult = await pool.query(
        `SELECT r.*, 
                json_agg(
                  json_build_object(
                    'point_order', rp.point_order,
                    'latitude', rp.latitude,
                    'longitude', rp.longitude
                  ) ORDER BY rp.point_order
                ) as points
         FROM routes r
         LEFT JOIN route_points rp ON r.route_id = rp.route_id
         WHERE r.vehicle_id = $1
         GROUP BY r.route_id`,
        [vehicleId]
      );

      const routes = routesResult.rows.map(route => ({
        ...route,
        total_distance_km: parseFloat(route.total_distance_km) || 0,
        toll_cost: parseFloat(route.toll_cost) || 0,
        duration_minutes: parseInt(route.duration_minutes) || 0,
        vignette_period: route.vignette_period ? parseInt(route.vignette_period) : null,
      }));
      return res.json(routes);
    } else {
      const userId = req.user.user_id;
      
      // Получаем все автомобили пользователя
      const vehiclesResult = await pool.query(
        'SELECT vehicle_id FROM vehicles WHERE user_id = $1',
        [userId]
      );
      
      if (vehiclesResult.rows.length === 0) {
        return res.json([]); // Возвращаем пустой массив, если нет автомобилей
      }
      
      const vehicleIds = vehiclesResult.rows.map(v => v.vehicle_id);
      
      // Получаем маршруты для всех автомобилей пользователя
      const routesQuery = await pool.query(
        `SELECT r.*, 
                json_agg(
                  json_build_object(
                    'point_order', rp.point_order,
                    'latitude', rp.latitude,
                    'longitude', rp.longitude
                  ) ORDER BY rp.point_order
                ) as points
         FROM routes r
         LEFT JOIN route_points rp ON r.route_id = rp.route_id
         WHERE r.vehicle_id = ANY($1)
         GROUP BY r.route_id
         ORDER BY r.creation_date DESC`,
        [vehicleIds]
      );
      
      const routes = routesQuery.rows.map(route => ({
        ...route,
        total_distance_km: parseFloat(route.total_distance_km) || 0,
        toll_cost: parseFloat(route.toll_cost) || 0,
        duration_minutes: parseInt(route.duration_minutes) || 0,
        vignette_period: route.vignette_period ? parseInt(route.vignette_period) : null,
      }));
      
      return res.json(routes);
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Ошибка получения маршрутов',
      error: error.message 
    });
  }
});

// Создание маршрута
router.post('/routes', authenticateToken, async (req, res) => {
  const { 
    name, 
    vehicle_id, 
    total_distance_km, 
    toll_cost, 
    duration_minutes
  } = req.body;

  // Проверяем обязательные поля
  if (!name) {
    return res.status(400).json({ message: 'Необходимо указать название маршрута' });
  }

  if (!vehicle_id) {
    return res.status(400).json({ message: 'Необходимо выбрать автомобиль' });
  }

  try {
    let userId;
    if (req.user.role === 'driver') {
      const driverQuery = await pool.query(
        'SELECT user_id FROM drivers WHERE driver_id = $1',
        [req.user.user_id]
      );
      if (driverQuery.rows.length === 0) {
        return res.status(404).json({ message: 'Водитель не найден' });
      }
      userId = driverQuery.rows[0].user_id;
    } else {
      userId = req.user.user_id;
    }

    // Проверяем, что vehicle_id принадлежит пользователю
    const vehicleQuery = await pool.query(
      'SELECT * FROM vehicles WHERE vehicle_id = $1 AND user_id = $2',
      [vehicle_id, userId]
    );
    if (vehicleQuery.rows.length === 0) {
      return res.status(400).json({ message: 'Автомобиль не найден или не принадлежит пользователю' });
    }

    // Серверная проверка для физ лиц из ЕАЭС с авто до 2.5 тонн
    const userQuery = await pool.query('SELECT user_type, country FROM users WHERE user_id = $1', [userId]);
    const user = userQuery.rows[0];
    const vehicle = vehicleQuery.rows[0];
    const eaesCountries = ['Belarus', 'Russia', 'Kazakhstan', 'Armenia', 'Kyrgyzstan'];
    if (
      user.user_type === 'individual' &&
      eaesCountries.includes(user.country) &&
      vehicle.tonnage !== null &&
      parseFloat(vehicle.tonnage) <= 2.5
    ) {
      req.body.toll_cost = 0;
      req.body.vignette_period = null;
    }

    // Вставляем маршрут с минимальным набором полей
    const routeQuery = await pool.query(
      `INSERT INTO routes (
        user_id, 
        vehicle_id, 
        name, 
        total_distance_km, 
        toll_cost, 
        duration_minutes,
        vignette_period,
        creation_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
      RETURNING *`,
      [
        userId, 
        vehicle_id, 
        name, 
        total_distance_km || 0, 
        req.body.toll_cost || 0, 
        duration_minutes || 0,
        req.body.vignette_period || null
      ]
    );

    // Принудительно возвращаем 0/null для этих полей в ответе
    let createdRoute = routeQuery.rows[0];
    if (
      user.user_type === 'individual' &&
      eaesCountries.includes(user.country) &&
      vehicle.tonnage !== null &&
      parseFloat(vehicle.tonnage) <= 2.5
    ) {
      createdRoute.toll_cost = 0;
      createdRoute.vignette_period = null;
    }
    res.status(201).json(createdRoute);
  } catch (error) {
    res.status(500).json({ 
      message: 'Ошибка создания маршрута',
      detail: error.detail || error.message
    });
  }
});

// Добавление точек маршрута
router.post('/routes/:routeId/points', authenticateToken, async (req, res) => {
  const { routeId } = req.params;
  const { points } = req.body;

  if (!Array.isArray(points) || points.length === 0) {
    return res.status(400).json({ message: 'Необходимо указать точки маршрута' });
  }

  // Проверяем, что все точки имеют необходимые координаты
  const invalidPoints = points.filter(point => 
    !point.latitude || !point.longitude || 
    isNaN(parseFloat(point.latitude)) || 
    isNaN(parseFloat(point.longitude))
  );

  if (invalidPoints.length > 0) {
    return res.status(400).json({ 
      message: 'Некоторые точки маршрута имеют некорректные координаты',
      invalidPoints 
    });
  }

  try {
    let userId;
    if (req.user.role === 'driver') {
      const driverQuery = await pool.query(
        'SELECT user_id FROM drivers WHERE driver_id = $1',
        [req.user.user_id]
      );
      if (driverQuery.rows.length === 0) {
        return res.status(404).json({ message: 'Водитель не найден' });
      }
      userId = driverQuery.rows[0].user_id;
    } else {
      userId = req.user.user_id;
    }

    // Проверяем существование маршрута и права доступа
    const routeQuery = await pool.query(
      'SELECT * FROM routes WHERE route_id = $1 AND user_id = $2',
      [routeId, userId]
    );

    if (routeQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Маршрут не найден или нет прав доступа' });
    }

    // Начинаем транзакцию
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Удаляем существующие точки маршрута
      await client.query('DELETE FROM route_points WHERE route_id = $1', [routeId]);

      // Добавляем новые точки
      for (const point of points) {
        const { point_order, latitude, longitude } = point;
        await client.query(
          `INSERT INTO route_points (
            route_id, 
            point_order, 
            latitude, 
            longitude
          ) VALUES ($1, $2, $3, $4)`,
          [
            routeId,
            point_order,
            parseFloat(latitude),
            parseFloat(longitude)
          ]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ message: 'Точки маршрута успешно добавлены' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Ошибка добавления точек маршрута',
      detail: error.detail || error.message
    });
  }
});

// Получение точек покупки виньеток
router.get('/vignette-purchase-points', async (req, res) => {
  try {
    const points = await pool.query('SELECT * FROM vignette_purchase_points');
    res.json(points.rows);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения пунктов покупки виньеток' });
  }
});

// Получение отчета по маршрутам за выбранную дату
router.get('/routes/report', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'Не указана дата' });
    }

    let userId;
    if (req.user.role === 'driver') {
      const driverQuery = await pool.query(
        'SELECT user_id FROM drivers WHERE driver_id = $1',
        [req.user.user_id]
      );
      if (driverQuery.rows.length === 0) {
        return res.status(404).json({ message: 'Водитель не найден' });
      }
      userId = driverQuery.rows[0].user_id;
    } else {
      userId = req.user.user_id;
    }

    const routesQuery = await pool.query(
      `SELECT r.*, 
              json_agg(
                json_build_object(
                  'point_order', rp.point_order,
                  'latitude', rp.latitude,
                  'longitude', rp.longitude
                ) ORDER BY rp.point_order
              ) as points
       FROM routes r
       LEFT JOIN route_points rp ON r.route_id = rp.route_id
       WHERE r.user_id = $1
       AND DATE(r.creation_date) = $2
       GROUP BY r.route_id`,
      [userId, date]
    );

    const routes = routesQuery.rows.map(route => ({
      ...route,
      total_distance_km: parseFloat(route.total_distance_km) || 0,
      toll_cost: parseFloat(route.toll_cost) || 0,
      duration_minutes: parseInt(route.duration_minutes) || 0,
      vignette_period: route.vignette_period ? parseInt(route.vignette_period) : null,
    }));

    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения отчета' });
  }
});

// Обновление периодов виньетки для существующих маршрутов
const updateVignettePeriods = async () => {
  try {
    // Получаем все маршруты физических лиц
    const routesQuery = await pool.query(`
      SELECT r.*, u.user_type 
      FROM routes r
      JOIN users u ON r.user_id = u.user_id
      WHERE u.user_type = 'individual'
      AND r.vignette_period IS NULL
    `);

    // Обновляем периоды виньетки
    for (const route of routesQuery.rows) {
      let vignettePeriod = null;
      if (route.start_date && route.end_date) {
        const start = new Date(route.start_date);
        const end = new Date(route.end_date);
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 9) vignettePeriod = 15;
        else if (diffDays <= 25) vignettePeriod = 30;
        else vignettePeriod = 365;

        await pool.query(
          'UPDATE routes SET vignette_period = $1 WHERE route_id = $2',
          [vignettePeriod, route.route_id]
        );
      }
    }
  } catch (error) {
  }
};

// Вызываем функцию при запуске сервера
updateVignettePeriods();

// Получить маршруты для водителя (универсальный путь)
router.get('/driver/routes', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Доступ только для водителей' });
    }

    const driverId = req.user.user_id;
    // Получаем vehicle_id водителя
    const driver = await pool.query(
      'SELECT vehicle_id FROM drivers WHERE driver_id = $1',
      [driverId]
    );

    if (driver.rows.length === 0) {
      return res.status(404).json({ message: 'Водитель не найден' });
    }

    const vehicleId = driver.rows[0].vehicle_id;

    // Получаем маршруты для этого автомобиля
    const routesResult = await pool.query(
      `SELECT * FROM routes WHERE vehicle_id = $1 ORDER BY creation_date DESC`,
      [vehicleId]
    );
    const routes = routesResult.rows;

    // Для каждого маршрута получаем точки
    for (const route of routes) {
      const pointsResult = await pool.query(
        'SELECT point_order, latitude, longitude FROM route_points WHERE route_id = $1 ORDER BY point_order',
        [route.route_id]
      );
      route.points = pointsResult.rows;
    }

    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения маршрутов водителя' });
  }
});

// Получение автомобиля водителя
router.get('/driver/vehicle', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Доступ только для водителей' });
    }

    const driverId = req.user.user_id;
    const vehicle = await pool.query(
      `SELECT v.* 
       FROM vehicles v 
       JOIN drivers d ON v.vehicle_id = d.vehicle_id 
       WHERE d.driver_id = $1`,
      [driverId]
    );

    if (vehicle.rows.length === 0) {
      return res.status(404).json({ message: 'Автомобиль не найден' });
    }

    res.json(vehicle.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения автомобиля водителя' });
  }
});

// Оплата маршрута водителем
router.post('/driver/routes/:routeId/pay', authenticateToken, async (req, res) => {
  const { routeId } = req.params;
  const driverId = req.user.user_id;

  try {
    // Получаем информацию о маршруте и балансе водителя
    const routeQuery = await pool.query(
      'SELECT * FROM routes WHERE route_id = $1',
      [routeId]
    );

    if (routeQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Маршрут не найден' });
    }

    const route = routeQuery.rows[0];

    // Проверяем, принадлежит ли маршрут водителю через vehicle_id
    const driverQuery = await pool.query(
      'SELECT d.*, v.vehicle_id FROM drivers d JOIN vehicles v ON d.vehicle_id = v.vehicle_id WHERE d.driver_id = $1',
      [driverId]
    );

    if (driverQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Водитель не найден' });
    }

    const driver = driverQuery.rows[0];

    // Проверяем, принадлежит ли маршрут автомобилю водителя
    if (route.vehicle_id !== driver.vehicle_id) {
      return res.status(403).json({ message: 'Этот маршрут не принадлежит вашему автомобилю' });
    }

    const driverBalance = parseFloat(driver.balance);
    const routeCost = parseFloat(route.toll_cost);

    if (driverBalance < routeCost) {
      return res.status(400).json({ 
        message: 'Недостаточно средств на балансе',
        required: routeCost,
        available: driverBalance
      });
    }

    // Начинаем транзакцию
    await pool.query('BEGIN');

    try {
      // Списываем средства с баланса водителя
      await pool.query(
        'UPDATE drivers SET balance = balance - $1 WHERE driver_id = $2',
        [routeCost, driverId]
      );

      // Добавляем запись о транзакции
      await pool.query(
        `INSERT INTO driver_transactions 
         (driver_id, amount, transaction_type, description, route_id) 
         VALUES ($1, $2, 'payment', 'Оплата маршрута', $3)`,
        [driverId, -routeCost, routeId]
      );

      // Удаляем маршрут из списка активных
      await pool.query(
        'DELETE FROM routes WHERE route_id = $1',
        [routeId]
      );

      await pool.query('COMMIT');

      res.json({ 
        message: 'Маршрут успешно оплачен',
        newBalance: driverBalance - routeCost
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при оплате маршрута' });
  }
});

// Удаление водителя (только для юрлиц)
router.delete('/drivers/:driver_id', authenticateToken, checkLegalUser, async (req, res) => {
  const { driver_id } = req.params;
  const user_id = req.user.user_id;
  try {
    // Проверяем, что водитель принадлежит компании
    const driverQuery = await pool.query('SELECT * FROM drivers WHERE driver_id = $1 AND user_id = $2', [driver_id, user_id]);
    if (driverQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Водитель не найден или не принадлежит вашей компании' });
    }
    // Удаляем водителя
    await pool.query('DELETE FROM drivers WHERE driver_id = $1', [driver_id]);
    res.status(200).json({ message: 'Водитель успешно удалён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;