const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.get('/vehicles', authMiddleware, async (req, res) => {
  if (req.user.role === 'driver') {
    // Получаем автомобиль, к которому привязан водитель
    const driverResult = await pool.query(
      'SELECT vehicle_id FROM drivers WHERE driver_id = $1',
      [req.user.user_id]
    );
    if (driverResult.rows.length === 0) {
      return res.status(404).json({ message: 'Водитель не найден' });
    }
    const vehicleId = driverResult.rows[0].vehicle_id;
    const vehicleResult = await pool.query(
      `SELECT v.*, 
              d.driver_id AS assigned_driver_id, 
              d.last_name AS assigned_driver_last_name, 
              d.initials AS assigned_driver_initials
       FROM vehicles v
       LEFT JOIN drivers d ON v.assigned_driver_id = d.driver_id
       WHERE v.vehicle_id = $1`,
      [vehicleId]
    );
    const vehicles = vehicleResult.rows.map(vehicle => ({
      ...vehicle,
      assigned_driver: vehicle.assigned_driver_id
        ? {
            driver_id: vehicle.assigned_driver_id,
            last_name: vehicle.assigned_driver_last_name,
            initials: vehicle.assigned_driver_initials
          }
        : null
    }));
    return res.json(vehicles);
  }
  const user_id = req.user.user_id;
  const today = new Date().toISOString().split('T')[0];
  try {
    const vehiclesResult = await pool.query(
      `SELECT v.*, 
        (
          SELECT row_to_json(d1)
          FROM (
            SELECT driver_id, last_name, initials
            FROM drivers
            WHERE vehicle_id = v.vehicle_id
            LIMIT 1
          ) d1
        ) AS assigned_driver
       FROM vehicles v
       WHERE v.user_id = $1`,
      [user_id]
    );
    const vehicles = vehiclesResult.rows;

    const driversResult = await pool.query(
      'SELECT * FROM drivers WHERE user_id = $1',
      [user_id]
    );
    const allDrivers = driversResult.rows;

    const occupiedDriversResult = await pool.query(
      'SELECT DISTINCT assigned_driver_id FROM vehicles WHERE user_id = $1 AND assignment_date >= $2 AND assigned_driver_id IS NOT NULL',
      [user_id, today]
    );
    const occupiedDriverIds = occupiedDriversResult.rows.map(row => row.assigned_driver_id);

    const availableDrivers = allDrivers.filter(driver => !occupiedDriverIds.includes(driver.driver_id));

    const vehiclesWithDrivers = vehicles.map(vehicle => ({
      ...vehicle,
      available_drivers: availableDrivers.map(driver => ({
        driver_id: driver.driver_id,
        last_name: driver.last_name,
        initials: driver.initials
      }))
    }));

    res.json(vehiclesWithDrivers);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/vehicles', authMiddleware, async (req, res) => {
  const { license_plate, type, tonnage, axles, assigned_driver_id } = req.body;
  const user_id = req.user.user_id;
  const assignment_date = new Date().toISOString().split('T')[0];

  // Валидация количества осей
  if (axles !== undefined && (parseInt(axles) < 2 || isNaN(parseInt(axles)))) {
    return res.status(400).json({ message: 'Количество осей не может быть меньше 2' });
  }

  try {
    const cleanedAssignedDriverId = assigned_driver_id ? parseInt(assigned_driver_id) : null;
    const cleanedTonnage = tonnage ? parseFloat(tonnage) : null;
    const cleanedAxles = axles ? parseInt(axles) : null;

    const newVehicle = await pool.query(
      'INSERT INTO vehicles (user_id, license_plate, type, tonnage, axles, assigned_driver_id, assignment_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [user_id, license_plate, type, cleanedTonnage, cleanedAxles, cleanedAssignedDriverId, assignment_date]
    );
    res.status(201).json(newVehicle.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.put('/vehicles/:vehicle_id/assign', authMiddleware, async (req, res) => {
  const user_id = req.user.user_id;
  const { assigned_driver_id, assignment_date } = req.body;
  const vehicle_id = req.params.vehicle_id;

  try {
    const vehicle = await pool.query(
      'SELECT * FROM vehicles WHERE vehicle_id = $1 AND user_id = $2',
      [vehicle_id, user_id]
    );
    if (vehicle.rows.length === 0) {
      return res.status(404).json({ message: 'Автомобиль не найден или не принадлежит вам' });
    }

    const cleanedAssignedDriverId = assigned_driver_id ? parseInt(assigned_driver_id) : null;

    await pool.query(
      'UPDATE vehicles SET assigned_driver_id = $1, assignment_date = $2 WHERE vehicle_id = $3',
      [cleanedAssignedDriverId, assignment_date, vehicle_id]
    );
    const updatedVehicle = await pool.query(
      'SELECT * FROM vehicles WHERE vehicle_id = $1',
      [vehicle_id]
    );
    res.status(200).json(updatedVehicle.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удаление автомобиля
router.delete('/vehicles/:vehicle_id', authMiddleware, async (req, res) => {
  const user_id = req.user.user_id;
  const vehicle_id = req.params.vehicle_id;
  try {
    const vehicle = await pool.query(
      'SELECT * FROM vehicles WHERE vehicle_id = $1 AND user_id = $2',
      [vehicle_id, user_id]
    );
    if (vehicle.rows.length === 0) {
      return res.status(404).json({ message: 'Автомобиль не найден или не принадлежит вам' });
    }
    // Обнуляем vehicle_id у всех водителей, связанных с этим автомобилем
    await pool.query('UPDATE drivers SET vehicle_id = NULL WHERE vehicle_id = $1', [vehicle_id]);
    await pool.query('DELETE FROM vehicles WHERE vehicle_id = $1', [vehicle_id]);
    res.status(200).json({ message: 'Автомобиль удален' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;