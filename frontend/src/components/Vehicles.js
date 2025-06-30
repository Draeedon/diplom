import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import './VehicleStyles.css';

ChartJS.register(ArcElement, Tooltip, Legend);

// Компонент для подсветки текста
const HighlightText = ({ text, searchTerm }) => {
  if (!searchTerm) return <span>{text}</span>;

  const regex = new RegExp(`(${searchTerm})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <span key={index} className="highlight">{part}</span>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
};

const Vehicles = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [vehicleForm, setVehicleForm] = useState({
    license_plate: '',
    type: 'passenger',
    tonnage: '',
    axles: '',
    assigned_driver_id: '',
  });
  const [driverForm, setDriverForm] = useState({
    last_name: '',
    initials: '',
    birth_date: '',
  });
  const [error, setError] = useState('');
  const [searchLicensePlate, setSearchLicensePlate] = useState(''); // Поиск по номеру автомобиля
  const [searchDriverLastName, setSearchDriverLastName] = useState(''); // Поиск по фамилии водителя
  const userType = localStorage.getItem('user_type') || 'individual';
  const [vehicleStats, setVehicleStats] = useState(null);
  const isAdmin = (localStorage.getItem('role') === 'admin' || localStorage.getItem('username') === 'admin');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    } else {
      fetchVehicles();
    }
  }, [navigate]);

  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/auth/vehicles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVehicles(res.data || []);

      // Подсчет статистики по осям для юридических лиц
      if (userType === 'legal') {
        const axleStats = res.data.reduce((acc, vehicle) => {
          const axleCount = vehicle.axles || 0;
          acc[axleCount] = (acc[axleCount] || 0) + 1;
          return acc;
        }, {});

        setVehicleStats({
          labels: Object.keys(axleStats).map(count => `${count} осей`),
          datasets: [{
            data: Object.values(axleStats),
            backgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
              '#FF9F40'
            ],
            borderWidth: 1
          }]
        });
      }
    } catch (err) {
      setError('Ошибка загрузки автомобилей');
    }
  };

  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    if (userType !== 'legal' && vehicleForm.type === 'truck') {
      setError('Физическим лицам разрешены только легковые автомобили');
      return;
    }
    if (userType === 'individual' && parseFloat(vehicleForm.tonnage) > 2.5) {
      setError('Физическим лицам нельзя указывать тоннаж более 2.5 тонн');
      return;
    }
    // Валидация количества осей для юр. лиц
    if (userType === 'legal' && (parseInt(vehicleForm.axles) < 2 || isNaN(parseInt(vehicleForm.axles)))) {
      setError('Количество осей не может быть меньше 2');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const cleanedVehicleForm = {
        ...vehicleForm,
        tonnage: vehicleForm.tonnage ? parseFloat(vehicleForm.tonnage) : null,
        axles: userType === 'legal' ? vehicleForm.axles || null : 2, // для физ лиц всегда 2
        assigned_driver_id: vehicleForm.assigned_driver_id ? parseInt(vehicleForm.assigned_driver_id) : null,
      };
      await axios.post('http://localhost:5000/api/auth/vehicles', cleanedVehicleForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVehicleForm({
        license_plate: '',
        type: 'passenger',
        tonnage: '',
        axles: '',
        assigned_driver_id: '',
      });
      fetchVehicles();
      setError('');
    } catch (err) {
      setError(err.response?.data.message || 'Ошибка добавления автомобиля');
    }
  };

  const handleDriverSubmit = async (e) => {
    e.preventDefault();
    if (userType !== 'legal') {
      setError('Добавление водителя доступно только для юридических лиц');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/drivers', driverForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDriverForm({ last_name: '', initials: '', birth_date: '' });
      fetchVehicles();
      setError('');
    } catch (err) {
      setError(err.response?.data.message || 'Ошибка добавления водителя');
    }
  };

  const handleVehicleChange = (e) => {
    setVehicleForm({ ...vehicleForm, [e.target.name]: e.target.value });
  };

  const handleDriverChange = (e) => {
    setDriverForm({ ...driverForm, [e.target.name]: e.target.value });
  };

  const handleAssignDriver = async (vehicleId, driverId) => {
    try {
      const token = localStorage.getItem('token');
      const assignment_date = new Date().toISOString().split('T')[0];
      await axios.put(`http://localhost:5000/api/auth/vehicles/${vehicleId}/assign`, {
        assigned_driver_id: driverId,
        assignment_date,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchVehicles();
    } catch (err) {
      setError('Ошибка назначения водителя');
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (window.confirm('Вы уверены, что хотите удалить этот автомобиль?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/auth/vehicles/${vehicleId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVehicles(vehicles.filter((vehicle) => vehicle.vehicle_id !== vehicleId));
        setError('');
      } catch (err) {
        setError(err.response?.data.message || 'Ошибка удаления автомобиля');
      }
    }
  };

  const handleDeleteDriver = async (driverId) => {
    if (window.confirm('Вы уверены, что хотите удалить этого водителя?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/drivers/${driverId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        await axios.put(`http://localhost:5000/api/auth/vehicles/assign`, {
          assigned_driver_id: null,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchVehicles();
        setError('');
      } catch (err) {
        setError(err.response?.data.message || 'Ошибка удаления водителя');
      }
    }
  };

  // Фильтрация автомобилей
  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesLicensePlate = vehicle.license_plate
      .toLowerCase()
      .includes(searchLicensePlate.toLowerCase());
    const driverLastName = vehicle.assigned_driver?.last_name || '';
    const matchesDriverLastName = driverLastName
      .toLowerCase()
      .includes(searchDriverLastName.toLowerCase());
    return matchesLicensePlate && (searchDriverLastName ? matchesDriverLastName : true);
  });

  return (
    <div className="vehicles-container">
      <h2 className="vehicles-title">Мои автомобили и водители</h2>
      {error && <p className="error-message">{error}</p>}

      {userType === 'legal' && vehicleStats && (
        <div className="stats-section">
          <h3>Статистика транспортных средств по количеству осей</h3>
          <div className="chart-container">
            <Pie 
              data={vehicleStats}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'right',
                  },
                  title: {
                    display: true,
                    text: 'Распределение транспортных средств'
                  }
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Поля для поиска */}
      <div className="search-form">
        <div className="form-group">
          <label>Поиск по номеру автомобиля</label>
          <input
            type="text"
            value={searchLicensePlate}
            onChange={(e) => setSearchLicensePlate(e.target.value)}
            className="form-input"
            placeholder="Введите номер (например, XY2789)"
          />
        </div>
        {userType === 'legal' && (
          <div className="form-group">
            <label>Поиск по фамилии водителя</label>
            <input
              type="text"
              value={searchDriverLastName}
              onChange={(e) => setSearchDriverLastName(e.target.value)}
              className="form-input"
              placeholder="Введите фамилию (например, Иванов)"
            />
          </div>
        )}
      </div>

      {/* Форма добавления автомобиля */}
      {userType && (
        <>
          <h3 className="vehicles-subtitle">Добавить автомобиль</h3>
          <form onSubmit={handleVehicleSubmit} className="vehicles-form">
            <div className="form-group">
              <label>Номер</label>
              <input
                name="license_plate"
                value={vehicleForm.license_plate}
                onChange={handleVehicleChange}
                required
                className="form-input"
                placeholder="Введите номер"
              />
            </div>
            <div className="form-group">
              <label>Тип</label>
              <select
                name="type"
                value={vehicleForm.type}
                onChange={handleVehicleChange}
                className="form-select"
                disabled={userType === 'individual'}
              >
                <option value="passenger">Легковой</option>
                {userType === 'legal' && <option value="truck">Грузовой</option>}
              </select>
            </div>
            <div className="form-group">
              <label>Тоннаж (т)</label>
              <input
                name="tonnage"
                type="number"
                step="0.1"
                min="0.1"
                max={userType === 'individual' ? '2.5' : undefined}
                value={vehicleForm.tonnage}
                onChange={handleVehicleChange}
                className="form-input"
                placeholder="Введите тоннаж"
                required
              />
            </div>
            {/* Для физ лиц поле осей скрыто, для юр лиц отображается */}
            {userType === 'legal' && (
              <div className="form-group">
                <label>Количество осей</label>
                <input
                  name="axles"
                  type="number"
                  value={vehicleForm.axles}
                  onChange={handleVehicleChange}
                  className="form-input"
                  placeholder="Введите количество осей"
                  required={userType === 'legal'}
                />
              </div>
            )}
            <button type="submit" className="submit-button">Добавить автомобиль</button>
          </form>
        </>
      )}

      <h3 className="vehicles-subtitle">Список автомобилей</h3>
      {filteredVehicles.length > 0 ? (
        <table className="vehicles-table">
          <thead>
            <tr>
              {isAdmin && <th>ID</th>}
              <th>Номер</th>
              <th>Тип</th>
              <th>Тоннаж (т)</th>
              <th>Оси</th>
              {userType === 'legal' && <th>Назначенный водитель</th>}
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicles.map((vehicle) => (
              <tr key={vehicle.vehicle_id}>
                {isAdmin && <td>{vehicle.vehicle_id}</td>}
                <td>
                  <HighlightText text={vehicle.license_plate} searchTerm={searchLicensePlate} />
                </td>
                <td>{vehicle.type === 'passenger' ? 'Легковой' : 'Грузовой'}</td>
                <td>{vehicle.tonnage || 'N/A'}</td>
                <td>{userType === 'individual' ? 2 : (vehicle.axles || 'N/A')}</td>
                {userType === 'legal' && (
                  <td>
                    {vehicle.assigned_driver ? (
                      <HighlightText
                        text={`${vehicle.assigned_driver.last_name} ${vehicle.assigned_driver.initials}`}
                        searchTerm={searchDriverLastName}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                )}
                <td>
                  <button onClick={() => handleDeleteVehicle(vehicle.vehicle_id)} className="delete-button">
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="no-vehicles">У вас нет зарегистрированных автомобилей или совпадений по поиску.</p>
      )}
    </div>
  );
};

export default Vehicles;