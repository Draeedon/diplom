import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './DriverTransactionsStyles.css';

const DriverTransactions = () => {
  const { driverId } = useParams();
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTransactions = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Токен авторизации отсутствует');
        navigate('/login');
        return;
      }

      try {
        const res = await axios.get(`http://localhost:5000/api/auth/drivers/${driverId}/transactions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Преобразуем amount в число
        const transactionsWithFixedAmount = res.data.map(tx => ({
          ...tx,
          amount: parseFloat(tx.amount) || 0.0,
        }));
        setTransactions(transactionsWithFixedAmount);
      } catch (err) {
        setError(err.response?.data.message || 'Ошибка загрузки транзакций');
      }
    };
    fetchTransactions();
  }, [driverId, navigate]);

  return (
    <div className="transactions-container">
      <h2>Транзакции водителя</h2>
      {error && <p className="error-message">{error}</p>}
      {transactions.length > 0 ? (
        <table className="transactions-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Сумма (€)</th>
              <th>Тип</th>
              <th>Описание</th>
              <th>Дата</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.transaction_id}>
                <td>{tx.transaction_id}</td>
                <td>{(parseFloat(tx.amount) || 0.0).toFixed(2)}</td>
                <td>{tx.transaction_type}</td>
                <td>{tx.description}</td>
                <td>{new Date(tx.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Транзакций пока нет.</p>
      )}
      <button onClick={() => navigate('/drivers')} className="back-button">
        Назад к водителям
      </button>
    </div>
  );
};

export default DriverTransactions;