import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Vehicles from './components/Vehicles';
import RoutesPage from './components/Routes';
import Admin from './components/Admin';
import HelpPage from './components/HelpPage';
import Login from './components/Login';
import Register from './components/Register';
import Drivers from './components/Drivers';
import DriverProfile from './components/DriverProfile';
import DriverTransactions from './components/DriverTransactions';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/routes" element={<RoutesPage />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/driver-profile" element={<DriverProfile />} />
        <Route path="/drivers/:driverId/transactions" element={<DriverTransactions />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;