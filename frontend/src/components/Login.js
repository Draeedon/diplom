import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AuthStyles.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginType, setLoginType] = useState('user'); // Новый выбор: пользователь или водитель
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (loginType === 'user') {
        res = await axios.post('http://localhost:5000/api/auth/login', {
          username,
          password,
        });
      } else {
        res = await axios.post('http://localhost:5000/api/auth/drivers/login', {
          login: username,
          password,
        });
      }

      // Сохраняем токен и данные пользователя
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.username);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('user_type', res.data.user_type);
      localStorage.setItem('country', res.data.country || null);
      if (res.data.company_id) localStorage.setItem('company_id', res.data.company_id);
      if (res.data.company_name) localStorage.setItem('company_name', res.data.company_name);

      // Проверяем роль для перенаправления
      if (res.data.role === 'driver') {
        navigate('/driver-profile');
      } else if (res.data.username === 'admin' || res.data.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/vehicles');
      }
    } catch (err) {
      setError(err.response?.data.message || 'Ошибка входа');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 className="auth-title">Вход</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Тип входа</label>
            <select
              value={loginType}
              onChange={(e) => setLoginType(e.target.value)}
              className="form-input"
            >
              <option value="user">Пользователь</option>
              <option value="driver">Водитель</option>
            </select>
          </div>
          <div className="form-group">
            <label>{loginType === 'user' ? 'Имя пользователя' : 'Логин водителя'}</label>
            <input
              type="text"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="form-input"
              placeholder={loginType === 'user' ? 'Введите имя' : 'Введите логин'}
            />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input"
              placeholder="Введите пароль"
            />
          </div>
          <button type="submit" className="auth-button">Войти</button>
          <p className="switch-link">
            Нет аккаунта? <a href="/register">Зарегистрируйтесь</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;