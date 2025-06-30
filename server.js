const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicle');
const routeRoutes = require('./routes/routes');
const roadRoutes = require('./routes/roads');
const adminRoutes = require('./routes/admin'); // Убедись, что этот импорт есть
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Mount all routes under /api/auth
app.use('/api/auth', authRoutes);
app.use('/api/auth', vehicleRoutes);
app.use('/api/auth', routeRoutes);
app.use('/api/auth', roadRoutes);
app.use('/api/admin', adminRoutes); // Убедись, что этот маршрут зарегистрирован

// Add a test route to verify the server is working
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});