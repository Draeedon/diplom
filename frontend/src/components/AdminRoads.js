import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import { decode } from '@googlemaps/polyline-codec';

const containerStyle = {
  width: '100%',
  height: '400px',
};

const center = { lat: 53.9, lng: 27.5667 };

const AdminRoads = () => {
  const [roads, setRoads] = useState([]);
  const [newRoad, setNewRoad] = useState({ name: '', road_type: '', description: '' });
  const [points, setPoints] = useState([]);
  const [routePath, setRoutePath] = useState([]);
  const [selectedRoad, setSelectedRoad] = useState(null);
  const [error, setError] = useState('');
  const [mapKey, setMapKey] = useState(Date.now());
  const [mode, setMode] = useState('road'); // Режим работы: 'road' для дорог, 'vignette' для пунктов покупки виньеток
  const [vignettePurchasePoints, setVignettePurchasePoints] = useState([]); // Список пунктов покупки виньеток
  const [newVignettePoint, setNewVignettePoint] = useState({ latitude: '', longitude: '', name: '', description: '' });

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyCimrZsxoNqjf7rdEf1JPkabzL2TlTE-iI',
  });

  useEffect(() => {
    fetchRoads();
    fetchVignettePurchasePoints();
  }, []);

  const fetchRoads = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/admin/roads', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoads(res.data);
    } catch (err) {
      setError('Ошибка загрузки дорог');
    }
  };

  const fetchVignettePurchasePoints = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/admin/vignette-purchase-points', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVignettePurchasePoints(res.data);
    } catch (err) {
      setError('Ошибка загрузки пунктов покупки виньеток');
    }
  };

  const handleMapClick = (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    if (mode === 'road') {
      // Режим добавления дороги
      if (points.length >= 2) {
        setError('Админ может добавить только две точки для дороги');
        return;
      }
      const newPoint = {
        latitude: lat,
        longitude: lng,
      };
      setPoints((prevPoints) => {
        const updatedPoints = [...prevPoints, newPoint];
        if (updatedPoints.length === 2) {
          calculateRoute(updatedPoints);
        }
        return updatedPoints;
      });
    } else if (mode === 'vignette') {
      // Режим добавления пункта покупки виньетки
      setNewVignettePoint((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    }
  };

  const calculateRoute = useCallback(async (routePoints) => {
    if (!isLoaded || routePoints.length !== 2) {
      return;
    }

    try {
      const origin = {
        location: { latLng: { latitude: routePoints[0].latitude, longitude: routePoints[0].longitude } },
      };
      const destination = {
        location: { latLng: { latitude: routePoints[1].latitude, longitude: routePoints[1].longitude } },
      };

      const response = await axios.post(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          origin,
          destination,
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
        throw new Error('Маршруты не найдены');
      }

      const routeData = response.data.routes[0];
      const encodedPolyline = routeData.polyline.encodedPolyline;
      const decodedPath = decode(encodedPolyline, 5);
      const path = decodedPath.map(([lat, lng]) => ({ lat: Number(lat), lng: Number(lng) }));
      setRoutePath(path);
      setError('');
    } catch (err) {
      console.error('Ошибка расчета маршрута:', err.response || err);
      setError(`Не удалось рассчитать маршрут: ${err.message}`);
    }
  }, [isLoaded]);

  const handleCreateRoad = async (e) => {
    e.preventDefault();
    if (points.length !== 2) {
      setError('Укажите ровно две точки на карте');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(
        'http://localhost:5000/api/admin/roads',
        {
          name: newRoad.name,
          road_type: newRoad.road_type,
          start_latitude: points[0].latitude,
          start_longitude: points[0].longitude,
          end_latitude: points[1].latitude,
          end_longitude: points[1].longitude,
          description: newRoad.description,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRoads([...roads, res.data]);
      setPoints([]);
      setRoutePath([]);
      setNewRoad({ name: '', road_type: '', description: '' });
      setMapKey(Date.now());
      setError('');
    } catch (err) {
      setError('Ошибка создания дороги: ' + (err.response?.data.message || 'Неизвестная ошибка'));
    }
  };

  const handleCreateVignettePoint = async (e) => {
    e.preventDefault();
    if (!newVignettePoint.latitude || !newVignettePoint.longitude) {
      setError('Выберите точку на карте для пункта покупки виньетки');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(
        'http://localhost:5000/api/admin/vignette-purchase-points',
        {
          latitude: newVignettePoint.latitude,
          longitude: newVignettePoint.longitude,
          name: newVignettePoint.name,
          description: newVignettePoint.description,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVignettePurchasePoints([...vignettePurchasePoints, res.data]);
      setNewVignettePoint({ latitude: '', longitude: '', name: '', description: '' });
      setMapKey(Date.now());
      setError('');
    } catch (err) {
      setError('Ошибка создания пункта покупки виньетки: ' + (err.response?.data.message || 'Неизвестная ошибка'));
    }
  };

  const handleSelectRoad = (road) => {
    setSelectedRoad(road);
    setPoints([
      { latitude: road.start_latitude, longitude: road.start_longitude },
      { latitude: road.end_latitude, longitude: road.end_longitude },
    ]);
    calculateRoute([
      { latitude: road.start_latitude, longitude: road.start_longitude },
      { latitude: road.end_latitude, longitude: road.end_longitude },
    ]);
    setMode('road'); // При выборе дороги переключаем режим на "road"
  };

  const handleClearMap = () => {
    setPoints([]);
    setSelectedRoad(null);
    setRoutePath([]);
    setNewVignettePoint({ latitude: '', longitude: '', name: '', description: '' });
    setMapKey(Date.now());
    setError('');
  };

  const mapCenter =
    routePath.length > 0
      ? { lat: routePath[0].lat, lng: routePath[0].lng }
      : points.length > 0
      ? { lat: points[0].latitude, lng: points[0].longitude }
      : newVignettePoint.latitude
      ? { lat: Number(newVignettePoint.latitude), lng: Number(newVignettePoint.longitude) }
      : selectedRoad
      ? { lat: selectedRoad.start_latitude, lng: selectedRoad.start_longitude }
      : center;

  if (loadError) return <div>Ошибка загрузки Google Maps: {loadError.message}</div>;
  if (!isLoaded) return <div>Загрузка...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Управление дорогами и пунктами покупки виньеток (Админ)</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Переключатель режима */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ marginRight: '10px' }}>
          <input
            type="radio"
            value="road"
            checked={mode === 'road'}
            onChange={() => {
              setMode('road');
              setNewVignettePoint({ latitude: '', longitude: '', name: '', description: '' });
              handleClearMap();
            }}
          />
          Добавить дорогу
        </label>
        <label>
          <input
            type="radio"
            value="vignette"
            checked={mode === 'vignette'}
            onChange={() => {
              setMode('vignette');
              setPoints([]);
              setRoutePath([]);
              setSelectedRoad(null);
              setMapKey(Date.now());
            }}
          />
          Добавить пункт покупки виньетки
        </label>
      </div>

      {/* Форма для создания дороги */}
      {mode === 'road' && (
        <>
          <h3>Добавить новую дорогу</h3>
          <form onSubmit={handleCreateRoad}>
            <input
              type="text"
              value={newRoad.name}
              onChange={(e) => setNewRoad({ ...newRoad, name: e.target.value })}
              placeholder="Название"
              required
              style={{ marginRight: '10px' }}
            />
            <input
              type="text"
              value={newRoad.road_type}
              onChange={(e) => setNewRoad({ ...newRoad, road_type: e.target.value })}
              placeholder="Тип дороги"
              required
              style={{ marginRight: '10px' }}
            />
            <input
              type="text"
              value={newRoad.description}
              onChange={(e) => setNewRoad({ ...newRoad, description: e.target.value })}
              placeholder="Описание"
              required
              style={{ marginRight: '10px' }}
            />
            <button type="submit">Добавить дорогу</button>
          </form>
        </>
      )}

      {/* Форма для создания пункта покупки виньетки */}
      {mode === 'vignette' && (
        <>
          <h3>Добавить пункт покупки виньетки</h3>
          <form onSubmit={handleCreateVignettePoint}>
            <input
              type="number"
              step="0.000001"
              value={newVignettePoint.latitude}
              onChange={(e) => setNewVignettePoint({ ...newVignettePoint, latitude: e.target.value })}
              placeholder="Широта"
              required
              style={{ marginRight: '10px' }}
              disabled={!newVignettePoint.latitude}
            />
            <input
              type="number"
              step="0.000001"
              value={newVignettePoint.longitude}
              onChange={(e) => setNewVignettePoint({ ...newVignettePoint, longitude: e.target.value })}
              placeholder="Долгота"
              required
              style={{ marginRight: '10px' }}
              disabled={!newVignettePoint.longitude}
            />
            <input
              type="text"
              value={newVignettePoint.name}
              onChange={(e) => setNewVignettePoint({ ...newVignettePoint, name: e.target.value })}
              placeholder="Название"
              required
              style={{ marginRight: '10px' }}
            />
            <input
              type="text"
              value={newVignettePoint.description}
              onChange={(e) => setNewVignettePoint({ ...newVignettePoint, description: e.target.value })}
              placeholder="Описание"
              style={{ marginRight: '10px' }}
            />
            <button type="submit">Добавить пункт</button>
          </form>
        </>
      )}

      {/* Карта */}
      <h3>{mode === 'road' ? 'Выберите две точки на карте для дороги' : 'Выберите точку на карте для пункта покупки виньетки'}</h3>
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
        {newVignettePoint.latitude && newVignettePoint.longitude && (
          <Marker
            position={{ lat: Number(newVignettePoint.latitude), lng: Number(newVignettePoint.longitude) }}
            label="N"
            icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png' }} // Желтый маркер для нового пункта
          />
        )}
        {vignettePurchasePoints.map((point) => (
          <Marker
            key={point.id}
            position={{ lat: Number(point.latitude), lng: Number(point.longitude) }}
            label={point.name.substring(0, 1)}
            icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' }} // Зеленый для существующих
          />
        ))}
      </GoogleMap>

      <button onClick={handleClearMap} style={{ marginTop: '10px' }}>
        Очистить карту
      </button>

      {/* Список дорог */}
      <h3>Список дорог</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ background: '#f1f1f1' }}>
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
                <button onClick={() => handleSelectRoad(road)}>Выбрать</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Список пунктов покупки виньеток */}
      <h3>Список пунктов покупки виньеток</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ background: '#f1f1f1' }}>
            <th>ID</th>
            <th>Название</th>
            <th>Широта</th>
            <th>Долгота</th>
            <th>Описание</th>
          </tr>
        </thead>
        <tbody>
          {vignettePurchasePoints.map((point) => (
            <tr key={point.id}>
              <td>{point.id}</td>
              <td>{point.name}</td>
              <td>{point.latitude}</td>
              <td>{point.longitude}</td>
              <td>{point.description || 'Нет описания'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminRoads;