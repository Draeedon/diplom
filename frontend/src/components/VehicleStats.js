import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import './VehicleStats.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const VehicleStats = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Токен авторизации отсутствует');
        return;
      }

      const response = await axios.get('http://localhost:5000/api/admin/vehicle-stats', {
        params: {
          startDate,
          endDate
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      setStats(response.data);
      setError('');
    } catch (err) {
      setError('Ошибка загрузки статистики: ' + (err.response?.data?.message || err.message));
    }
  };

  const chartData = stats ? {
    labels: ['2 оси', '3 оси', '4 оси'],
    datasets: [
      {
        data: [
          stats.twoAxles || 0,
          stats.threeAxles || 0,
          stats.fourAxles || 0
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)'
        ],
        borderWidth: 1
      }
    ]
  } : null;

  return (
    <div className="stats-container">
      <h3 className="stats-title">Статистика использования транспортных средств</h3>
      
      <div className="date-range">
        <div className="form-group">
          <label>Начальная дата:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Конечная дата:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="form-input"
          />
        </div>
        <button onClick={fetchStats} className="submit-button">
          Показать статистику
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      {stats && (
        <div className="stats-content">
          <div className="chart-container">
            <Pie data={chartData} />
          </div>
          <div className="stats-summary">
            <h4>Итого за период:</h4>
            <p>Транспортных средств с 2 осями: {stats.twoAxles || 0}</p>
            <p>Транспортных средств с 3 осями: {stats.threeAxles || 0}</p>
            <p>Транспортных средств с 4 осями: {stats.fourAxles || 0}</p>
            <p>Всего транспортных средств: {(stats.twoAxles || 0) + (stats.threeAxles || 0) + (stats.fourAxles || 0)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleStats; 