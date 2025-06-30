import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './DriversStyles.css';

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [lastName, setLastName] = useState('');
  const [initials, setInitials] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [error, setError] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Токен авторизации отсутствует');
        navigate('/login');
        return;
      }

      try {
        const userRes = await axios.get('http://localhost:5000/api/auth/user', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (userRes.data.user_type !== 'legal') {
          setError('Доступ только для юридических лиц');
          navigate('/vehicles');
          return;
        }

        const driversRes = await axios.get('http://localhost:5000/api/auth/drivers', {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Преобразуем balance в число при получении данных
        const driversWithFixedBalance = driversRes.data.map(driver => ({
          ...driver,
          balance: parseFloat(driver.balance) || 0.0, // Преобразуем в число, если не удается — ставим 0
        }));
        setDrivers(driversWithFixedBalance);

        const vehiclesRes = await axios.get('http://localhost:5000/api/auth/vehicles', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVehicles(vehiclesRes.data);
      } catch (err) {
        setError(err.response?.data.message || 'Ошибка загрузки данных');
      }
    };
    fetchData();
  }, [navigate]);

  const handleAddDriver = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        'http://localhost:5000/api/auth/drivers',
        {
          vehicle_id: selectedVehicle,
          last_name: lastName,
          initials,
          birth_date: birthDate,
          login,
          password,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDrivers([...drivers, { ...res.data, balance: parseFloat(res.data.balance) || 0.0 }]);
      setLastName('');
      setInitials('');
      setBirthDate('');
      setLogin('');
      setPassword('');
      setSelectedVehicle('');
      setError('');
    } catch (err) {
      setError(err.response?.data.message || 'Ошибка добавления водителя');
    }
  };

  const handleDeposit = async (driverId) => {
    if (!depositAmount || depositAmount <= 0) {
      setError('Введите корректную сумму');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/auth/drivers/${driverId}/deposit`,
        { amount: parseFloat(depositAmount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDrivers(drivers.map(driver => 
        driver.driver_id === driverId 
          ? { ...driver, balance: (parseFloat(driver.balance) || 0.0) + parseFloat(depositAmount) }
          : driver
      ));
      setDepositAmount('');
      setError('');
    } catch (err) {
      setError(err.response?.data.message || 'Ошибка пополнения баланса');
    }
  };

  const handleViewTransactions = (driverId) => {
    navigate(`/drivers/${driverId}/transactions`);
  };

  return (
    <div className="drivers-container">
      <h2>Управление водителями</h2>
      {error && <p className="error-message">{error}</p>}

      <h3>Добавить водителя</h3>
      <form onSubmit={handleAddDriver} className="driver-form">
        <div className="form-group">
          <label>Фамилия</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Инициалы</label>
          <input
            type="text"
            value={initials}
            onChange={(e) => setInitials(e.target.value)}
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Дата рождения</label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Логин</label>
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Автомобиль</label>
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            required
            className="form-input"
          >
            <option value="">Выберите автомобиль</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                {vehicle.license_plate}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="add-button">Добавить водителя</button>
      </form>

      <h3>Список водителей</h3>
      {drivers.length > 0 ? (
        <table className="drivers-table">
          <thead>
            <tr>
              <th>Фамилия</th>
              <th>Инициалы</th>
              <th>Дата рождения</th>
              <th>Логин</th>
              <th>Автомобиль</th>
              <th>Баланс (€)</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.driver_id}>
                <td>{driver.last_name}</td>
                <td>{driver.initials}</td>
                <td>{driver.birth_date}</td>
                <td>{driver.login}</td>
                <td>{driver.license_plate || 'Нет'}</td>
                <td>{(parseFloat(driver.balance) || 0.0).toFixed(2)}</td>
                <td>
                  <input
                    type="number"
                    placeholder="Сумма"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="deposit-input"
                  />
                  <button onClick={() => handleDeposit(driver.driver_id)} className="deposit-button">
                    Пополнить
                  </button>
                  <button onClick={() => handleViewTransactions(driver.driver_id)} className="view-button">
                    Транзакции
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>У вас пока нет водителей.</p>
      )}
    </div>
  );
};

export default Drivers;