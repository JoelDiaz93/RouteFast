import L, { type LayerGroup, type Map as LeafletMap, type TileLayer } from 'leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Language, TranslationKey } from '../i18n';
import { translate } from '../i18n';
import type { DriverLocation, Order, PlannedStop } from '../types';

export type MapTheme = 'light' | 'dark';
export type RouteMode = 'driver' | 'optimization';

interface LiveMapProps {
  locations: DriverLocation[];
  orders?: Order[];
  stops?: PlannedStop[];
  language?: Language;
  selectedDriverId?: string;
  history?: DriverLocation[];
  theme?: MapTheme;
  routeMode?: RouteMode;
  onDriverSelect?: (driverId: string) => void;
  routeEtaMinutes?: number | null;
  routeDistanceKm?: number | null;
}

type PointKind = 'driver' | 'pickup' | 'dropoff' | 'route';

interface MapPoint {
  latitude: number;
  longitude: number;
  label: string;
  kind: PointKind;
  detail?: string;
  selected?: boolean;
  driverId?: string;
  sequence?: number;
}

const lightPalette: Record<PointKind, { stroke: string; fill: string }> = {
  driver: { stroke: '#15583f', fill: '#2f9d70' },
  pickup: { stroke: '#8c5c12', fill: '#e5a63d' },
  dropoff: { stroke: '#285d8a', fill: '#4b91c7' },
  route: { stroke: '#45554d', fill: '#73827a' },
};

const darkPalette: Record<PointKind, { stroke: string; fill: string }> = {
  driver: { stroke: '#7ae0b0', fill: '#32b47b' },
  pickup: { stroke: '#ffd58a', fill: '#e8a63e' },
  dropoff: { stroke: '#98cef5', fill: '#559ed3' },
  route: { stroke: '#d1ddd6', fill: '#87988f' },
};

const tileSource = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; OpenStreetMap contributors',
} as const;

export function LiveMap({
  locations,
  orders = [],
  stops = [],
  language = 'en',
  selectedDriverId,
  history = [],
  theme = 'light',
  routeMode = 'optimization',
  onDriverSelect,
  routeEtaMinutes = null,
  routeDistanceKm = null,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const tileRef = useRef<TileLayer | null>(null);
  const [roadGeometry, setRoadGeometry] = useState<Array<[number, number]>>([]);
  const [routeSource, setRouteSource] = useState<'road' | 'direct' | 'none'>('none');
  const [roadEtaMinutes, setRoadEtaMinutes] = useState<number | null>(null);
  const [roadDistanceKm, setRoadDistanceKm] = useState<number | null>(null);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.driverId === selectedDriverId),
    [locations, selectedDriverId],
  );

  const points = useMemo<MapPoint[]>(() => {
    const driverPoints: MapPoint[] = locations.map((location) => ({
      latitude: location.latitude,
      longitude: location.longitude,
      label: location.driverId.slice(0, 8),
      detail: `${location.speedKph ?? '—'} km/h`,
      kind: 'driver',
      selected: location.driverId === selectedDriverId,
      driverId: location.driverId,
    }));

    const orderPoints: MapPoint[] = stops.length
      ? []
      : orders.slice(0, 8).flatMap<MapPoint>((order) => [
          {
            latitude: order.pickup.latitude,
            longitude: order.pickup.longitude,
            label: `${translate(language, 'map.pickup')} · ${order.id.slice(0, 5)}`,
            detail: order.pickup.address,
            kind: 'pickup',
          },
          {
            latitude: order.dropoff.latitude,
            longitude: order.dropoff.longitude,
            label: `${translate(language, 'map.dropoff')} · ${order.id.slice(0, 5)}`,
            detail: order.dropoff.address,
            kind: 'dropoff',
          },
        ]);

    const stopPoints: MapPoint[] = stops.map((stop): MapPoint => ({
      latitude: stop.latitude,
      longitude: stop.longitude,
      label: `${stop.sequence} · ${translate(language, stop.type === 'PICKUP' ? 'map.pickup' : 'map.dropoff')}`,
      detail: `${stop.legDistanceKm} km · ${stop.orderId.slice(0, 8)}`,
      kind: stop.type === 'PICKUP' ? 'pickup' : 'dropoff',
      sequence: stop.sequence,
    }));

    return [...driverPoints, ...orderPoints, ...stopPoints];
  }, [language, locations, orders, selectedDriverId, stops]);

  const routeWaypoints = useMemo<Array<[number, number]>>(() => {
    if (!stops.length) return [];
    const result: Array<[number, number]> = [];
    if (selectedLocation) result.push([selectedLocation.latitude, selectedLocation.longitude]);
    result.push(...stops.map((stop) => [stop.latitude, stop.longitude] as [number, number]));
    return result;
  }, [selectedLocation, stops]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
    }).setView([-0.19, -78.49], 12);

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    const resize = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    resize.observe(containerRef.current);

    return () => {
      resize.disconnect();
      tileRef.current = null;
      layerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(tileSource.url, {
      maxZoom: 19,
      attribution: tileSource.attribution,
      subdomains: 'abc',
    }).addTo(map);
  }, [theme]);

  useEffect(() => {
    if (routeWaypoints.length < 2) {
      setRoadGeometry([]);
      setRouteSource('none');
      setRoadEtaMinutes(null);
      setRoadDistanceKm(null);
      return;
    }

    setRoadGeometry(routeWaypoints);
    setRouteSource('direct');
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);
    const routingBase = (import.meta.env.VITE_ROUTING_BASE_URL as string | undefined) ?? 'https://router.project-osrm.org';
    const coordinates = routeWaypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `${routingBase}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;

    void fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Routing HTTP ${response.status}`);
        const payload = await response.json() as {
          routes?: Array<{
            geometry?: { coordinates?: Array<[number, number]> };
            duration?: number;
            distance?: number;
          }>;
        };
        const roadRoute = payload.routes?.[0];
        const coordinatesResult = roadRoute?.geometry?.coordinates ?? [];
        if (coordinatesResult.length < 2) throw new Error('No road geometry');
        setRoadGeometry(coordinatesResult.map(([lng, lat]) => [lat, lng]));
        setRoadEtaMinutes(typeof roadRoute?.duration === 'number' ? Math.max(1, Math.ceil(roadRoute.duration / 60)) : null);
        setRoadDistanceKm(typeof roadRoute?.distance === 'number' ? roadRoute.distance / 1000 : null);
        setRouteSource('road');
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRoadGeometry(routeWaypoints);
          setRoadEtaMinutes(null);
          setRoadDistanceKm(null);
          setRouteSource('direct');
        }
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [routeWaypoints]);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerRef.current;
    if (!map || !group) return;
    group.clearLayers();

    const palette = theme === 'dark' ? darkPalette : lightPalette;
    const bounds: L.LatLngExpression[] = [];

    points.forEach((point) => {
      bounds.push([point.latitude, point.longitude]);
      const tone = palette[point.kind];
      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius: point.selected ? 10 : point.kind === 'driver' ? 8 : point.kind === 'route' ? 7 : 6,
        color: tone.stroke,
        fillColor: tone.fill,
        fillOpacity: 0.96,
        weight: point.selected ? 4 : 2,
      });
      marker.bindTooltip(point.sequence ? String(point.sequence) : point.label, {
        direction: 'top',
        offset: [0, -8],
        opacity: 0.95,
        permanent: typeof point.sequence === 'number',
        className: typeof point.sequence === 'number' ? 'route-stop-tooltip' : undefined,
      });
      marker.bindPopup(`<strong>${escapeHtml(point.label)}</strong>${point.detail ? `<br/><span>${escapeHtml(point.detail)}</span>` : ''}`);
      if (point.driverId && onDriverSelect) marker.on('click', () => onDriverSelect(point.driverId!));
      marker.addTo(group);
    });

    const route = roadGeometry.length > 1 ? roadGeometry : routeWaypoints;
    if (route.length > 1) {
      const casing = theme === 'dark' ? '#07100c' : '#ffffff';
      const line = routeMode === 'driver' ? '#39b982' : '#5d7ce2';
      L.polyline(route, { color: casing, weight: 8, opacity: theme === 'dark' ? 0.78 : 0.92 }).addTo(group);
      L.polyline(route, {
        color: line,
        weight: 4,
        opacity: 0.95,
        dashArray: routeSource === 'direct' ? '8 7' : undefined,
      }).addTo(group);
      route.forEach(([lat, lng]) => bounds.push([lat, lng]));
    }

    historyPolyline(history, selectedDriverId).forEach((historyRoute) => {
      L.polyline(historyRoute, { color: theme === 'dark' ? '#5ba6dd' : '#3278a8', weight: 3, opacity: 0.52 }).addTo(group);
    });

    if (bounds.length === 1) map.setView(bounds[0]!, 14, { animate: false });
    else if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds), { padding: [42, 42], maxZoom: 15, animate: false });
  }, [history, onDriverSelect, points, roadGeometry, routeMode, routeSource, routeWaypoints, selectedDriverId, theme]);

  const legend = (key: TranslationKey, kind: PointKind) => (
    <span><i className={`legend-dot ${kind}`} />{translate(language, key)}</span>
  );

  const displayEtaMinutes = roadEtaMinutes ?? routeEtaMinutes;
  const displayDistanceKm = roadDistanceKm ?? routeDistanceKm;

  return (
    <div className={`map-shell map-theme-${theme}`}>
      <div className="leaflet-map" ref={containerRef} aria-label={translate(language, 'map.openStreetMap')} />
      {points.length === 0 && (
        <div className="map-empty-overlay">
          <strong>{translate(language, 'map.noCoordinates')}</strong>
          <span>{translate(language, 'map.noCoordinatesHint')}</span>
        </div>
      )}
      <div className="map-route-badge">
        <span className={`route-source-dot ${routeSource}`} />
        {routeWaypoints.length > 1
          ? translate(language, routeSource === 'road' ? 'map.roadRoute' : 'map.directRoute')
          : translate(language, 'map.noRoute')}
      </div>
      {routeWaypoints.length > 1 && (
        <div className="map-eta-card">
          <div><span>{translate(language, 'map.arrivalEta')}</span><strong>{displayEtaMinutes != null ? `${displayEtaMinutes} min` : '—'}</strong></div>
          <div><span>{translate(language, 'map.routeDistance')}</span><strong>{displayDistanceKm != null ? `${displayDistanceKm.toFixed(1)} km` : '—'}</strong></div>
          <div><span>{translate(language, 'route.stops')}</span><strong>{stops.length}</strong></div>
        </div>
      )}
      <div className="map-legend">
        {legend('map.driver', 'driver')}
        {legend('map.pickup', 'pickup')}
        {legend('map.dropoff', 'dropoff')}
        {legend('map.route', 'route')}
      </div>
    </div>
  );
}

function historyPolyline(locations: DriverLocation[], selectedDriverId?: string): Array<Array<[number, number]>> {
  if (!selectedDriverId) return [];
  const selected = locations.filter((item) => item.driverId === selectedDriverId);
  return selected.length > 1 ? [selected.map((item) => [item.latitude, item.longitude])] : [];
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character] ?? character));
}
