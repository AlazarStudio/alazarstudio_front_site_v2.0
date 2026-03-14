'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Route, ExternalLink } from 'lucide-react';

const DEFAULT_CENTER = [43.5, 41.7];
const DEFAULT_ZOOM = 10;
const DEFAULT_SINGLE_POINT_ZOOM = 14;
const SCRIPT_ID = 'yandex-maps-script-2-1';
const MAP_HEIGHT = 400;

function buildYandexRouteUrlMulti(points) {
  if (points.length === 0) return 'https://yandex.ru/maps/';
  const rtext = points.map((p) => `${p[0]},${p[1]}`).join('~');
  return `https://yandex.ru/maps/?rtext=${encodeURIComponent(rtext)}&rtt=auto`;
}

function getDefaultControls(showRouteFromMe) {
  const controls = ['zoomControl', 'typeSelector', 'fullscreenControl'];
  if (showRouteFromMe) controls.push('geolocationControl');
  return controls;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export default function YandexMapRoute({
  places = [],
  height = MAP_HEIGHT,
  className,
  showRouteFromMe = false,
  onPlacemarkClick,
  mapControls,
  markerType = 'numbered',
  markerPreset = 'islands#pinkCircleDotIcon',
  markerColor = '#e5097f',
  singlePointZoom = DEFAULT_SINGLE_POINT_ZOOM,
  controlPositions,
  restrictMapArea,
  minZoom,
  maxZoom,
  onMapReady,
}) {
  const containerRef = useRef(null);
  const mapWrapperRef = useRef(null);
  const mapRef = useRef(null);
  const placemarksRef = useRef([]);
  const routeRef = useRef(null);
  const routeFromMeRef = useRef(null);
  const userCoordsRef = useRef(null);
  const onPlacemarkClickRef = useRef(onPlacemarkClick);
  onPlacemarkClickRef.current = onPlacemarkClick;
  const onMapReadyRef = useRef(onMapReady);
  onMapReadyRef.current = onMapReady;

  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState(null);
  const [routeStatus, setRouteStatus] = useState(null);
  const [routeBuiltFromMe, setRouteBuiltFromMe] = useState(false);

  const pointsWithCoords = places.filter(
    (p) =>
      p &&
      p.latitude != null &&
      p.longitude != null &&
      Number(p.latitude) &&
      Number(p.longitude)
  );
  const coordsOrdered = pointsWithCoords.map((p) => [Number(p.latitude), Number(p.longitude)]);

  const controlsToUse = useMemo(() => {
    if (Array.isArray(mapControls) && mapControls.length > 0) return mapControls;
    return getDefaultControls(showRouteFromMe);
  }, [mapControls, showRouteFromMe]);

  const coordsDep = JSON.stringify(coordsOrdered.map((c) => c.join(',')));
  const controlsDep = controlsToUse.join('|');
  const controlPositionsDep = JSON.stringify(controlPositions || {});
  const restrictMapAreaDep = JSON.stringify(restrictMapArea || null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY || '';
    const lang = 'ru_RU';

    if (window.ymaps && window.ymaps.ready) {
      setScriptReady(true);
      return;
    }

    if (document.getElementById(SCRIPT_ID)) {
      if (window.ymaps && window.ymaps.ready) {
        window.ymaps.ready(() => setScriptReady(true));
      } else {
        const check = setInterval(() => {
          if (window.ymaps && window.ymaps.ready) {
            clearInterval(check);
            window.ymaps.ready(() => setScriptReady(true));
          }
        }, 100);
        return () => clearInterval(check);
      }
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=${lang}`;
    script.async = true;
    script.onload = () => {
      window.ymaps.ready(() => setScriptReady(true));
    };
    script.onerror = () => setError('Не удалось загрузить Яндекс.Карты');
    document.head.appendChild(script);

    return () => {
      if (mapRef.current && mapRef.current.destroy) {
        if (typeof onMapReadyRef.current === 'function') {
          onMapReadyRef.current(null);
        }
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || !window.ymaps) return;

    setRouteBuiltFromMe(false);
    userCoordsRef.current = null;

    const mapOptions = {
      suppressMapOpenBlock: true,
      ...(Array.isArray(restrictMapArea) && restrictMapArea.length === 2 ? { restrictMapArea } : {}),
      ...(isFiniteNumber(minZoom) ? { minZoom } : {}),
      ...(isFiniteNumber(maxZoom) ? { maxZoom } : {}),
    };

    const map = new window.ymaps.Map(
      containerRef.current,
      {
        center: coordsOrdered.length ? coordsOrdered[0] : DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        controls: controlsToUse,
      },
      mapOptions
    );

    mapRef.current = map;
    if (typeof onMapReadyRef.current === 'function') {
      onMapReadyRef.current(map);
    }

    const zoomControlPosition = controlPositions?.zoomControl;
    const searchControlPosition = controlPositions?.searchControl;

    const zoomControl = map.controls.get('zoomControl');
    if (zoomControl) {
      if (zoomControlPosition) {
        zoomControl.options.set('position', zoomControlPosition);
      }
      zoomControl.options.set('size', 'large');
    }

    if (Array.isArray(restrictMapArea) && restrictMapArea.length === 2) {
      map.options.set('restrictMapArea', restrictMapArea);
    }

    if (isFiniteNumber(minZoom)) {
      map.options.set('minZoom', minZoom);
    }

    if (isFiniteNumber(maxZoom)) {
      map.options.set('maxZoom', maxZoom);
    }

    const searchControl = map.controls.get('searchControl');
    if (searchControl) {
      if (searchControlPosition) {
        searchControl.options.set('position', searchControlPosition);
      }
      searchControl.options.set('noPlacemark', true);
      searchControl.options.set('placeholderContent', '');
    }

    const placemarks = [];
    const useNumberedMarkers = markerType === 'numbered';

    if (pointsWithCoords.length > 0) {
      pointsWithCoords.forEach((place, index) => {
        const coords = [Number(place.latitude), Number(place.longitude)];
        const title = place.title || 'Точка';

        const placemark = new window.ymaps.Placemark(
          coords,
          {
            balloonContent: onPlacemarkClick ? '' : `<strong>${useNumberedMarkers ? `${index + 1}. ` : ''}${title}</strong>`,
            ...(useNumberedMarkers ? { iconContent: String(index + 1) } : {}),
          },
          useNumberedMarkers
            ? {
                preset: 'islands#blueCircleIcon',
                iconContentLayout: window.ymaps.templateLayoutFactory.createClass(
                  '<div style="color:#fff;font-weight:700;font-size:14px;line-height:1;margin-top:4px;">$[properties.iconContent]</div>'
                ),
              }
            : {
                preset: markerPreset,
                iconColor: markerColor,
              }
        );

        if (typeof onPlacemarkClickRef.current === 'function') {
          placemark.events.add('click', () => onPlacemarkClickRef.current?.(place));
        }

        map.geoObjects.add(placemark);
        placemarks.push(placemark);
      });

      if (coordsOrdered.length >= 2) {
        const requireModules = window.ymaps.modules?.require;

        if (typeof requireModules === 'function') {
          requireModules(['multiRouter.MultiRoute'], (MultiRoute) => {
            if (!mapRef.current) return;

            if (routeRef.current) {
              mapRef.current.geoObjects.remove(routeRef.current);
              routeRef.current = null;
            }

            const multiRoute = new MultiRoute(
              {
                referencePoints: coordsOrdered,
                params: { routingMode: 'auto' },
              },
              {
                boundsAutoApply: true,
                routeActiveStrokeColor: '#00BF00',
                routeActiveStrokeWidth: 5,
                routeStrokeColor: '#80BF8066',
                routeStrokeWidth: 4,
              }
            );

            mapRef.current.geoObjects.add(multiRoute);
            routeRef.current = multiRoute;
          });
        } else {
          const polyline = new window.ymaps.Polyline(coordsOrdered, {}, {
            strokeColor: '#00BF00',
            strokeWidth: 4,
            strokeOpacity: 0.8,
          });

          map.geoObjects.add(polyline);
          routeRef.current = polyline;
          map.setBounds(window.ymaps.util.bounds.fromPoints(coordsOrdered), {
            checkZoomRange: true,
            zoomMargin: 50,
          });
        }
      }

      if (coordsOrdered.length === 1) {
        map.setCenter(coordsOrdered[0], Number(singlePointZoom) || DEFAULT_SINGLE_POINT_ZOOM);
      } else if (coordsOrdered.length >= 2 && typeof window.ymaps.modules?.require !== 'function') {
        map.setBounds(window.ymaps.util.bounds.fromPoints(coordsOrdered), {
          checkZoomRange: true,
          zoomMargin: 50,
        });
      }
    }

    placemarksRef.current = placemarks;

    return () => {
      placemarks.forEach((pm) => map.geoObjects.remove(pm));
      placemarksRef.current = [];

      if (routeRef.current && mapRef.current) {
        mapRef.current.geoObjects.remove(routeRef.current);
        routeRef.current = null;
      }

      if (routeFromMeRef.current && mapRef.current) {
        mapRef.current.geoObjects.remove(routeFromMeRef.current);
        routeFromMeRef.current = null;
      }

      if (mapRef.current && mapRef.current.destroy) {
        if (typeof onMapReadyRef.current === 'function') {
          onMapReadyRef.current(null);
        }
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [
    scriptReady,
    showRouteFromMe,
    coordsDep,
    controlsDep,
    markerType,
    markerPreset,
    markerColor,
    singlePointZoom,
    controlPositionsDep,
    restrictMapAreaDep,
    minZoom,
    maxZoom,
  ]);

  const handleBuildRoute = () => {
    if (!scriptReady || !window.ymaps || !mapRef.current || coordsOrdered.length === 0) return;

    setRouteStatus('loading');

    if (!navigator.geolocation) {
      setRouteStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const fromLat = position.coords.latitude;
        const fromLon = position.coords.longitude;
        userCoordsRef.current = { lat: fromLat, lon: fromLon };

        const referencePoints = [[fromLat, fromLon], coordsOrdered[0]];
        const requireModules = window.ymaps.modules?.require;

        if (typeof requireModules === 'function') {
          requireModules(['multiRouter.MultiRoute'], (MultiRoute) => {
            if (!mapRef.current) return;

            if (routeFromMeRef.current) {
              mapRef.current.geoObjects.remove(routeFromMeRef.current);
              routeFromMeRef.current = null;
            }

            const multiRoute = new MultiRoute(
              { referencePoints, params: { routingMode: 'auto' } },
              {
                boundsAutoApply: true,
                routeActiveStrokeColor: '#0066cc',
                routeActiveStrokeWidth: 5,
                routeStrokeColor: '#0066cc66',
                routeStrokeWidth: 4,
              }
            );

            mapRef.current.geoObjects.add(multiRoute);
            routeFromMeRef.current = multiRoute;
            setRouteBuiltFromMe(true);
            setRouteStatus('ready');
          });
        } else {
          setRouteBuiltFromMe(true);
          setRouteStatus('ready');
        }
      },
      () => setRouteStatus('denied')
    );
  };

  const handleOpenYandexMaps = () => {
    const user = userCoordsRef.current;
    const points = user ? [[user.lat, user.lon], ...coordsOrdered] : coordsOrdered;
    window.open(buildYandexRouteUrlMulti(points), '_blank', 'noopener,noreferrer');
  };

  if (error) {
    return (
      <div
        className={className}
        style={{
          height,
          background: '#f1f5f9',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
        }}
      >
        {error}. Укажите VITE_YANDEX_MAPS_API_KEY.
      </div>
    );
  }

  if (!scriptReady) {
    return (
      <div
        className={className}
        style={{
          height,
          background: '#f1f5f9',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
        }}
      >
        Загрузка карты...
      </div>
    );
  }

  if (places.length === 0) {
    return (
      <div
        className={className}
        style={{
          height,
          background: '#f8fafc',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontSize: '0.9375rem',
        }}
      >
        Добавьте места на маршрут — карта покажет точки и путь между ними.
      </div>
    );
  }

  if (pointsWithCoords.length === 0) {
    return (
      <div
        className={className}
        style={{
          height,
          background: '#f8fafc',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontSize: '0.9375rem',
        }}
      >
        У выбранных мест нет координат. Укажите широту и долготу в карточках мест.
      </div>
    );
  }

  const overlayStyle = {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 6,
    background: 'rgba(255,255,255,0.95)',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    zIndex: 1,
  };

  const iconBtnStyle = {
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    background: '#fff',
    cursor: 'pointer',
    color: '#475569',
  };

  if (!showRouteFromMe) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{ width: '100%', height, borderRadius: 8, overflow: 'hidden' }}
      />
    );
  }

  return (
    <div className={className}>
      <div ref={mapWrapperRef} style={{ position: 'relative', width: '100%', height, borderRadius: 8, overflow: 'hidden' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        <div style={overlayStyle}>
          <button
            type="button"
            onClick={handleBuildRoute}
            disabled={routeStatus === 'loading'}
            title={routeStatus === 'loading' ? 'Определяем местоположение...' : 'Построить маршрут от моего местоположения'}
            style={{
              ...iconBtnStyle,
              cursor: routeStatus === 'loading' ? 'wait' : 'pointer',
              opacity: routeStatus === 'loading' ? 0.7 : 1,
            }}
          >
            <Route size={20} strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={handleOpenYandexMaps}
            title="Открыть в Яндекс.Картах"
            style={iconBtnStyle}
          >
            <ExternalLink size={20} strokeWidth={2} />
          </button>
        </div>
      </div>

      {routeStatus === 'denied' && (
        <p style={{ marginTop: 8, fontSize: '0.85rem', color: '#dc2626' }}>
          Доступ к геолокации запрещен. Разрешите доступ или откройте карту в приложении Яндекс.
        </p>
      )}
    </div>
  );
}
