import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './NavbarStyles.css';

const Navbar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [userType, setUserType] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token) {
      const fetchUserData = async () => {
        try {
          let res;
          if (role === 'driver') {
            res = await axios.get('http://localhost:5000/api/auth/driver/profile', {
              headers: { Authorization: `Bearer ${token}` },
            });
            setUsername(res.data.login || '');
            setUserType('driver');
            setCompanyName('');
            setRole('driver');
          } else {
            res = await axios.get('http://localhost:5000/api/auth/user', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUsername(res.data.username);
          setUserType(res.data.user_type);
          setCompanyName(res.data.company_name);
          setRole(localStorage.getItem('role') || 'user');
          }
          setIsAuthenticated(true);
        } catch (err) {
          console.error('Ошибка получения данных пользователя:', err);
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          navigate('/login');
        }
      };
      fetchUserData();
    } else {
      setIsAuthenticated(false);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('user_type');
    localStorage.removeItem('country');
    localStorage.removeItem('company_id');
    localStorage.removeItem('company_name');
    setIsAuthenticated(false);
    setUsername('');
    setUserType('');
    setCompanyName('');
    setRole('');
    navigate('/login');
  };

  const displayName = userType === 'legal' && companyName ? companyName : username;

  return (
    <nav className="navbar">
      <ul className="navbar-list">
        {isAuthenticated ? (
          <>
            {role === 'driver' ? (
              <>
                <li><Link to="/driver-profile">Профиль</Link></li>
                <li><Link to="/routes">Маршруты</Link></li>
              </>
            ) : (
              <>
                <li><Link to="/vehicles">Автомобили</Link></li>
                <li><Link to="/routes">Маршруты</Link></li>
                {userType === 'legal' && <li><Link to="/drivers">Водители</Link></li>}
                {username === 'admin' && <li><Link to="/admin">Админ</Link></li>}
              </>
            )}
            <li><Link to="/help">Справка</Link></li>
            <li className="navbar-user">
              <span>Привет, {displayName}!</span>
              <button onClick={handleLogout} className="logout-button">
                Выйти
              </button>
            </li>
          </>
        ) : (
          <>
            <li><Link to="/login">Логин</Link></li>
            <li><Link to="/help">Справка</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;