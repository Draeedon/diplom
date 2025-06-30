import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './DriverProfileStyles.css';

const DriverProfile = () => {
  const [driver, setDriver] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDriverProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Токен авторизации отсутствует');
        navigate('/login');
        return;
      }

      try {
        const res = await axios.get('http://localhost:5000/api/auth/driver/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDriver({
          ...res.data,
          balance: parseFloat(res.data.balance) || 0.0, // Преобразуем balance в число
        });
      } catch (err) {
        setError(err.response?.data.message || 'Ошибка загрузки профиля');
        navigate('/login');
      }
    };
    fetchDriverProfile();
  }, [navigate]);

  useEffect(() => {
    const fetchDriverRoutes = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await axios.get('http://localhost:5000/api/auth/driver/routes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRoutes(res.data);
      } catch (err) {
        // Можно добавить обработку ошибки
      } finally {
        setLoadingRoutes(false);
      }
    };
    fetchDriverRoutes();
  }, []);

  if (!driver) return <div className="loading">Загрузка...</div>;

  return (
    <div className="driver-profile-container">
      <h2>Профиль водителя</h2>
      {error && <p className="error-message">{error}</p>}
      <div className="profile-details">
        <p><strong>ID:</strong> {driver.driver_id}</p>
        <p><strong>Фамилия:</strong> {driver.last_name}</p>
        <p><strong>Инициалы:</strong> {driver.initials}</p>
        <p><strong>Дата рождения:</strong> {driver.birth_date}</p>
        <p><strong>Логин:</strong> {driver.login}</p>
        <p><strong>Автомобиль:</strong> {driver.license_plate || 'Нет'}</p>
        <p><strong>Баланс:</strong> {(parseFloat(driver.balance) || 0.0).toFixed(2)} €</p>
      </div>
      <div className="driver-routes">
        <h3>Маршруты, связанные с вашим автомобилем</h3>
        {loadingRoutes ? (
          <div>Загрузка маршрутов...</div>
        ) : routes.length === 0 ? (
          <div>Нет маршрутов для вашего автомобиля</div>
        ) : (
          <ul>
            {routes.map(route => (
              <li key={route.route_id}>{route.name}</li>
            ))}
          </ul>
        )}
      </div>
      <button onClick={() => navigate('/routes')} className="routes-button">
        Перейти к маршрутам
      </button>
    </div>
  );
};

export default DriverProfile;