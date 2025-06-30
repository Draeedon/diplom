import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AuthStyles.css';

// Список стран (можно расширить по необходимости)
const countries = [
  'Belarus', 'Russia', 'Kazakhstan', 'Armenia', 'Kyrgyzstan', // ЕАЭС
  'Poland', 'Lithuania', 'Latvia', 'Estonia', 'Finland', 'Sweden', 'Norway', // Европа (Балтия и Скандинавия)
  'Germany', 'France', 'Italy', 'Spain', 'Portugal', 'Netherlands', 'Belgium', 'Austria', 'Switzerland', // Европа (Западная и Центральная)
  'Czech Republic', 'Slovakia', 'Hungary', 'Romania', 'Bulgaria', 'Greece', 'Serbia', 'Croatia', // Европа (Центральная и Южная)
  'Uzbekistan', 'Tajikistan', 'Turkmenistan', 'Afghanistan', 'Pakistan', 'India', 'China', 'Mongolia', // Азия (Центральная и Южная)
  'Japan', 'South Korea', 'Thailand', 'Vietnam', 'Malaysia', 'Indonesia', 'Philippines', // Азия (Восточная и Юго-Восточная)
  'Turkey', 'Georgia', 'Azerbaijan', 'Iran', // Ближний Восток и Кавказ
  'Ukraine', 'Moldova' // Восточная Европа
].sort(); // Сортируем по алфавиту

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('individual');
  const [country, setCountry] = useState('Belarus');
  const [companyId, setCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (userType === 'legal' && (!companyId || !companyName)) {
      setError('Для юридического лица необходимо указать идентификационный номер и название компании');
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', {
        username,
        password,
        user_type: userType,
        country,
        company_id: userType === 'legal' ? companyId : null,
        company_name: userType === 'legal' ? companyName : null,
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('user_type', res.data.user_type);
      navigate('/vehicles');
    } catch (err) {
      setError(err.response?.data.message || 'Ошибка регистрации');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 className="auth-title">Регистрация</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Имя пользователя</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="form-input"
              placeholder="Введите имя пользователя"
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
              placeholder="Введите пароль"
            />
          </div>
          <div className="form-group">
            <label>Тип пользователя</label>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
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
              onChange={(e) => setCountry(e.target.value)}
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
                  onChange={(e) => setCompanyId(e.target.value)}
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
                  onChange={(e) => setCompanyName(e.target.value)}
                  required={userType === 'legal'}
                  className="form-input"
                  placeholder="Введите название компании"
                />
              </div>
            </>
          )}
          <button type="submit" className="auth-button">Зарегистрироваться</button>
          <p className="switch-link">
            Уже есть аккаунт? <a href="/login">Войдите</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;