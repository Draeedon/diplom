import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import { decode } from '@googlemaps/polyline-codec';
import './RoutesStyles.css'; // Импортируем стили

const containerStyle = {
  width: '100%',
  height: '400px',
};

const center = { lat: 53.9, lng: 27.5667 }; // Минск

const UserRoads = () => {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [roads, setRoads] = useState([]);
  const [userRoutes, setUserRoutes] = useState([]); // Для сохраненных маршрутов
  const [selectedRoad, setSelectedRoad] = useState(null);
  const [points, setPoints] = useState([]);
  const [routePath, setRoutePath] = useState([]);
  const [routeName, setRouteName] = useState('');
  const [vignettePeriod, setVignettePeriod] = useState('15');
  const [calculations, setCalculations] = useState({
    distance: 0,
    duration: 0,
    tollCost: 0,
  });
  const [error, setError] = useState('');
  const [mapKey, setMapKey] = useState(Date.now());

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyCimrZsxoNqjf7rdEf1JPkabzL2TlTE-iI',
  });

  useEffect(() => {
    fetchVehicles();
    fetchRoads();
    fetchUserRoutes();
  }, []);

  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/auth/vehicles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVehicles(res.data || []);
    } catch (err) {
      setError('Ошибка загрузки автомобилей: ' + (err.response?.data.message || err.message));
    }
  };

  const fetchRoads = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/roads', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoads(res.data);
    } catch (err) {
      setError('Ошибка загрузки дорог: ' + (err.response?.data.message || err.message));
    }
  };

  const fetchUserRoutes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/auth/routes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserRoutes(res.data);
    } catch (err) {
      setError('Ошибка загрузки маршрутов: ' + (err.response?.data.message || err.message));
    }
  };

  const handleSelectRoad = (road) => {
    const startLatitude = parseFloat(road.start_latitude);
    const startLongitude = parseFloat(road.start_longitude);
    const endLatitude = parseFloat(road.end_latitude);
    const endLongitude = parseFloat(road.end_longitude);

    if (
      isNaN(startLatitude) ||
      isNaN(startLongitude) ||
      isNaN(endLatitude) ||
      isNaN(endLongitude)
    ) {
      setError('Координаты выбранной дороги некорректны. Проверьте данные в базе.');
      setPoints([]);
      setRoutePath([]);
      return;
    }

    setSelectedRoad(road);
    const initialPoints = [
      { latitude: startLatitude, longitude: startLongitude },
      { latitude: endLatitude, longitude: endLongitude },
    ];
    setPoints(initialPoints);
    if (isLoaded) {
      calculateRoute(initialPoints).catch((err) => {
        setError('Ошибка расчета маршрута для выбранной дороги: ' + err.message);
        const fallbackPath = initialPoints.map((p) => ({ lat: p.latitude, lng: p.longitude }));
        setRoutePath(fallbackPath);
      });
    }
  };

  const handleMapClick = (e) => {
    if (!selectedRoad) {
      setError('Сначала выберите дорогу из списка');
      return;
    }
    const newPoint = {
      latitude: e.latLng.lat(),
      longitude: e.latLng.lng(),
    };
    setPoints((prevPoints) => {
      const updatedPoints = [...prevPoints, newPoint];
      if (isLoaded) {
        calculateRoute(updatedPoints).catch((err) => {
          setError('Ошибка расчета маршрута с новой точкой: ' + err.message);
          const fallbackPath = updatedPoints.map((p) => ({ lat: p.latitude, lng: p.longitude }));
          setRoutePath(fallbackPath);
        });
      }
      return updatedPoints;
    });
  };

  const calculateRoute = useCallback(
    async (routePoints) => {
      if (!isLoaded || routePoints.length < 2) {
        return;
      }

      try {
        const origin = {
          location: { latLng: { latitude: routePoints[0].latitude, longitude: routePoints[0].longitude } },
        };
        const destination = {
          location: {
            latLng: {
              latitude: routePoints[routePoints.length - 1].latitude,
              longitude: routePoints[routePoints.length - 1].longitude,
            },
          },
        };
        const intermediates = routePoints.slice(1, -1).map((point) => ({
          location: { latLng: { latitude: point.latitude, longitude: point.longitude } },
        }));

        const response = await axios.post(
          'https://routes.googleapis.com/directions/v2:computeRoutes',
          {
            origin,
            destination,
            intermediates,
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
            computeAlternativeRoutes: false,
            units: 'METRIC',
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': 'AIzaSyCimrZsxoNqjf7rdEf1JPkabzL2TlTE-iI',
              'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
            },
          }
        );

        if (!response.data.routes || response.data.routes.length === 0) {
          throw new Error('Маршруты не найдены в ответе API');
        }

        const routeData = response.data.routes[0];
        const encodedPolyline = routeData.polyline.encodedPolyline;
        const decodedPath = decode(encodedPolyline, 5);
        const path = decodedPath.map(([lat, lng]) => ({ lat: Number(lat), lng: Number(lng) }));
        setRoutePath(path);

        const distanceKm = routeData.distanceMeters / 1000;
        const durationMinutes = Math.round(parseInt(routeData.duration.replace('s', '')) / 60);

        let tollCost = 0;
        if (selectedVehicleId) {
          const tollResponse = await axios.post(
            `http://localhost:5000/api/auth/vehicles/${selectedVehicleId}/calculate-toll`,
            {
              distance: distanceKm,
              vignette_period: parseInt(vignettePeriod),
            },
            {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            }
          );
          tollCost = tollResponse.data.cost;
        }

        setCalculations({
          distance: distanceKm,
          duration: durationMinutes,
          tollCost: tollCost,
        });
        setError('');
      } catch (err) {
        setError('Ошибка расчета маршрута: ' + (err.response?.data.message || err.message));
      }
    },
    [isLoaded, selectedVehicleId, vignettePeriod]
  );

  const handleSaveRoute = async () => {
    if (points.length < 2) {
      setError('Добавьте хотя бы две точки');
      return;
    }
    if (!routeName) {
      setError('Введите название маршрута');
      return;
    }
    if (!selectedVehicleId) {
      setError('Выберите автомобиль');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/auth/routes',
        {
          name: routeName,
          points: points.map((p, i) => ({
            ...p,
            point_order: i + 1,
          })),
          vehicle_id: selectedVehicleId,
          total_distance_km: calculations.distance,
          fuel_cost: 0,
          toll_cost: calculations.tollCost,
          duration_minutes: calculations.duration,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPoints([]);
      setSelectedRoad(null);
      setRoutePath([]);
      setRouteName('');
      setSelectedVehicleId('');
      setCalculations({ distance: 0, duration: 0, tollCost: 0 });
      setMapKey(Date.now());
      setError('');
      fetchUserRoutes(); // Обновляем список маршрутов
    } catch (err) {
      setError('Ошибка сохранения маршрута: ' + (err.response?.data.message || 'Неизвестная ошибка'));
    }
  };

  const handleClearMap = () => {
    setPoints([]);
    setSelectedRoad(null);
    setRoutePath([]);
    setRouteName('');
    setSelectedVehicleId('');
    setCalculations({ distance: 0, duration: 0, tollCost: 0 });
    setMapKey(Date.now());
    setError('');
  };

  const mapCenter =
    routePath.length > 0
      ? { lat: routePath[0].lat, lng: routePath[0].lng }
      : points.length > 0
      ? { lat: points[0].latitude, lng: points[0].longitude }
      : selectedRoad
      ? { lat: parseFloat(selectedRoad.start_latitude), lng: parseFloat(selectedRoad.start_longitude) }
      : center;

  if (loadError) return <div className="error-message">Ошибка загрузки Google Maps: {loadError.message}</div>;
  if (!isLoaded) return <div className="loading">Загрузка...</div>;

  return (
    <div className="routes-container">
      <h2 className="routes-title">Создание маршрута (Пользователь)</h2>
      {error && <p className="error-message">{error}</p>}

      {/* Форма для выбора параметров маршрута */}
      <div className="routes-form">
        <div className="form-group">
          <label>Название маршрута:</label>
          <input
            className="form-input"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            placeholder="Введите название маршрута"
          />
        </div>
        <div className="form-group">
          <label>Выберите автомобиль:</label>
          <select
            className="form-select"
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
          >
            <option value="">Выберите автомобиль</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                {`${vehicle.license_plate} (${vehicle.type === 'passenger' ? 'Легковой' : 'Грузовой'})` +
                  (vehicle.assigned_driver_id && vehicle.assigned_driver
                    ? ` - Водитель: ${vehicle.assigned_driver.last_name} ${vehicle.assigned_driver.initials}`
                    : ' - Без водителя')}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Период виньетки (для авто ≤ 3,5 т):</label>
          <select
            className="form-select"
            value={vignettePeriod}
            onChange={(e) => setVignettePeriod(e.target.value)}
          >
            <option value="15">15 дней</option>
            <option value="30">30 дней</option>
            <option value="365">Год</option>
          </select>
        </div>
      </div>

      {/* Таблица дорог */}
      <h3 className="routes-subtitle">Выберите дорогу</h3>
      <table className="roads-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Название</th>
            <th>Тип</th>
            <th>Начало (широта)</th>
            <th>Начало (долгота)</th>
            <th>Конец (широта)</th>
            <th>Конец (долгота)</th>
            <th>Описание</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {roads.map((road) => (
            <tr key={road.road_id}>
              <td>{road.road_id}</td>
              <td>{road.name}</td>
              <td>{road.road_type}</td>
              <td>{road.start_latitude}</td>
              <td>{road.start_longitude}</td>
              <td>{road.end_latitude}</td>
              <td>{road.end_longitude}</td>
              <td>{road.description}</td>
              <td>
                <button className="select-button" onClick={() => handleSelectRoad(road)}>
                  Выбрать
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Карта */}
      <h3 className="routes-subtitle">Карта</h3>
      <div className="map-container">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={10}
          onClick={handleMapClick}
          key={mapKey}
        >
          {points.map((point, index) => (
            <Marker
              key={index}
              position={{ lat: Number(point.latitude), lng: Number(point.longitude) }}
              label={`${index + 1}`}
            />
          ))}
          {routePath.length > 0 && (
            <Polyline
              path={routePath}
              options={{
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 2,
              }}
            />
          )}
        </GoogleMap>
      </div>

      {/* Результаты расчета */}
      {calculations.distance > 0 && (
        <div className="results">
          <h3 className="results-title">Результаты</h3>
          <p>Расстояние: {calculations.distance.toFixed(2)} км</p>
          <p>Стоимость проезда: {calculations.tollCost.toFixed(2)} евро</p>
          <p>Время в пути: {calculations.duration} минут</p>
        </div>
      )}

      {/* Кнопки действий */}
      <div className="actions">
        <button className="save-button" onClick={handleSaveRoute}>
          Сохранить маршрут
        </button>
        <button className="clear-button" onClick={handleClearMap}>
          Очистить карту
        </button>
      </div>

      {/* Таблица сохраненных маршрутов */}
      <h3 className="routes-subtitle">Ваши маршруты</h3>
      {userRoutes.length > 0 ? (
        <table className="routes-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Название</th>
              <th>Расстояние (км)</th>
              <th>Стоимость проезда (евро)</th>
              <th>Время (мин)</th>
              <th>Автомобиль</th>
            </tr>
          </thead>
          <tbody>
            {userRoutes.map((route) => {
              const vehicle = vehicles.find((v) => v.vehicle_id === route.vehicle_id);
              return (
                <tr key={route.route_id}>
                  <td>{route.route_id}</td>
                  <td>{route.name}</td>
                  <td>{route.total_distance_km.toFixed(2)}</td>
                  <td>{route.toll_cost.toFixed(2)}</td>
                  <td>{route.duration_minutes}</td>
                  <td>
                    {vehicle
                      ? `${vehicle.license_plate} (${vehicle.type === 'passenger' ? 'Легковой' : 'Грузовой'})` +
                        (vehicle.assigned_driver_id && vehicle.assigned_driver
                          ? ` - ${vehicle.assigned_driver.last_name} ${vehicle.assigned_driver.initials}`
                          : '')
                      : 'Не указан'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="no-routes">У вас пока нет сохраненных маршрутов.</p>
      )}
    </div>
  );
};

export default UserRoads;