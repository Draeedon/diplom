import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './TripsJournal.css';

const TripsJournal = () => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/trips-journal?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Ошибка при загрузке данных');
      }
      
      const data = await response.json();
      setTrips(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [startDate, endDate]);

  return (
    <div className="trips-journal">
      <h2>Журнал поездок</h2>
      
      <div className="date-filters">
        <div className="date-picker">
          <label>Начальная дата:</label>
          <DatePicker
            selected={startDate}
            onChange={date => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            locale={ru}
            dateFormat="dd.MM.yyyy"
          />
        </div>
        
        <div className="date-picker">
          <label>Конечная дата:</label>
          <DatePicker
            selected={endDate}
            onChange={date => setEndDate(date)}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            locale={ru}
            dateFormat="dd.MM.yyyy"
          />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : (
        <div className="table-container">
          <table className="trips-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Пользователь</th>
                <th>Транспортное средство</th>
                <th>Маршрут</th>
                <th>Расстояние (км)</th>
                <th>Стоимость (BYN)</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr key={trip.route_id}>
                  <td>{format(new Date(trip.creation_date), 'dd.MM.yyyy HH:mm', { locale: ru })}</td>
                  <td>{trip.user_name}</td>
                  <td>{trip.vehicle_info}</td>
                  <td>{trip.route_description}</td>
                  <td>{trip.total_distance_km !== undefined && trip.total_distance_km !== null && !isNaN(Number(trip.total_distance_km)) ? Number(trip.total_distance_km).toFixed(1) : '-'}</td>
                  <td>{trip.toll_cost !== undefined && trip.toll_cost !== null && !isNaN(Number(trip.toll_cost)) ? Number(trip.toll_cost).toFixed(2) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TripsJournal; 