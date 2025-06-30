import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminRoads from './AdminRoads';
import './AdminStyles.css';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vignettePurchasePoints, setVignettePurchasePoints] = useState([]);
  const [error, setError] = useState('');

  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [newVehicle, setNewVehicle] = useState({ license_plate: '', type: '', fuel_type: '', fuel_consumption: '', user_id: '' });
  const [newRoute, setNewRoute] = useState({ name: '', total_distance_km: '', fuel_cost: '', toll_cost: '', duration_minutes: '', vehicle_id: '', user_id: '' });
  const [newVignettePoint, setNewVignettePoint] = useState({ latitude: '', longitude: '', name: '', description: '' });

  // Новые состояния для формы пользователя
  const [userType, setUserType] = useState('individual');
  const [country, setCountry] = useState('Belarus');
  const [companyId, setCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Список стран (можно расширить по необходимости)
  const countries = [
    'Belarus', 'Russia', 'Kazakhstan', 'Armenia', 'Kyrgyzstan',
    'Poland', 'Lithuania', 'Latvia', 'Estonia', 'Finland', 'Sweden', 'Norway',
    'Germany', 'France', 'Italy', 'Spain', 'Portugal', 'Netherlands', 'Belgium', 'Austria', 'Switzerland',
    'Czech Republic', 'Slovakia', 'Hungary', 'Romania', 'Bulgaria', 'Greece', 'Serbia', 'Croatia',
    'Uzbekistan', 'Tajikistan', 'Turkmenistan', 'Afghanistan', 'Pakistan', 'India', 'China', 'Mongolia',
    'Japan', 'South Korea', 'Thailand', 'Vietnam', 'Malaysia', 'Indonesia', 'Philippines',
    'Turkey', 'Georgia', 'Azerbaijan', 'Iran',
    'Ukraine', 'Moldova'
  ].sort();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Токен отсутствует');
        return;
      }

      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      try {
        const usersRes = await axios.get('http://localhost:5000/api/admin/users', config);
        const vehiclesRes = await axios.get('http://localhost:5000/api/admin/vehicles', config);
        const routesRes = await axios.get('http://localhost:5000/api/admin/routes', config);
        const vignettePointsRes = await axios.get('http://localhost:5000/api/admin/vignette-purchase-points', config); // Используем /api/admin

        setUsers(usersRes.data);
        setVehicles(vehiclesRes.data);
        setRoutes(routesRes.data);
        setVignettePurchasePoints(vignettePointsRes.data);
      } catch (err) {
        console.error(err);
        setError('Ошибка загрузки данных: ' + (err.response?.data.message || 'Неизвестная ошибка'));
      }
    };
    fetchData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (userType === 'legal' && (!companyId || !companyName)) {
      setError('Для юридического лица необходимо указать идентификационный номер и название компании');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const res = await axios.post('http://localhost:5000/api/admin/users', {
        username: newUser.username,
        password: newUser.password,
        user_type: userType,
        country,
        company_id: userType === 'legal' ? companyId : null,
        company_name: userType === 'legal' ? companyName : null,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers([...users, res.data]);
      setNewUser({ username: '', password: '', role: 'user' });
      setUserType('individual');
      setCountry('Belarus');
      setCompanyId('');
      setCompanyName('');
    } catch (err) {
      setError('Ошибка создания пользователя: ' + (err.response?.data.message || 'Неизвестная ошибка'));
    }
  };

  const handleDeleteUser = async (userId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:5000/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.filter((u) => u.user_id !== userId));
    } catch (err) {
      setError('Ошибка удаления пользователя: ' + (err.response?.data.message || 'Неизвестная ошибка'));
    }
  };

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await axios.post('http://localhost:5000/api/admin/vehicles', newVehicle, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVehicles([...vehicles, res.data]);
      setNewVehicle({ license_plate: '', type: '', fuel_type: '', fuel_consumption: '', user_id: '' });
    } catch (err) {
      setError('Ошибка создания автомобиля: ' + (err.response?.data.message || 'Неизвестная ошибка'));
    }
  };

  const handleUpdateVehicle = async (vehicleId, updatedData) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.put(`http://localhost:5000/api/admin/vehicles/${vehicleId}`, updatedData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVehicles(vehicles.map((v) => (v.vehicle_id === vehicleId ? res.data : v)));
    } catch (err) {
      setError('Ошибка обновления автомобиля: ' + (err.response?.data.message || 'Неизвестная ошибка'));
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:5000/api/admin/vehicles/${vehicleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVehicles(vehicles.filter((v) => v.vehicle_id !== vehicleId));
    } catch (err) {
      setError('Ошибка удаления автомобиля: ' + (err.response?.data.message || 'Неизвестная ошибка'));
    }
  };

  const handleCreateRoute = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await axios.post('http://localhost:5000/api/admin/routes', newRoute, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoutes([...routes, res.data]);
      setNewRoute({ name: '', total_distance_km: '', fuel_cost: '', toll_cost: '', duration_minutes: '', vehicle_id: '', user_id: '' });
    } catch (err) {
      setError('Ошибка создания маршрута: ' + (err.response?.data.message || 'Неизвестная ошибка'));
    }
  };

  const handleDeleteRoute = async (routeId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:5000/api/admin/routes/${routeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoutes(routes.filter((r) => r.route_id !== routeId));
    } catch (err) {
      setError('Ошибка удаления маршрута: ' + (err.response?.data.message || 'Неизвестная ошибка'));
    }
  };

  const handleCreateVignettePoint = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await axios.post('http://localhost:5000/api/admin/vignette-purchase-points', newVignettePoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVignettePurchasePoints([...vignettePurchasePoints, res.data]);
      setNewVignettePoint({ latitude: '', longitude: '', name: '', description: '' });
    } catch (err) {
      setError('Ошибка создания пункта покупки виньетки: ' + (err.response?.data.message || 'Неизвестная ошибка'));
    }
  };

  const handleDeleteVignettePoint = async (id) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:5000/api/admin/vignette-purchase-points/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVignettePurchasePoints(vignettePurchasePoints.filter((p) => p.id !== id));
    } catch (err) {
      setError('Ошибка удаления пункта покупки виньетки: ' + (err.response?.data.message || 'Неизвестная ошибка'));
    }
  };

  return (
    <div className="admin-container">
      <h2 className="admin-title">Админская панель</h2>
      {error && <p className="error-message">{error}</p>}

      {/* Пользователи */}
      <section className="admin-section">
        <h3 className="section-title">Пользователи</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Роль</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id}>
                <td>{user.username}</td>
                <td>{user.role}</td>
                <td>
                  <button onClick={() => handleDeleteUser(user.user_id)} className="delete-button">
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h4 className="form-title">Добавить пользователя</h4>
        <form onSubmit={handleCreateUser} className="admin-form">
          <div className="form-group">
            <label>Имя пользователя</label>
            <input
              type="text"
              value={newUser.username}
              onChange={e => setNewUser({ ...newUser, username: e.target.value })}
              required
              className="form-input"
              placeholder="Введите имя пользователя"
            />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              value={newUser.password}
              onChange={e => setNewUser({ ...newUser, password: e.target.value })}
              required
              className="form-input"
              placeholder="Введите пароль"
            />
          </div>
          <div className="form-group">
            <label>Тип пользователя</label>
            <select
              value={userType}
              onChange={e => setUserType(e.target.value)}
              className="form-input"
            >
              <option value="individual">Физическое лицо</option>
              <option value="legal">Юридическое лицо</option>
            </select>
          </div>
          <div className="form-group">
            <label>Страна</label>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="form-input"
            >
              {countries.map((countryOption) => (
                <option key={countryOption} value={countryOption}>
                  {countryOption}
                </option>
              ))}
            </select>
          </div>
          {userType === 'legal' && (
            <>
              <div className="form-group">
                <label>Идентификационный номер компании</label>
                <input
                  type="text"
                  value={companyId}
                  onChange={e => setCompanyId(e.target.value)}
                  required={userType === 'legal'}
                  className="form-input"
                  placeholder="Введите идентификационный номер"
                />
              </div>
              <div className="form-group">
                <label>Название компании</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  required={userType === 'legal'}
                  className="form-input"
                  placeholder="Введите название компании"
                />
              </div>
            </>
          )}
          <button type="submit" className="admin-button">Добавить пользователя</button>
        </form>
      </section>

      {/* Автомобили */}
      <section className="admin-section">
        <h3 className="section-title">Автомобили</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Номер</th>
              <th>Тип</th>
              <th>Тоннаж (т)</th>
              <th>Оси</th>
              <th>Пользователь</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.vehicle_id}>
                <td>{vehicle.vehicle_id}</td>
                <td>{vehicle.license_plate}</td>
                <td>{vehicle.type === 'passenger' ? 'Легковой' : 'Грузовой'}</td>
                <td>{vehicle.tonnage || 'N/A'}</td>
                <td>{vehicle.axles || 'N/A'}</td>
                <td>{vehicle.username || vehicle.user_id || '—'}</td>
                <td>
                  <button onClick={() => handleDeleteVehicle(vehicle.vehicle_id)} className="delete-button">
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Маршруты */}
      <section className="admin-section">
        <h3 className="section-title">Маршруты</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Название</th>
              <th>Дистанция (км)</th>
              <th>Стоимость топлива</th>
              <th>Стоимость платных дорог</th>
              <th>Длительность (мин)</th>
              <th>Автомобиль</th>
              <th>Пользователь</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((route) => (
              <tr key={route.route_id}>
                <td>{route.route_id}</td>
                <td>{route.name}</td>
                <td>{route.total_distance_km}</td>
                <td>{route.fuel_cost}</td>
                <td>{route.toll_cost}</td>
                <td>{route.duration_minutes}</td>
                <td>{route.vehicle_id}</td>
                <td>{route.user_id}</td>
                <td>
                  <button onClick={() => handleDeleteRoute(route.route_id)} className="delete-button">
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Пункты покупки виньеток */}
      <section className="admin-section">
        <h3 className="section-title">Пункты покупки виньеток</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Название</th>
              <th>Широта</th>
              <th>Долгота</th>
              <th>Описание</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {vignettePurchasePoints.map((point) => (
              <tr key={point.id}>
                <td>{point.id}</td>
                <td>{point.name}</td>
                <td>{point.latitude}</td>
                <td>{point.longitude}</td>
                <td>{point.description || 'Нет описания'}</td>
                <td>
                  <button onClick={() => handleDeleteVignettePoint(point.id)} className="delete-button">
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h4 className="form-title">Добавить пункт покупки виньетки</h4>
        <form onSubmit={handleCreateVignettePoint} className="admin-form">
          <div className="form-group">
            <input
              type="number"
              step="0.000001"
              value={newVignettePoint.latitude}
              onChange={(e) => setNewVignettePoint({ ...newVignettePoint, latitude: e.target.value })}
              placeholder="Широта"
              required
              className="form-input"
            />
          </div>
          <div className="form-group">
            <input
              type="number"
              step="0.000001"
              value={newVignettePoint.longitude}
              onChange={(e) => setNewVignettePoint({ ...newVignettePoint, longitude: e.target.value })}
              placeholder="Долгота"
              required
              className="form-input"
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              value={newVignettePoint.name}
              onChange={(e) => setNewVignettePoint({ ...newVignettePoint, name: e.target.value })}
              placeholder="Название"
              required
              className="form-input"
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              value={newVignettePoint.description}
              onChange={(e) => setNewVignettePoint({ ...newVignettePoint, description: e.target.value })}
              placeholder="Описание"
              className="form-input"
            />
          </div>
          <button type="submit" className="submit-button">Добавить</button>
        </form>
      </section>

      {/* Дороги */}
      <AdminRoads />
    </div>
  );
};

export default Admin;