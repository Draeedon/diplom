import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import { decode } from '@googlemaps/polyline-codec';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import './RoutesStyles.css';

const containerStyle = {
  width: '100%',
  height: '400px',
};

const center = { lat: 53.9, lng: 27.5667 }; // Минск

const countryCodeMap = {
  'Belarus': 'BY',
  'Russia': 'RU',
  'Kazakhstan': 'KZ',
  'Armenia': 'AM',
  'Kyrgyzstan': 'KG',
  'Poland': 'PL',
  'Lithuania': 'LT',
  'Latvia': 'LV',
  'Estonia': 'EE',
  'Finland': 'FI',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Germany': 'DE',
  'France': 'FR',
  'Italy': 'IT',
  'Spain': 'ES',
  'Portugal': 'PT',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Austria': 'AT',
  'Switzerland': 'CH',
  'Czech Republic': 'CZ',
  'Slovakia': 'SK',
  'Hungary': 'HU',
  'Romania': 'RO',
  'Bulgaria': 'BG',
  'Greece': 'GR',
  'Serbia': 'RS',
  'Croatia': 'HR',
  'Uzbekistan': 'UZ',
  'Tajikistan': 'TJ',
  'Turkmenistan': 'TM',
  'Afghanistan': 'AF',
  'Pakistan': 'PK',
  'India': 'IN',
  'China': 'CN',
  'Mongolia': 'MN',
  'Japan': 'JP',
  'South Korea': 'KR',
  'Thailand': 'TH',
  'Vietnam': 'VN',
  'Malaysia': 'MY',
  'Indonesia': 'ID',
  'Philippines': 'PH',
  'Turkey': 'TR',
  'Georgia': 'GE',
  'Azerbaijan': 'AZ',
  'Iran': 'IR',
  'Ukraine': 'UA',
  'Moldova': 'MD',
};

const Routes = () => {
  const [vehicles, setVehicles] = useState([]);
  const [roads, setRoads] = useState([]);
  const [roadPaths, setRoadPaths] = useState({});
  const [userRoutes, setUserRoutes] = useState([]);
  const [vignettePurchasePoints, setVignettePurchasePoints] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [routeName, setRouteName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [points, setPoints] = useState([]);
  const [routePath, setRoutePath] = useState([]);
  const [calculations, setCalculations] = useState({
    distance: 0,
    tollCost: 0,
    duration: 0,
    vignettePeriod: null,
  });
  const [error, setError] = useState('');
  const [userCountry, setUserCountry] = useState('');
  const [userCountryCode, setUserCountryCode] = useState('');
  const [mapKey, setMapKey] = useState(Date.now());
  const userType = localStorage.getItem('user_type') || 'individual';
  const role = localStorage.getItem('role') || 'user';
  const [showContractForm, setShowContractForm] = useState(false);
  const [paymentType, setPaymentType] = useState('prepaid'); 
  const [contractNumber, setContractNumber] = useState('');
  const [contractDate, setContractDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleStats, setVehicleStats] = useState(null);
  const [mapCenter, setMapCenter] = useState(center);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyCimrZsxoNqjf7rdEf1JPkabzL2TlTE-iI',
  });

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role === 'driver') {
      fetchDriverRoutes();
      fetchDriverVehicle();
      fetchRoads();
      fetchVignettePurchasePoints();
    } else {
    fetchVehicles();
    fetchRoads();
    fetchUserRoutes();
    fetchUserCountry();
    fetchVignettePurchasePoints();
    }
  }, []);

  const fetchDriverRoutes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Токен авторизации отсутствует');
        return;
      }
      const res = await axios.get('http://localhost:5000/api/auth/driver/routes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Преобразуем маршруты и сохраняем их
      const routes = res.data.map((route) => {
        return {
          ...route,
          total_distance_km: Number(route.total_distance_km) || 0,
          toll_cost: Number(route.toll_cost) || 0,
          duration_minutes: Number(route.duration_minutes) || 0,
          vignette_period: Number(route.vignette_period) || null,
          points: Array.isArray(route.points) ? route.points : [],
        };
      });
      setUserRoutes(routes);

      // Если есть точки маршрута, устанавливаем их
      if (routes.length > 0 && routes[0].points && routes[0].points.length > 0) {
        const firstRoute = routes[0];
        
        const routePoints = firstRoute.points.map(point => ({
          latitude: Number(point.latitude),
          longitude: Number(point.longitude)
        }));
        
        setPoints(routePoints);
        
        // Устанавливаем центр карты на первую точку маршрута
        if (firstRoute.points[0]) {
          const center = {
            lat: Number(firstRoute.points[0].latitude),
            lng: Number(firstRoute.points[0].longitude)
          };
          setMapCenter(center);
        }
      }

      // Загружаем пути для каждого маршрута
      const roadPathsPromises = routes.map(async (route) => {
        if (route.road_id) {
          try {
            const pathRes = await axios.get(`http://localhost:5000/api/auth/roads/${route.road_id}/path`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            if (pathRes.data && pathRes.data.path) {
              const decodedPath = decode(pathRes.data.path);
              
              const pathPoints = decodedPath.map(point => ({
                lat: point[0],
                lng: point[1]
              }));
              
              setRoadPaths(prev => {
                const newPaths = {
                  ...prev,
                  [route.road_id]: pathPoints
                };
                return newPaths;
              });
            }
          } catch (err) {
          }
        }
      });

      await Promise.all(roadPathsPromises);
    } catch (err) {
      setError('Ошибка загрузки маршрутов: ' + (err.response?.data?.message || err.message));
      setUserRoutes([]);
    }
  };

  const fetchDriverVehicle = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Токен авторизации отсутствует');
        return;
      }
      const res = await axios.get('http://localhost:5000/api/auth/driver/vehicle', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVehicles([res.data]);
    } catch (err) {
      setError('Ошибка загрузки автомобиля водителя: ' + (err.response?.data?.message || err.message));
    }
  };

  const fetchUserCountry = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Токен авторизации отсутствует');
        return;
      }
      const role = localStorage.getItem('role');
      if (role === 'driver') {
        const res = await axios.get('http://localhost:5000/api/auth/driver/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
        setUserCountry(res.data.country || '');
        setUserCountryCode(countryCodeMap[res.data.country] || '');
      } else {
        const res = await axios.get('http://localhost:5000/api/auth/user', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserCountry(res.data.country || '');
        setUserCountryCode(countryCodeMap[res.data.country] || '');
      }
    } catch (err) {
      setError('Ошибка доставки данных пользователя: ' + (err.response?.data?.message || err.message));
    }
  };

  const fetchVehicles = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Токен авторизации отсутствует');
        return;
      }

      const response = await axios.get('http://localhost:5000/api/auth/vehicles', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setVehicles(response.data);

      // Подсчет статистики по осям
      if (userType === 'legal') {
        const axleStats = response.data.reduce((acc, vehicle) => {
          const axleCount = vehicle.axle_count || 0;
          acc[axleCount] = (acc[axleCount] || 0) + 1;
          return acc;
        }, {});

        setVehicleStats({
          labels: Object.keys(axleStats).map(count => `${count} осей`),
          datasets: [{
            data: Object.values(axleStats),
            backgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
              '#FF9F40'
            ],
            borderWidth: 1
          }]
        });
      }
    } catch (err) {
      setError('Ошибка при загрузке транспортных средств: ' + err.message);
    }
  }, [userType]);

  const fetchRoads = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Токен авторизации отсутствует');
        return;
      }
      const res = await axios.get('http://localhost:5000/api/auth/roads', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoads(res.data || []);

      const paths = {};
      for (const road of res.data.filter((r) => r.road_type === 'toll')) {
        const path = await fetchRoadPath(road);
        paths[road.road_id] = path;
      }
      setRoadPaths(paths);
    } catch (err) {
      setError('Ошибка загрузки дорог: ' + (err.response?.data?.message || err.message));
    }
  };

  const fetchRoadPath = async (road) => {
    try {
      const response = await axios.post(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          origin: {
            location: {
              latLng: { latitude: Number(road.start_latitude), longitude: Number(road.start_longitude) },
            },
          },
          destination: {
            location: {
              latLng: { latitude: Number(road.end_latitude), longitude: Number(road.end_longitude) },
            },
          },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          computeAlternativeRoutes: false,
          units: 'METRIC',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': 'AIzaSyCimrZsxoNqjf7rdEf1JPkabzL2TlTE-iI',
            'X-Goog-FieldMask': 'routes.polyline.encodedPolyline',
          },
        }
      );

      if (!response.data.routes || response.data.routes.length === 0) {
        return [];
      }

      const encodedPolyline = response.data.routes[0].polyline.encodedPolyline;
      const decodedPath = decode(encodedPolyline, 5);
      return decodedPath.map(([lat, lng]) => ({ lat: Number(lat), lng: Number(lng) }));
    } catch (err) {
      return [];
    }
  };

  const fetchUserRoutes = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Токен авторизации отсутствует');
        return;
      }

      const res = await axios.get('http://localhost:5000/api/auth/routes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setUserRoutes(res.data);
    } catch (err) {
      setError('Ошибка загрузки маршрутов пользователя: ' + (err.response?.data?.message || err.message));
    }
  };

  const fetchVignettePurchasePoints = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Токен авторизации отсутствует');
        return;
      }
      const res = await axios.get('http://localhost:5000/api/auth/vignette-purchase-points', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVignettePurchasePoints(res.data || []);
    } catch (err) {
      setVignettePurchasePoints([]);
    }
  };

  const isPointOnRoad = (point, roadPath) => {
    const tolerance = 0.01;
    return roadPath.some((roadPoint) =>
      Math.abs(roadPoint.lat - point.lat) < tolerance &&
      Math.abs(roadPoint.lng - point.lng) < tolerance
    );
  };

  const calculateRoute = useCallback(async () => {
    if (!isLoaded || points.length < 2 || !userCountryCode) return;

    try {
      const origin = {
        location: { latLng: { latitude: points[0].latitude, longitude: points[0].longitude } },
      };
      const destination = {
        location: {
          latLng: { latitude: points[points.length - 1].latitude, longitude: points[points.length - 1].longitude },
        },
      };
      const intermediates = points.slice(1, -1).map((point) => ({
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
        throw new Error('Маршруты не найдены');
      }

      const routeData = response.data.routes[0];
      const encodedPolyline = routeData.polyline.encodedPolyline;
      const decodedPath = decode(encodedPolyline, 5);
      const path = decodedPath.map(([lat, lng]) => ({ lat: Number(lat), lng: Number(lng) }));
      setRoutePath(path);

      const distanceKm = routeData.distanceMeters / 1000;
      const durationMinutes = Math.round(parseInt(routeData.duration.replace('s', '')) / 60);

      const vehicle = selectedVehicle
        ? vehicles.find((v) => v.vehicle_id === parseInt(selectedVehicle))
        : null;

      let tollCost = 0;
      let vignettePeriod = null;
      const tollRoadsUsed = Object.keys(roadPaths).filter((roadId) => {
        const roadPath = roadPaths[roadId];
        return path.some((point) => isPointOnRoad(point, roadPath));
      });

      // Рассчитываем период виньетки и стоимость для физических лиц из ЕАЭС с авто <= 3.5т
      const eaesCountries = ['BY', 'RU', 'KZ', 'AM', 'KG'];
      const isEaesCountry = eaesCountries.includes(userCountryCode);
      const tonnage = vehicle ? parseFloat(vehicle.tonnage) || 0 : 0;
      if (
        userType === 'individual' &&
        isEaesCountry &&
        tonnage > 0 &&
        tonnage <= 2.5
      ) {
        tollCost = 0;
        vignettePeriod = null;
        setCalculations({
          distance: distanceKm,
          tollCost: tollCost,
          duration: durationMinutes,
          vignettePeriod: vignettePeriod,
        });
        return;
      }
      // Рассчитываем период виньетки для физических лиц на основе дат
      else if (userType === 'individual' && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
          throw new Error('Неверные даты');
        }
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        if (diffDays <= 9) vignettePeriod = 15;
        else if (diffDays <= 25) vignettePeriod = 30;
        else vignettePeriod = 365;
        const vignetteCosts = { 15: 20, 30: 31, 365: 107 };
        tollCost = vignetteCosts[vignettePeriod] || 0;
      }
      // Рассчитываем стоимость для платных дорог для юрлиц
      else if (tollRoadsUsed.length > 0 && vehicle) {
        const axles = parseInt(vehicle.axles) || 0;
        if (userType === 'legal' && tonnage <= 3.5) {
          const vignetteCosts = { 15: 20, 30: 31, 365: 107 };
          tollCost = vignetteCosts[15] || 0;
        } else if (userType === 'legal' && tonnage > 3.5) {
          const distance = parseFloat(distanceKm) || 0;
          if (axles === 2) tollCost = distance * 0.114;
          else if (axles === 3) tollCost = distance * 0.142;
          else if (axles >= 4) tollCost = distance * 0.171;
          else tollCost = 0;
        }
      }

      setCalculations({
        distance: distanceKm,
        tollCost: tollCost,
        duration: durationMinutes,
        vignettePeriod: vignettePeriod,
      });
    } catch (err) {
      setError(`Не удалось рассчитать маршрут: ${err.message}`);
    }
  }, [isLoaded, points, selectedVehicle, vehicles, roadPaths, startDate, endDate, userCountryCode, userType]);

  useEffect(() => {
    calculateRoute();
  }, [points, calculateRoute]);

  const handleMapClick = (e) => {
    if (points.length >= 2) {
      setPoints((prevPoints) => [prevPoints[0], { latitude: e.latLng.lat(), longitude: e.latLng.lng() }]);
    } else {
      setPoints((prevPoints) => [
        ...prevPoints,
        { latitude: e.latLng.lat(), longitude: e.latLng.lng() },
      ]);
    }
  };

  const handleSaveRoute = async () => {
    try {
      if (!selectedVehicle) {
        setError('Выберите автомобиль');
        return;
      }

      if (points.length < 2) {
        setError('Добавьте как минимум две точки маршрута');
        return;
      }

      if (!routeName) {
        setError('Введите название маршрута');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Токен авторизации отсутствует');
        return;
      }

      // Создаем маршрут
      const routeRes = await axios.post(
        'http://localhost:5000/api/auth/routes',
        {
          vehicle_id: parseInt(selectedVehicle),
          name: routeName,
          start_date: startDate || null,
          end_date: endDate || null,
          total_distance_km: parseFloat(calculations.distance) || 0,
          toll_cost: parseFloat(calculations.tollCost) || 0,
          duration_minutes: parseInt(calculations.duration) || 0,
          vignette_period: calculations.vignettePeriod ? parseInt(calculations.vignettePeriod) : null,
          payment_type: paymentType || 'prepaid',
          contract_number: contractNumber || null,
          contract_date: contractDate || null
        },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      const routeId = routeRes.data.route_id;

      // Подготавливаем точки маршрута
      const pointsData = {
        points: points.map((point, index) => {
          // Унифицируем: если есть latitude/longitude — используем их, иначе lat/lng
          const latitude = point.latitude !== undefined ? point.latitude : point.lat;
          const longitude = point.longitude !== undefined ? point.longitude : point.lng;
          const pointData = {
            point_order: index + 1,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude)
          };
          return pointData;
        })
      };

      // Сохраняем точки маршрута
      const pointsRes = await axios.post(
        `http://localhost:5000/api/auth/routes/${routeId}/points`,
        pointsData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      // Очищаем форму
      setRouteName('');
      setStartDate('');
      setEndDate('');
      setPoints([]);
      setRoutePath([]);
      setCalculations({
        distance: 0,
        tollCost: 0,
        duration: 0,
        vignettePeriod: null
      });
      setSelectedVehicle('');
      setPaymentType('prepaid');
      setContractNumber('');
      setContractDate(new Date().toISOString().split('T')[0]);

      // Обновляем список маршрутов
      fetchUserRoutes();

      alert('Маршрут успешно сохранен');
    } catch (err) {
      setError('Ошибка сохранения маршрута: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleClearMap = () => {
    setPoints([]);
    setRoutePath([]);
    setRouteName('');
    setSelectedVehicle('');
    setStartDate('');
    setEndDate('');
    setCalculations({ distance: 0, tollCost: 0, duration: 0, vignettePeriod: null });
    setError('');
    setMapKey(Date.now());
  };

  const exportRouteToWord = (route) => {
    const doc = new Document({
      sections: [
        {
          properties: { title: 'Маршрут' },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Маршрут: ${route.name}`,
                  bold: true,
                  size: 28,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun(`ID маршрута: ${route.route_id || 'Не указан'}`),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun(`Расстояние: ${route.total_distance_km.toFixed(2)} км`),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun(`Стоимость платных дорог: ${route.toll_cost.toFixed(2)} евро`),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun(`Время в пути: ${route.duration_minutes} мин`),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun(`Период виньетки: ${route.vignette_period ? `${route.vignette_period} дней` : 'N/A'}`),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Точки маршрута:',
                  bold: true,
                }),
              ],
            }),
            ...route.points.map((point) =>
              new Paragraph({
                children: [
                  new TextRun(`Точка ${point.point_order}: (${(!isNaN(Number(point.latitude)) ? Number(point.latitude).toFixed(4) : '—')}, ${(!isNaN(Number(point.longitude)) ? Number(point.longitude).toFixed(4) : '—')})`),
                ],
              })
            ),
          ],
        },
      ],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, `${route.name}_route.docx`);
    }).catch((err) => {
      setError('Не удалось экспортировать маршрут в Word');
    });
  };

  const generateReport = async () => {
    if (!reportDate) {
      setError('Выберите дату для отчета');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Токен авторизации отсутствует');
        return;
      }

      const res = await axios.get(`http://localhost:5000/api/auth/routes/report?date=${reportDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Создаем документ Word
      const doc = new Document({
        sections: [
          {
            properties: { title: 'Отчет по маршрутам' },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Отчет по маршрутам за ${new Date(reportDate).toLocaleDateString('ru-RU')}`,
                    bold: true,
                    size: 28,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Количество маршрутов: ${res.data.length}`,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Детали маршрутов:',
                    bold: true,
                    size: 24,
                  }),
                ],
              }),
              ...res.data.map((route) => [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Маршрут: ${route.name}`,
                      bold: true,
                      size: 24,
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun(`ID маршрута: ${route.route_id}`),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun(`Расстояние: ${route.total_distance_km.toFixed(2)} км`),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun(`Стоимость платных дорог: ${route.toll_cost.toFixed(2)} евро`),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun(`Время в пути: ${route.duration_minutes} мин`),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun(`Период виньетки: ${userType === 'individual' ? (
                      (() => {
                        if (route.vignette_period) return `${route.vignette_period} дней`;
                        if (route.start_date && route.end_date) {
                          const start = new Date(route.start_date);
                          const end = new Date(route.end_date);
                          const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                          if (diffDays <= 9) return '15 дней';
                          if (diffDays <= 25) return '30 дней';
                          return '365 дней';
                        }
                        return 'N/A';
                      })()
                    ) : (
                      route.vignette_period ? `${route.vignette_period} дней` : 'N/A'
                    )}`),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Точки маршрута:',
                      bold: true,
                    }),
                  ],
                }),
                ...route.points.map((point) =>
                  new Paragraph({
                    children: [
                      new TextRun(`Точка ${point.point_order}: (${(!isNaN(Number(point.latitude)) ? Number(point.latitude).toFixed(4) : '—')}, ${(!isNaN(Number(point.longitude)) ? Number(point.longitude).toFixed(4) : '—')})`),
                    ],
                  })
                ),
                new Paragraph({ children: [new TextRun('')] }), // Пустая строка между маршрутами
              ]).flat(),
            ],
          },
        ],
      });

      Packer.toBlob(doc).then((blob) => {
        saveAs(blob, `report_${reportDate}.docx`);
      }).catch(err => {
        setError('Ошибка при сохранении файла: ' + err.message);
      });
    } catch (err) {
      setError('Ошибка формирования отчета: ' + (err.response?.data?.message || err.message));
    }
  };

  const generateContract = async (route) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Токен авторизации отсутствует');
        return;
      }

      // Получаем данные компании
      const userRes = await axios.get('http://localhost:5000/api/auth/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = userRes.data;

      if (userData.user_type !== 'legal') {
        setError('Договор доступен только для юридических лиц');
        return;
      }

      const doc = new Document({
        sections: [
          {
            properties: { title: 'Договор на оказание услуг по проезду по платным автомобильным дорогам' },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'ДОГОВОР № ' + contractNumber,
                    bold: true,
                    size: 28,
                  }),
                ],
                alignment: 'center',
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `г. Минск ${contractDate}`,
                    size: 24,
                  }),
                ],
                alignment: 'center',
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'ООО "Белтолл", именуемое в дальнейшем "Исполнитель", в лице директора Иванова И.И., действующего на основании Устава, с одной стороны, и',
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${userData.company_name}, именуемое в дальнейшем "Заказчик", в лице директора Петрова П.П., действующего на основании Устава, с другой стороны,`,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'заключили настоящий договор о нижеследующем:',
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '1. ПРЕДМЕТ ДОГОВОРА',
                    bold: true,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '1.1. Исполнитель обязуется предоставить Заказчику право проезда по платным автомобильным дорогам Республики Беларусь.',
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '1.2. Маршрут: ' + route.name,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '1.3. Расстояние: ' + route.total_distance_km.toFixed(2) + ' км',
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '1.4. Стоимость услуг: ' + route.toll_cost.toFixed(2) + ' евро',
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '2. ПОРЯДОК ОПЛАТЫ',
                    bold: true,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '2.1. Заказчик оплачивает услуги до начала оказания услуг в размере 100% от стоимости услуг.'
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '3. СРОК ДЕЙСТВИЯ ДОГОВОРА',
                    bold: true,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '3.1. Настоящий договор вступает в силу с момента подписания и действует до полного исполнения сторонами своих обязательств.',
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '4. ОТВЕТСТВЕННОСТЬ СТОРОН',
                    bold: true,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '4.1. За неисполнение или ненадлежащее исполнение обязательств по настоящему договору стороны несут ответственность в соответствии с законодательством Республики Беларусь.',
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '5. РЕКВИЗИТЫ СТОРОН',
                    bold: true,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Исполнитель: ООО "Белтолл"\nУНП: 1234567890\nр/с: BY12ALFA1234567890\nв ОАО "Альфа-Банк"\nБИК: ALFABY2X\n220013, г. Минск, ул. Немига, 5',
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Заказчик: ${userData.company_name}\nУНП: ${userData.company_id}\nр/с: BY12ALFA0987654321\nв ОАО "Альфа-Банк"\nБИК: ALFABY2X\n220013, г. Минск, ул. Немига, 5`,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '6. ПОДПИСИ СТОРОН',
                    bold: true,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Исполнитель: _________________ / Цалко И.М. /',
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Заказчик: _________________ / Фамилия И.О. /`,
                    size: 24,
                  }),
                ],
              }),
            ],
          },
        ],
      });

      Packer.toBlob(doc).then((blob) => {
        saveAs(blob, `contract_${route.name}_${contractNumber}.docx`);
      });
    } catch (err) {
      setError('Ошибка при создании договора: ' + err.message);
    }
  };

  const handlePayRoute = async (routeId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `http://localhost:5000/api/auth/driver/routes/${routeId}/pay`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Обновляем список маршрутов после успешной оплаты
      setUserRoutes(prevRoutes => prevRoutes.filter(route => route.route_id !== routeId));
      setError('');
      alert(res.data.message);
    } catch (err) {
      if (err.response?.status === 400) {
        setError(`Недостаточно средств. Требуется: ${err.response.data.required}€, Доступно: ${err.response.data.available}€`);
      } else {
        setError(err.response?.data.message || 'Ошибка при оплате маршрута');
      }
    }
  };

  // Обновляем useEffect для обновления карты при изменении roadPaths
  useEffect(() => {
    if (Object.keys(roadPaths).length > 0) {
      setMapKey(Date.now());
    }
  }, [roadPaths]);

  // Добавляем useEffect для логирования изменений points
  useEffect(() => {
  }, [points]);

  // Добавляем useEffect для логирования изменений mapCenter
  useEffect(() => {
  }, [mapCenter]);

  useEffect(() => {
    // Для водителя: если есть две точки, строим маршрут через Directions API
    if (role === 'driver' && points.length === 2 && isLoaded) {
      (async () => {
        try {
          const origin = {
            location: { latLng: { latitude: points[0].latitude, longitude: points[0].longitude } },
          };
          const destination = {
            location: { latLng: { latitude: points[1].latitude, longitude: points[1].longitude } },
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
                'X-Goog-FieldMask': 'routes.polyline.encodedPolyline',
              },
            }
          );
          if (response.data.routes && response.data.routes[0]) {
            const encodedPolyline = response.data.routes[0].polyline.encodedPolyline;
            const decodedPath = decode(encodedPolyline, 5);
            setRoutePath(decodedPath.map(([lat, lng]) => ({ lat: Number(lat), lng: Number(lng) })));
          }
        } catch (err) {
          setRoutePath([]);
        }
      })();
    }
  }, [role, points, isLoaded]);

  if (loadError) return <div className="error-message">Ошибка загрузки Google Maps: {loadError.message}</div>;
  if (!isLoaded) return <div className="loading">Загрузка...</div>;

  return (
    <div className="routes-container">
      <div className="date-info">
        <p>Текущая дата: {new Date().toLocaleDateString('ru-RU')}</p>
      </div>
      <h2 className="routes-title">{role === 'driver' ? 'Ваши маршруты' : 'Создание маршрута'}</h2>
      {error && <p className="error-message">{error}</p>}

      {/* Форма создания маршрута - скрывать для водителя */}
      {role !== 'driver' && (
      <div className="routes-form">
        <div className="form-group">
          <label>Название маршрута</label>
          <input
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            className="form-input"
            placeholder="Введите название"
          />
        </div>
        <div className="form-group">
          <label>Выберите автомобиль</label>
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="form-select"
          >
            <option value="">Выберите (опционально)</option>
              {Array.isArray(vehicles) && vehicles.length > 0 ? (
              vehicles.map((v) => (
                <option key={v.vehicle_id} value={v.vehicle_id}>
                  {v.license_plate} ({v.type === 'passenger' ? 'Легковой' : 'Грузовой'}, {v.tonnage} т, {v.axles} осей)
                </option>
              ))
            ) : (
              <option disabled>Нет доступных автомобилей</option>
            )}
          </select>
        </div>
        {userType === 'individual' && (
          <>
            <div className="form-group">
              <label>Дата начала использования платных дорог</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Дата окончания использования платных дорог</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-input"
              />
            </div>
            {startDate && endDate && (
              <div className="vignette-info">
                {(() => {
                  const start = new Date(startDate);
                  const end = new Date(endDate);
                  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
                    return <p className="error-message">Неверные даты</p>;
                  }
                  const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                  let vignetteInfo = '';
                  if (diffDays <= 9) {
                    vignetteInfo = '15-дневная виньетка (20 евро)';
                  } else if (diffDays <= 25) {
                    vignetteInfo = '30-дневная виньетка (31 евро)';
                  } else {
                    vignetteInfo = 'Годовая виньетка (107 евро)';
                  }
                  return (
                    <div>
                      <p>Количество дней использования: {diffDays}</p>
                      <p>Будет выбрана: {vignetteInfo}</p>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </div>
      )}

      <div className="map-container">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={10}
          onClick={role !== 'driver' ? handleMapClick : undefined}
          key={mapKey}
        >
          {Object.keys(roadPaths || {}).map((roadId) => (
            <Polyline
              key={roadId}
              path={roadPaths[roadId]}
              options={{
                strokeColor: '#0000FF',
                strokeOpacity: 0.6,
                strokeWeight: 4,
              }}
            />
          ))}
          {Array.isArray(points) && points.map((point, index) => (
            <Marker
              key={index}
              position={{ lat: Number(point.latitude), lng: Number(point.longitude) }}
              label={index === 0 ? 'A' : index === 1 ? 'B' : ''}
            />
          ))}
          {Array.isArray(routePath) && routePath.length > 0 && (
            <Polyline
              path={routePath}
              options={{
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 2,
              }}
            />
          )}
          {Array.isArray(vignettePurchasePoints) && vignettePurchasePoints.map((point) => (
            <Marker
              key={point.id}
              position={{ lat: Number(point.latitude), lng: Number(point.longitude) }}
              label={point.name?.substring(0, 1)}
              options={{
                icon: {
                  url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                },
              }}
            />
          ))}
        </GoogleMap>
      </div>

      {calculations.distance > 0 && (
        <div className="results">
          <h3 className="results-title">Результаты</h3>
          <p>Расстояние: {calculations.distance.toFixed(2)} км</p>
          <p>Стоимость платных дорог: {(parseFloat(calculations.tollCost) || 0.0).toFixed(2)} евро</p>
          <p>Время: {calculations.duration} мин</p>
          {/* Отображение периода виньетки */}
          <div className="route-info">
            <span>Период виньетки: </span>
            {calculations.vignettePeriod ? `${calculations.vignettePeriod} дней` : (userType === 'individual' && ['BY','RU','KZ','AM','KG'].includes(userCountryCode) && selectedVehicle && parseFloat(vehicles.find(v => v.vehicle_id === parseInt(selectedVehicle))?.tonnage) <= 2.5 ? '-' : 'N/A')}
          </div>
        </div>
      )}

      {/* Кнопки действий - скрывать для водителя */}
      {role !== 'driver' && (
      <div className="actions">
        <button onClick={handleSaveRoute} className="save-button">Сохранить маршрут</button>
        <button onClick={handleClearMap} className="clear-button">Очистить карту</button>
      </div>
      )}

      {/* Секция формирования отчета - скрывать для водителя */}
      {role !== 'driver' && (
      <div className="report-section">
        <h3 className="routes-subtitle">Формирование отчета</h3>
        <div className="report-form">
          <div className="form-group">
            <label>Выберите дату для отчета</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="form-input"
            />
          </div>
          <button onClick={generateReport} className="report-button">
            Сформировать отчет
          </button>
        </div>
      </div>
      )}

      {userType === 'legal' && (
        <div className="contract-section">
          <h3>Создание договора</h3>
          <div className="contract-form">
            <div className="form-group">
              <label>Номер договора</label>
              <input
                type="text"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                className="form-input"
                placeholder="Введите номер договора"
              />
            </div>
            <div className="form-group">
              <label>Дата договора</label>
              <input
                type="date"
                value={contractDate}
                onChange={(e) => setContractDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Тип оплаты</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="form-select"
              >
                <option value="prepaid">Предоплата</option>
                <option value="postpaid">Оплата по факту</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <h3 className="routes-subtitle">Ваши маршруты</h3>
      {userRoutes.length > 0 ? (
        <table className="routes-table">
          <thead>
            <tr>

              <th>Название</th>
              <th>Расстояние (км)</th>
              <th>Стоимость платных дорог (евро)</th>
              <th>Время (мин)</th>
              <th>Период виньетки (дни)</th>
              <th>Точки</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {userRoutes.map((route) => (
              <tr key={route.route_id}>
                <td>{route.name}</td>
                <td>{route.total_distance_km.toFixed(2)}</td>
                <td>{route.toll_cost.toFixed(2)}</td>
                <td>{route.duration_minutes}</td>
                <td>
                  {userType === 'individual' ? (
                    (() => {
                      if (route.vignette_period) return `${route.vignette_period} дней`;
                      if (route.start_date && route.end_date) {
                        const start = new Date(route.start_date);
                        const end = new Date(route.end_date);
                        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                        if (diffDays <= 9) return '15 дней';
                        if (diffDays <= 25) return '30 дней';
                        return '365 дней';
                      }
                      return 'N/A';
                    })()
                  ) : (
                    route.vignette_period ? `${route.vignette_period} дней` : 'N/A'
                  )}
                </td>
                <td>
                  {Array.isArray(route.points) && route.points.map((point) => (
                    <div key={point.point_order}>
                      {(!isNaN(Number(point.latitude)) ? Number(point.latitude).toFixed(4) : '—')}, {(!isNaN(Number(point.longitude)) ? Number(point.longitude).toFixed(4) : '—')}
                    </div>
                  ))}
                </td>
                <td>
                  <button onClick={() => exportRouteToWord(route)} className="export-button">
                    Экспорт в Word
                  </button>
                  {userType === 'legal' && (
                    <button 
                      onClick={() => generateContract(route)} 
                      className="action-button"
                      disabled={!contractNumber}
                    >
                      Создать договор
                    </button>
                  )}
                  {role === 'driver' && (
                    <button 
                      onClick={() => handlePayRoute(route.route_id)}
                      className="pay-button"
                    >
                      Оплатить маршрут
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="no-routes">У вас пока нет сохраненных маршрутов.</p>
      )}
    </div>
  );
};

export default Routes;