import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { api, registerTraceListener } from './api';
import { JsonViewer } from './components/JsonViewer';
import { LiveMap, type MapTheme } from './components/LiveMap';
import { MetricCard } from './components/MetricCard';
import { NavIcon } from './components/NavIcon';
import { StatusPill } from './components/StatusPill';
import { loadLanguage, persistLanguage, translate, translateStatus, type Language, type TranslationKey } from './i18n';
import type {
  DemoStep,
  Dispatch,
  DispatchDecision,
  Driver,
  DriverLocation,
  EtaResult,
  HealthResponse,
  NearbyDriver,
  Order,
  OrderPriority,
  PlannedStop,
  RequestTrace,
  RoutePlanResult,
} from './types';

type Tab = 'overview' | 'orders' | 'drivers' | 'tracking' | 'dispatch' | 'optimization' | 'api';
type ThemePreference = 'system' | 'light' | 'dark';

const tabMeta: Array<{ id: Tab; labelKey: TranslationKey }> = [
  { id: 'overview', labelKey: 'nav.overview' },
  { id: 'orders', labelKey: 'nav.orders' },
  { id: 'drivers', labelKey: 'nav.drivers' },
  { id: 'tracking', labelKey: 'nav.tracking' },
  { id: 'dispatch', labelKey: 'nav.dispatch' },
  { id: 'optimization', labelKey: 'nav.optimization' },
  { id: 'api', labelKey: 'nav.api' },
];

const pageDescriptionKeys: Record<Tab, TranslationKey> = {
  overview: 'page.overview.description',
  orders: 'page.orders.description',
  drivers: 'page.drivers.description',
  tracking: 'page.tracking.description',
  dispatch: 'page.dispatch.description',
  optimization: 'page.optimization.description',
  api: 'page.api.description',
};

const pageContextMeta: Record<Tab, { purposeKey: TranslationKey; actionsKey: TranslationKey; service: string }> = {
  overview: { purposeKey: 'context.overview.purpose', actionsKey: 'context.overview.actions', service: 'Gateway + all read models' },
  orders: { purposeKey: 'context.orders.purpose', actionsKey: 'context.orders.actions', service: 'Order Service via API Gateway' },
  drivers: { purposeKey: 'context.drivers.purpose', actionsKey: 'context.drivers.actions', service: 'Driver Service via API Gateway' },
  tracking: { purposeKey: 'context.tracking.purpose', actionsKey: 'context.tracking.actions', service: 'Tracking Service · Redis GEO · PostGIS' },
  dispatch: { purposeKey: 'context.dispatch.purpose', actionsKey: 'context.dispatch.actions', service: 'Dispatch Service · CQRS · RabbitMQ' },
  optimization: { purposeKey: 'context.optimization.purpose', actionsKey: 'context.optimization.actions', service: 'paired-insertion-v1' },
  api: { purposeKey: 'context.api.purpose', actionsKey: 'context.api.actions', service: 'Browser → API Gateway' },
};


function loadThemePreference(): ThemePreference {
  const stored = globalThis.localStorage?.getItem('routefast.theme');
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

function systemTheme(): MapTheme {
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function buildDemoSteps(language: Language): DemoStep[] {
  return [
    { label: translate(language, 'demo.createDriver'), state: 'pending' },
    { label: translate(language, 'demo.markAvailable'), state: 'pending' },
    { label: translate(language, 'demo.publishGps'), state: 'pending' },
    { label: translate(language, 'demo.createOrder'), state: 'pending' },
    { label: translate(language, 'demo.waitDispatch'), state: 'pending' },
    { label: translate(language, 'demo.readDecision'), state: 'pending' },
  ];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const shortId = (value?: string | null) => value ? value.slice(0, 8) : '—';
const time = (value?: string) => value ? new Date(value).toLocaleTimeString() : '—';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const [language, setLanguage] = useState<Language>(() => loadLanguage());
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => loadThemePreference());
  const [resolvedTheme, setResolvedTheme] = useState<MapTheme>(() => loadThemePreference() === 'system' ? systemTheme() : loadThemePreference() as MapTheme);
  const [showGuide, setShowGuide] = useState(true);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [locations, setLocations] = useState<Record<string, DriverLocation>>({});
  const [history, setHistory] = useState<DriverLocation[]>([]);
  const [nearby, setNearby] = useState<NearbyDriver[]>([]);
  const [eta, setEta] = useState<EtaResult | null>(null);
  const [decision, setDecision] = useState<DispatchDecision | null>(null);
  const [routePlan, setRoutePlan] = useState<RoutePlanResult | null>(null);
  const [driverRoutePlan, setDriverRoutePlan] = useState<RoutePlanResult | null>(null);
  const [traces, setTraces] = useState<RequestTrace[]>([]);
  const [lastResponse, setLastResponse] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [socketState, setSocketState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoSteps, setDemoSteps] = useState<DemoStep[]>(() => buildDemoSteps(language));
  const socketRef = useRef<Socket | null>(null);
  const autoRouteKeyRef = useRef('');

  const [orderForm, setOrderForm] = useState({
    customerId: 'customer-demo-001',
    priority: 'EXPRESS' as OrderPriority,
    pickupLabel: 'Pickup · La Carolina',
    pickupAddress: 'Parque La Carolina, Quito',
    pickupLatitude: -0.1807,
    pickupLongitude: -78.4846,
    dropoffLabel: 'Dropoff · Centro Histórico',
    dropoffAddress: 'Plaza Grande, Quito',
    dropoffLatitude: -0.2202,
    dropoffLongitude: -78.5123,
  });

  const [driverForm, setDriverForm] = useState({ displayName: 'Ops Driver Quito', capacity: 3 });
  const [trackingForm, setTrackingForm] = useState({ latitude: -0.181, longitude: -78.484, speedKph: 28, headingDegrees: 170 });
  const [orderFilters, setOrderFilters] = useState({ query: '', status: 'ALL', priority: 'ALL' });
  const [driverFilters, setDriverFilters] = useState({ query: '', status: 'ALL' });
  const [dispatchFilters, setDispatchFilters] = useState({ query: '', status: 'ALL' });
  const [mapDriverStatus, setMapDriverStatus] = useState('ALL');

  const t = useCallback((key: TranslationKey) => translate(language, key), [language]);
  const tabs = useMemo(() => tabMeta.map((item) => ({ ...item, label: t(item.labelKey) })), [t]);
  const statusLabel = useCallback((value: string) => translateStatus(language, value), [language]);



  const changeLanguage = (next: Language) => {
    setLanguage(next);
    persistLanguage(next);
    document.documentElement.lang = next;
    setDemoSteps(buildDemoSteps(next));
  };

  const changeTheme = (next: ThemePreference) => {
    setThemePreference(next);
    globalThis.localStorage?.setItem('routefast.theme', next);
  };

  const updateDemoStep = useCallback((index: number, state: DemoStep['state'], detail?: string) => {
    setDemoSteps((steps) => steps.map((step, current) => current === index ? { ...step, state, detail } : step));
  }, []);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    const [healthResult, ordersResult, driversResult, dispatchesResult] = await Promise.allSettled([
      api.health(), api.listOrders(), api.listDrivers(), api.listDispatches(),
    ]);

    if (healthResult.status === 'fulfilled') setHealth(healthResult.value);
    if (ordersResult.status === 'fulfilled') setOrders(ordersResult.value);
    if (driversResult.status === 'fulfilled') {
      setDrivers(driversResult.value);
      setSelectedDriverId((current) => current || driversResult.value[0]?.id || '');
    }
    if (dispatchesResult.status === 'fulfilled') setDispatches(dispatchesResult.value);

    const rejected = [healthResult, ordersResult, driversResult, dispatchesResult].find((result) => result.status === 'rejected');
    if (rejected?.status === 'rejected' && !quiet) setError(errorMessage(rejected.reason));
    if (!quiet) setRefreshing(false);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const media = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
    const apply = () => {
      const next = themePreference === 'system' ? (media?.matches ? 'dark' : 'light') : themePreference;
      setResolvedTheme(next);
      document.documentElement.dataset.theme = next;
      document.documentElement.style.colorScheme = next;
    };
    apply();
    media?.addEventListener('change', apply);
    return () => media?.removeEventListener('change', apply);
  }, [themePreference]);

  useEffect(() => registerTraceListener((trace) => {
    setTraces((current) => [trace, ...current].slice(0, 80));
  }), []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(true), 5000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const wsBase = (import.meta.env.VITE_TRACKING_WS_URL as string | undefined)
      ?? (import.meta.env.DEV ? 'http://localhost:3004' : window.location.origin);
    const socket = io(`${wsBase}/tracking`, {
      autoConnect: false,
      transports: ['polling', 'websocket'],
      upgrade: true,
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.35,
    });
    socketRef.current = socket;
    setSocketState('connecting');

    socket.on('connect', () => {
      setSocketState('connected');
      socket.emit('tracking.subscribe', { operations: true });
    });
    socket.io.on('reconnect_attempt', () => setSocketState('connecting'));
    socket.on('disconnect', () => setSocketState('disconnected'));
    socket.on('connect_error', () => setSocketState('disconnected'));
    socket.on('driver.location.updated', (location: DriverLocation) => {
      setLocations((current) => ({ ...current, [location.driverId]: location }));
    });

    const connectTimer = window.setTimeout(() => socket.connect(), 120);
    return () => {
      window.clearTimeout(connectTimer);
      socket.removeAllListeners();
      socket.io.removeAllListeners();
      if (socket.connected) socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const runAction = async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    setError(null);
    try {
      const result = await action();
      setLastResponse(result);
      return result;
    } catch (caught) {
      setError(errorMessage(caught));
      return undefined;
    }
  };

  const createOrder = async () => {
    const created = await runAction(() => api.createOrder({
      customerId: orderForm.customerId,
      priority: orderForm.priority,
      pickup: {
        label: orderForm.pickupLabel,
        address: orderForm.pickupAddress,
        latitude: Number(orderForm.pickupLatitude),
        longitude: Number(orderForm.pickupLongitude),
      },
      dropoff: {
        label: orderForm.dropoffLabel,
        address: orderForm.dropoffAddress,
        latitude: Number(orderForm.dropoffLatitude),
        longitude: Number(orderForm.dropoffLongitude),
      },
    }));
    if (created) await refresh(true);
  };

  const createDriver = async () => {
    const created = await runAction(() => api.createDriver({ displayName: driverForm.displayName, capacity: Number(driverForm.capacity) }));
    if (created) {
      setSelectedDriverId(created.id);
      await refresh(true);
    }
  };

  const publishLocation = async (viaWebSocket = false) => {
    if (!selectedDriverId) {
      setError(t('error.selectDriverGps'));
      return;
    }
    const payload = {
      driverId: selectedDriverId,
      latitude: Number(trackingForm.latitude),
      longitude: Number(trackingForm.longitude),
      speedKph: Number(trackingForm.speedKph),
      headingDegrees: Number(trackingForm.headingDegrees),
      recordedAt: new Date().toISOString(),
    };

    if (viaWebSocket) {
      const socket = socketRef.current;
      if (!socket?.connected) {
        setError(t('error.wsDisconnected'));
        return;
      }
      socket.timeout(3000).emit('driver.location.update', payload, (socketError: Error | null, response: unknown) => {
        if (socketError) setError(socketError.message);
        else setLastResponse(response);
      });
      return;
    }

    const result = await runAction(() => api.updateLocation(payload));
    if (result) setLocations((current) => ({ ...current, [selectedDriverId]: result.location }));
  };

  const loadTrackingDetails = async () => {
    if (!selectedDriverId) return setError(t('error.selectDriver'));
    setError(null);
    const [latestResult, historyResult, nearbyResult, etaResult] = await Promise.allSettled([
      api.latestLocation(selectedDriverId),
      api.locationHistory(selectedDriverId, 30),
      api.nearbyDrivers({
        latitude: Number(trackingForm.latitude),
        longitude: Number(trackingForm.longitude),
        radiusKm: 15,
        limit: 20,
        candidateDriverIds: drivers.map((driver) => driver.id),
        maxAgeSeconds: 3600,
      }),
      api.eta({ driverId: selectedDriverId, latitude: orderForm.dropoffLatitude, longitude: orderForm.dropoffLongitude }),
    ]);
    if (latestResult.status === 'fulfilled') setLocations((current) => ({ ...current, [selectedDriverId]: latestResult.value }));
    if (historyResult.status === 'fulfilled') setHistory(historyResult.value);
    if (nearbyResult.status === 'fulfilled') setNearby(nearbyResult.value);
    if (etaResult.status === 'fulfilled') setEta(etaResult.value);
    const rejected = [latestResult, historyResult, nearbyResult, etaResult].find((result) => result.status === 'rejected');
    if (rejected?.status === 'rejected') setError(errorMessage(rejected.reason));
  };

  const buildRoutePlan = async () => {
    const candidates = orders.filter((order) => order.status !== 'CANCELLED').slice(0, 6);
    if (candidates.length === 0) return setError(t('error.createOrderOptimization'));
    const result = await runAction(() => api.routePlan({
      origin: { latitude: -0.1807, longitude: -78.4846 },
      vehicleCapacity: Math.max(3, candidates.length),
      orders: candidates.map((order) => ({
        orderId: order.id,
        demand: 1,
        pickup: { latitude: order.pickup.latitude, longitude: order.pickup.longitude },
        dropoff: { latitude: order.dropoff.latitude, longitude: order.dropoff.longitude },
      })),
    }));
    if (result) setRoutePlan(result);
  };

  const buildDriverRoute = async (driverId = selectedDriverId, forcedOrders?: Order[]) => {
    if (!driverId) return setError(t('error.selectDriver'));
    const driver = drivers.find((item) => item.id === driverId);
    if (!driver) return setError(t('error.selectDriver'));

    let origin = locations[driverId];
    if (!origin) {
      const latest = await runAction(() => api.latestLocation(driverId));
      if (!latest) return;
      origin = latest;
      setLocations((current) => ({ ...current, [driverId]: latest }));
    }

    const candidates = forcedOrders ?? orders.filter((order) =>
      order.assignedDriverId === driverId && !['CANCELLED', 'DELIVERED'].includes(order.status),
    );
    if (candidates.length === 0) return setError(t('error.noAssignedDeliveries'));

    const result = await runAction(() => api.routePlan({
      origin: { latitude: origin.latitude, longitude: origin.longitude },
      vehicleCapacity: driver.capacity,
      orders: candidates.slice(0, 6).map((order) => ({
        orderId: order.id,
        demand: 1,
        pickup: { latitude: order.pickup.latitude, longitude: order.pickup.longitude },
        dropoff: { latitude: order.dropoff.latitude, longitude: order.dropoff.longitude },
      })),
    }));
    if (result) {
      setSelectedDriverId(driverId);
      setDriverRoutePlan(result);
      const last = result.stops.at(-1);
      if (last) {
        const etaResult = await runAction(() => api.eta({ driverId, latitude: last.latitude, longitude: last.longitude }));
        if (etaResult) setEta(etaResult);
      }
    }
  };

  useEffect(() => {
    if (!selectedDriverId || !['overview', 'tracking'].includes(tab)) return;
    const candidates = orders.filter((order) =>
      order.assignedDriverId === selectedDriverId && !['CANCELLED', 'DELIVERED'].includes(order.status),
    );
    const routeKey = `${tab}:${selectedDriverId}:${candidates.map((order) => `${order.id}:${order.status}`).join('|')}`;
    if (autoRouteKeyRef.current === routeKey) return;

    if (candidates.length === 0) {
      autoRouteKeyRef.current = routeKey;
      setDriverRoutePlan(null);
      setEta(null);
      return;
    }

    // On Overview we only auto-route drivers already visible on the live map.
    if (tab === 'overview' && !locations[selectedDriverId]) return;

    autoRouteKeyRef.current = routeKey;
    void buildDriverRoute(selectedDriverId, candidates);
  }, [locations, orders, selectedDriverId, tab]);

  const openDispatchRoute = async (item: Dispatch) => {
    if (!item.driverId) return;
    const order = orders.find((candidate) => candidate.id === item.orderId) ?? await runAction(() => api.getOrder(item.orderId));
    if (!order) return;
    await buildDriverRoute(item.driverId, [order]);
    setTab('tracking');
  };

  const runGuidedDemo = async () => {
    if (demoRunning) return;
    setDemoRunning(true);
    setError(null);
    setDemoSteps(buildDemoSteps(language));
    try {
      updateDemoStep(0, 'running');
      const driver = await api.createDriver({ displayName: `Demo Driver ${new Date().toLocaleTimeString()}`, capacity: 3 });
      setSelectedDriverId(driver.id);
      updateDemoStep(0, 'success', shortId(driver.id));

      updateDemoStep(1, 'running');
      await api.setDriverAvailability(driver.id, 'AVAILABLE');
      updateDemoStep(1, 'success', 'AVAILABLE');

      updateDemoStep(2, 'running');
      const location = await api.updateLocation({
        driverId: driver.id,
        latitude: -0.1807,
        longitude: -78.4846,
        speedKph: 26,
        headingDegrees: 160,
        recordedAt: new Date().toISOString(),
      });
      setLocations((current) => ({ ...current, [driver.id]: location.location }));
      updateDemoStep(2, 'success', location.acceptedAsCurrent ? 'Redis hot state accepted' : 'history only');

      updateDemoStep(3, 'running');
      const order = await api.createOrder({
        customerId: `guided-demo-${Date.now()}`,
        priority: 'EXPRESS',
        pickup: { label: 'La Carolina', address: 'Parque La Carolina, Quito', latitude: -0.1807, longitude: -78.4846 },
        dropoff: { label: 'Plaza Grande', address: 'Centro Histórico, Quito', latitude: -0.2202, longitude: -78.5123 },
      });
      updateDemoStep(3, 'success', shortId(order.id));

      updateDemoStep(4, 'running');
      let dispatch: Dispatch | undefined;
      let currentOrder = order;
      for (let attempt = 0; attempt < 24; attempt += 1) {
        await sleep(500);
        const [nextOrder, nextDispatches] = await Promise.all([api.getOrder(order.id), api.listDispatches()]);
        currentOrder = nextOrder;
        dispatch = nextDispatches.find((item) => item.orderId === order.id);
        if (dispatch && ['ASSIGNED', 'FAILED', 'CANCELLED'].includes(dispatch.status)) break;
      }
      if (!dispatch) throw new Error(t('error.dispatchTimeout'));
      updateDemoStep(4, dispatch.status === 'ASSIGNED' ? 'success' : 'error', `${dispatch.status} · order ${currentOrder.status}`);

      updateDemoStep(5, 'running');
      const scoringDecision = await api.getDispatchDecision(dispatch.id);
      setDecision(scoringDecision);
      updateDemoStep(5, 'success', `${scoringDecision.strategyVersion} · selected ${shortId(scoringDecision.selectedCandidateId)}`);
      setLastResponse({ driver, order: currentOrder, dispatch, decision: scoringDecision });
      await refresh(true);
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      setDemoSteps((steps) => {
        const running = steps.findIndex((step) => step.state === 'running');
        return steps.map((step, index) => index === running ? { ...step, state: 'error', detail: message } : step);
      });
    } finally {
      setDemoRunning(false);
    }
  };

  const activeOrders = orders.filter((order) => !['CANCELLED', 'DELIVERED'].includes(order.status)).length;
  const availableDrivers = drivers.filter((driver) => driver.status === 'AVAILABLE').length;
  const assignedDispatches = dispatches.filter((item) => item.status === 'ASSIGNED').length;
  const latestLocations = useMemo(() => Object.values(locations), [locations]);
  const selectedDriver = drivers.find((driver) => driver.id === selectedDriverId);
  const latestTrace = traces[0];
  const currentTab = tabs.find((item) => item.id === tab);
  const displayError = error?.includes('active reservations') ? t('drivers.offlineBlocked') : error;
  const demoStarted = demoRunning || demoSteps.some((step) => step.state !== 'pending');
  const rankedCandidates = decision?.rankedCandidates.slice(0, 5) ?? [];
  const filteredOrders = useMemo(() => orders.filter((order) => {
    const query = orderFilters.query.trim().toLowerCase();
    const matchesQuery = !query || [order.id, order.customerId, order.assignedDriverId ?? '', order.pickup.address, order.dropoff.address]
      .some((value) => value.toLowerCase().includes(query));
    return matchesQuery
      && (orderFilters.status === 'ALL' || order.status === orderFilters.status)
      && (orderFilters.priority === 'ALL' || order.priority === orderFilters.priority);
  }), [orderFilters, orders]);

  const filteredDrivers = useMemo(() => drivers.filter((driver) => {
    const query = driverFilters.query.trim().toLowerCase();
    const matchesQuery = !query || [driver.id, driver.displayName].some((value) => value.toLowerCase().includes(query));
    return matchesQuery && (driverFilters.status === 'ALL' || driver.status === driverFilters.status);
  }), [driverFilters, drivers]);

  const filteredDispatches = useMemo(() => dispatches.filter((item) => {
    const query = dispatchFilters.query.trim().toLowerCase();
    const matchesQuery = !query || [item.id, item.orderId, item.driverId ?? '', item.failureReason ?? '']
      .some((value) => value.toLowerCase().includes(query));
    return matchesQuery && (dispatchFilters.status === 'ALL' || item.status === dispatchFilters.status);
  }), [dispatchFilters, dispatches]);

  const filteredMapLocations = useMemo(() => latestLocations.filter((location) => {
    if (mapDriverStatus === 'ALL') return true;
    return drivers.find((driver) => driver.id === location.driverId)?.status === mapDriverStatus;
  }), [drivers, latestLocations, mapDriverStatus]);

  const nextAction = availableDrivers === 0
    ? { tab: 'drivers' as Tab, title: t('overview.actionAddDriver'), copy: t('overview.actionAddDriverCopy') }
    : activeOrders === 0
      ? { tab: 'orders' as Tab, title: t('overview.actionCreateOrder'), copy: t('overview.actionCreateOrderCopy') }
      : latestLocations.length === 0
        ? { tab: 'tracking' as Tab, title: t('overview.actionAddGps'), copy: t('overview.actionAddGpsCopy') }
        : assignedDispatches > 0
          ? { tab: 'tracking' as Tab, title: t('overview.actionTrack'), copy: t('overview.actionTrackCopy') }
          : { tab: 'dispatch' as Tab, title: t('overview.actionReview'), copy: t('overview.actionReviewCopy') };

  const guideSteps = [
    { title: t('guide.step.request'), copy: t('guide.step.requestCopy') },
    { title: t('guide.step.match'), copy: t('guide.step.matchCopy') },
    { title: t('guide.step.track'), copy: t('guide.step.trackCopy') },
    { title: t('guide.step.complete'), copy: t('guide.step.completeCopy') },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">RF</div>
          <div><strong>RouteFast</strong><span>{t('app.subtitle')}</span></div>
        </div>


        <nav className="primary-nav">
          {tabs.map((item) => (
            <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>
              <NavIcon name={item.id} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="language-switch" aria-label="Language selector">
            <button className={language === 'es' ? 'active' : ''} onClick={() => changeLanguage('es')}>ES</button>
            <button className={language === 'en' ? 'active' : ''} onClick={() => changeLanguage('en')}>EN</button>
          </div>
          <div className="theme-switch" aria-label={t('theme.label')}>
            <button className={themePreference === 'system' ? 'active' : ''} onClick={() => changeTheme('system')} title={t('theme.system')}>Auto</button>
            <button className={themePreference === 'light' ? 'active' : ''} onClick={() => changeTheme('light')} title={t('theme.light')}>☀</button>
            <button className={themePreference === 'dark' ? 'active' : ''} onClick={() => changeTheme('dark')} title={t('theme.dark')}>☾</button>
          </div>
          <div className="connection-line">
            <span className={`pulse ${health?.status === 'ready' ? 'online' : ''}`} />
            <div><strong>{t('connection.gateway')}</strong><span>{health?.status ?? 'checking'}</span></div>
          </div>
          <div className="connection-line">
            <span className={`pulse ${socketState === 'connected' ? 'online' : ''}`} />
            <div><strong>{t('connection.tracking')}</strong><span>{statusLabel(socketState)}</span></div>
          </div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div className="page-title-block">
            <span className="eyebrow">{t('app.domain')}</span>
            <h1>{currentTab?.label}</h1>
            <p>{t(pageDescriptionKeys[tab])}</p>
          </div>
          <div className="top-actions">
            {latestTrace && <span className="latency-chip">{latestTrace.durationMs.toFixed(0)} ms · {latestTrace.status}</span>}
            <button className="icon-button" aria-label={t('action.refresh')} title={t('action.refresh')} onClick={() => void refresh()} disabled={refreshing}>
              <span className={refreshing ? 'spin' : ''}>↻</span>
            </button>
          </div>
        </header>

        <section className="page-context-bar" aria-label={t('context.title')}>
          <div className="page-context-main"><span>{t('context.purpose')}</span><strong>{t(pageContextMeta[tab].purposeKey)}</strong></div>
          <div><span>{t('context.actions')}</span><strong>{t(pageContextMeta[tab].actionsKey)}</strong></div>
          <div><span>{t('context.source')}</span><strong>{pageContextMeta[tab].service}</strong></div>
        </section>

        {displayError && <div className="error-banner"><div><strong>{t('error.requestFailed')}</strong><span>{displayError}</span></div><button aria-label={t('action.close')} onClick={() => setError(null)}>×</button></div>}

        {tab === 'overview' && (
          <section className="page-grid">
            <article className="welcome-panel full-span">
              <div className="welcome-copy">
                <span className="eyebrow">{t('overview.welcomeKicker')}</span>
                <h2>{t('overview.welcomeTitle')}</h2>
                <p>{t('overview.welcomeCopy')}</p>
                <div className="welcome-actions">
                  <button className="button primary large" onClick={() => void runGuidedDemo()} disabled={demoRunning}>{demoRunning ? t('overview.runningSaga') : t('overview.startSample')}</button>
                  <button className="button soft" onClick={() => setShowGuide((value) => !value)}>{showGuide ? t('guide.hide') : t('guide.show')}</button>
                </div>
              </div>
              <div className={`system-card ${health?.status === 'ready' && socketState === 'connected' ? 'healthy' : ''}`}>
                <div className="system-icon">✓</div>
                <div><strong>{t('overview.systemHealthy')}</strong><span>{t('overview.systemHealthyCopy')}</span></div>
              </div>
            </article>

            {showGuide && (
              <article className="guide-panel full-span">
                <div className="guide-heading"><span>{t('guide.kicker')}</span><strong>{t('guide.title')}</strong><p>{t('guide.copy')}</p></div>
                <div className="journey-strip">
                  {guideSteps.map((step, index) => (
                    <div className="journey-step" key={step.title}>
                      <div className="journey-number">{index + 1}</div>
                      <div><strong>{step.title}</strong><span>{step.copy}</span></div>
                    </div>
                  ))}
                </div>
              </article>
            )}

            <div className="metrics-grid full-span">
              <MetricCard label={t('overview.activeOrders')} value={activeOrders} note={`${orders.length} ${t('overview.recentLoaded')}`} />
              <MetricCard label={t('overview.availableDrivers')} value={availableDrivers} note={`${drivers.length} ${t('overview.recentLoaded')}`} />
              <MetricCard label={t('overview.assignedDispatches')} value={assignedDispatches} note={`${dispatches.length} ${t('overview.recentLoaded')}`} />
              <MetricCard label={t('overview.liveGps')} value={latestLocations.length} note={t('overview.hotState')} />
            </div>

            <article className="panel map-panel span-2 featured-panel">
              <div className="panel-heading"><div><span className="eyebrow">{t('overview.operationalPicture')}</span><h2>{t('overview.liveMap')}</h2></div><span className="count-chip">{latestLocations.length}</span></div>
              <LiveMap language={language} theme={resolvedTheme} selectedDriverId={selectedDriverId} locations={filteredMapLocations} orders={orders.filter((order) => !['CANCELLED', 'DELIVERED'].includes(order.status)).slice(0, 5)} stops={driverRoutePlan?.stops ?? []} routeMode="driver" routeEtaMinutes={eta?.estimatedMinutes} routeDistanceKm={driverRoutePlan?.totalDistanceKm} onDriverSelect={setSelectedDriverId} />
            </article>

            <div className="overview-stack">
              <article className="panel next-action-panel">
                <span className="eyebrow">{t('overview.nextAction')}</span>
                <div className="next-action-icon">→</div>
                <h2>{nextAction.title}</h2>
                <p>{nextAction.copy}</p>
                <button className="button primary full-button" onClick={() => setTab(nextAction.tab)}>{t('action.open')}</button>
              </article>

              <article className="panel">
                <div className="panel-heading"><div><span className="eyebrow">{t('overview.recentState')}</span><h2>{t('overview.dispatchQueue')}</h2></div></div>
                <div className="compact-list">
                  {dispatches.slice(0, 5).map((item) => <button key={item.id} onClick={() => { setTab('dispatch'); setLastResponse(item); }}><div><strong>{shortId(item.orderId)}</strong><span>{t('orders.driver')} {shortId(item.driverId)}</span></div><StatusPill value={item.status} label={statusLabel(item.status)} /></button>)}
                  {dispatches.length === 0 && <div className="empty-state">{t('overview.noAttention')}</div>}
                </div>
              </article>
            </div>

            {demoStarted && (
              <article className="panel full-span demo-progress-panel">
                <div className="panel-heading"><div><span className="eyebrow">{t('overview.validation')}</span><h2>{t('overview.demoProgress')}</h2></div></div>
                <div className="demo-timeline">
                  {demoSteps.map((step, index) => <div className={`demo-step ${step.state}`} key={`${step.label}-${index}`}><span className="step-index">{String(index + 1).padStart(2, '0')}</span><div><strong>{step.label}</strong><span>{step.detail ?? step.state}</span></div></div>)}
                </div>
              </article>
            )}
          </section>
        )}

        {tab === 'orders' && (
          <section className="page-grid">
            <article className="panel form-panel">
              <div className="panel-heading"><div><span className="eyebrow">{t('orders.endpoint')}</span><h2>{t('orders.create')}</h2></div></div>
              <p className="lede">{t('orders.workflowCopy')}</p>
              <div className="form-grid">
                <label>{t('orders.customerId')}<input value={orderForm.customerId} onChange={(e) => setOrderForm({ ...orderForm, customerId: e.target.value })} /></label>
                <label>{t('orders.priority')}<select value={orderForm.priority} onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value as OrderPriority })}><option>STANDARD</option><option>EXPRESS</option><option>SCHEDULED</option></select></label>
                <div className="form-section span-2">{t('orders.pickup')}</div>
                <label>{t('orders.label')}<input value={orderForm.pickupLabel} onChange={(e) => setOrderForm({ ...orderForm, pickupLabel: e.target.value })} /></label>
                <label>{t('orders.address')}<input value={orderForm.pickupAddress} onChange={(e) => setOrderForm({ ...orderForm, pickupAddress: e.target.value })} /></label>
                <label>{t('orders.latitude')}<input type="number" step="0.0001" value={orderForm.pickupLatitude} onChange={(e) => setOrderForm({ ...orderForm, pickupLatitude: Number(e.target.value) })} /></label>
                <label>{t('orders.longitude')}<input type="number" step="0.0001" value={orderForm.pickupLongitude} onChange={(e) => setOrderForm({ ...orderForm, pickupLongitude: Number(e.target.value) })} /></label>
                <div className="form-section span-2">{t('orders.dropoff')}</div>
                <label>{t('orders.label')}<input value={orderForm.dropoffLabel} onChange={(e) => setOrderForm({ ...orderForm, dropoffLabel: e.target.value })} /></label>
                <label>{t('orders.address')}<input value={orderForm.dropoffAddress} onChange={(e) => setOrderForm({ ...orderForm, dropoffAddress: e.target.value })} /></label>
                <label>{t('orders.latitude')}<input type="number" step="0.0001" value={orderForm.dropoffLatitude} onChange={(e) => setOrderForm({ ...orderForm, dropoffLatitude: Number(e.target.value) })} /></label>
                <label>{t('orders.longitude')}<input type="number" step="0.0001" value={orderForm.dropoffLongitude} onChange={(e) => setOrderForm({ ...orderForm, dropoffLongitude: Number(e.target.value) })} /></label>
              </div>
              <button className="button primary large full-button" onClick={() => void createOrder()}>{t('orders.createButton')}</button>
            </article>

            <article className="panel span-2">
              <div className="panel-heading"><div><span className="eyebrow">GET /orders?limit=100</span><h2>{t('orders.recent')}</h2></div><span className="count-chip">{orders.length}</span></div>
              <p className="lede compact-note">{t('orders.latestNote')}</p>
              <div className="filter-bar">
                <label className="filter-search"><span>{t('filters.search')}</span><input value={orderFilters.query} onChange={(e) => setOrderFilters({ ...orderFilters, query: e.target.value })} placeholder={t('filters.ordersPlaceholder')} /></label>
                <label><span>{t('filters.status')}</span><select value={orderFilters.status} onChange={(e) => setOrderFilters({ ...orderFilters, status: e.target.value })}><option value="ALL">{t('filters.all')}</option>{Array.from(new Set(orders.map((order) => order.status))).map((status) => <option value={status} key={status}>{statusLabel(status)}</option>)}</select></label>
                <label><span>{t('orders.priority')}</span><select value={orderFilters.priority} onChange={(e) => setOrderFilters({ ...orderFilters, priority: e.target.value })}><option value="ALL">{t('filters.all')}</option><option>STANDARD</option><option>EXPRESS</option><option>SCHEDULED</option></select></label>
                <button className="filter-clear" onClick={() => setOrderFilters({ query: '', status: 'ALL', priority: 'ALL' })}>{t('filters.clear')}</button>
                <span className="filter-result">{filteredOrders.length}/{orders.length}</span>
              </div>
              <div className="table-wrap"><table><thead><tr><th>{t('orders.order')}</th><th>{t('orders.customer')}</th><th>{t('orders.priority')}</th><th>{t('api.status')}</th><th>{t('orders.driver')}</th><th>{t('orders.updated')}</th><th /></tr></thead><tbody>
                {filteredOrders.map((order) => <tr key={order.id}><td><button className="link-button" onClick={() => setLastResponse(order)}>{shortId(order.id)}</button></td><td>{order.customerId}</td><td>{order.priority}</td><td><StatusPill value={order.status} label={statusLabel(order.status)} /></td><td>{shortId(order.assignedDriverId)}</td><td>{time(order.updatedAt)}</td><td>{!['CANCELLED', 'DELIVERED'].includes(order.status) && <button className="tiny-button" onClick={() => void runAction(async () => { const result = await api.cancelOrder(order.id); await refresh(true); return result; })}>{t('orders.cancel')}</button>}</td></tr>)}
              </tbody></table></div>
            </article>

            <article className="panel full-span what-next-panel">
                <div><span className="eyebrow">{t('orders.whatNext')}</span><h2>{t('guide.step.match')}</h2></div>
                <div className="what-next-steps"><div><span>1</span><p>{t('orders.nextValidate')}</p></div><div><span>2</span><p>{t('orders.nextMatch')}</p></div><div><span>3</span><p>{t('orders.nextAssign')}</p></div></div>
              </article>
          </section>
        )}

        {tab === 'drivers' && (
          <section className="page-grid">
            <article className="status-guide full-span">
                <div><span className="eyebrow">{t('drivers.statusHelp')}</span><h2>{t('drivers.operationsTitle')}</h2><p>{t('drivers.operationsCopy')}</p></div>
                <div className="status-guide-items"><span className="available"><i />{t('drivers.availableHelp')}</span><span className="reserved"><i />{t('drivers.reservedHelp')}</span><span className="offline"><i />{t('drivers.offlineHelp')}</span></div>
              </article>
            <article className="panel form-panel">
              <div className="panel-heading"><div><span className="eyebrow">POST /drivers</span><h2>{t('drivers.register')}</h2></div></div>
              <div className="form-grid one-column">
                <label>{t('drivers.displayName')}<input value={driverForm.displayName} onChange={(e) => setDriverForm({ ...driverForm, displayName: e.target.value })} /></label>
                <label>{t('drivers.capacity')}<input type="number" min="1" value={driverForm.capacity} onChange={(e) => setDriverForm({ ...driverForm, capacity: Number(e.target.value) })} /></label>
              </div>
              <button className="button primary large full-button" onClick={() => void createDriver()}>{t('drivers.create')}</button>
            </article>

            <article className="panel span-2">
              <div className="panel-heading"><div><span className="eyebrow">{t('drivers.capacityReservation')}</span><h2>{t('drivers.fleet')}</h2></div><span className="count-chip">{filteredDrivers.length}/{drivers.length}</span></div>
              <div className="filter-bar compact">
                <label className="filter-search"><span>{t('filters.search')}</span><input value={driverFilters.query} onChange={(e) => setDriverFilters({ ...driverFilters, query: e.target.value })} placeholder={t('filters.driversPlaceholder')} /></label>
                <label><span>{t('filters.status')}</span><select value={driverFilters.status} onChange={(e) => setDriverFilters({ ...driverFilters, status: e.target.value })}><option value="ALL">{t('filters.all')}</option><option value="AVAILABLE">{statusLabel('AVAILABLE')}</option><option value="RESERVED">{statusLabel('RESERVED')}</option><option value="OFFLINE">{statusLabel('OFFLINE')}</option></select></label>
                <button className="filter-clear" onClick={() => setDriverFilters({ query: '', status: 'ALL' })}>{t('filters.clear')}</button>
              </div>
              <div className="driver-cards">
                {filteredDrivers.map((driver) => {
                  const hasActiveReservations = driver.currentLoad > 0 || driver.reservedOrderIds.length > 0;
                  const targetStatus = driver.status === 'OFFLINE' ? 'AVAILABLE' : 'OFFLINE';
                  const availabilityDisabled = targetStatus === 'OFFLINE' && hasActiveReservations;
                  return <article className={`driver-card ${driver.id === selectedDriverId ? 'selected' : ''}`} key={driver.id} onClick={() => setSelectedDriverId(driver.id)}>
                    <div className="driver-card-head"><div className="avatar">{driver.displayName.slice(0, 2).toUpperCase()}</div><div><strong>{driver.displayName}</strong><span>{shortId(driver.id)} · {driver.remainingCapacity} {t('drivers.slotsFree')}</span></div><StatusPill value={driver.status} label={statusLabel(driver.status)} /></div>
                    <div className="capacity"><div><span>{t('drivers.load')}</span><strong>{driver.currentLoad}/{driver.capacity}</strong></div><div className="capacity-track"><i style={{ width: `${(driver.currentLoad / driver.capacity) * 100}%` }} /></div></div>
                    <div className="card-actions">
                      <button className="tiny-button" disabled={availabilityDisabled || driver.status === 'RESERVED'} title={availabilityDisabled ? t('drivers.offlineBlocked') : undefined} onClick={(event) => { event.stopPropagation(); void runAction(async () => { const result = await api.setDriverAvailability(driver.id, targetStatus); await refresh(true); return result; }); }}>{targetStatus === 'OFFLINE' ? t('drivers.setOffline') : t('drivers.setAvailable')}</button>
                      <span>{hasActiveReservations ? `${driver.currentLoad} · ${t('drivers.activeReservation')}` : `${driver.remainingCapacity} ${t('drivers.slotsFree')}`}</span>
                    </div>
                  </article>;
                })}
              </div>
            </article>
          </section>
        )}

        {tab === 'tracking' && (
          <section className="page-grid">
            <article className="panel span-2 map-panel featured-panel">
              <div className="panel-heading"><div><span className="eyebrow">{t('tracking.liveRoom')}</span><h2>{selectedDriver?.displayName ?? t('tracking.mapTitle')}</h2></div><StatusPill value={socketState} label={statusLabel(socketState)} /></div>
              <p className="lede">{t('tracking.operationsCopy')}</p>
              <LiveMap language={language} theme={resolvedTheme} selectedDriverId={selectedDriverId} locations={filteredMapLocations} history={history} orders={orders.filter((order) => order.assignedDriverId === selectedDriverId && !['CANCELLED', 'DELIVERED'].includes(order.status)).slice(0, 3)} stops={driverRoutePlan?.stops ?? []} routeMode="driver" routeEtaMinutes={eta?.estimatedMinutes} routeDistanceKm={driverRoutePlan?.totalDistanceKm} onDriverSelect={setSelectedDriverId} />
              {driverRoutePlan && <div className="route-summary-strip"><div><span>{t('route.plan')}</span><strong>{driverRoutePlan.stops.length} {t('route.stops')}</strong></div><div><span>{t('route.distance')}</span><strong>{driverRoutePlan.totalDistanceKm.toFixed(1)} km</strong></div><div><span>{t('route.eta')}</span><strong>{eta ? `${eta.estimatedMinutes} min` : '—'}</strong></div><button className="tiny-button" onClick={() => setDriverRoutePlan(null)}>{t('route.clear')}</button></div>}
              <div className="tracking-stats">
                <div><span>{t('tracking.latestGps')}</span><strong>{locations[selectedDriverId] ? `${locations[selectedDriverId].latitude.toFixed(4)}, ${locations[selectedDriverId].longitude.toFixed(4)}` : '—'}</strong></div>
                <div><span>{t('tracking.nearby')}</span><strong>{nearby.length}</strong></div>
                <div><span>{t('tracking.eta')}</span><strong>{eta ? `${eta.estimatedMinutes} min` : '—'}</strong></div>
                <div><span>{t('tracking.history')}</span><strong>{history.length} {t('tracking.points')}</strong></div>
              </div>
            </article>

            <article className="panel form-panel tracking-control-panel">
              <div className="panel-heading"><div><span className="eyebrow">HTTP + Socket.IO</span><h2>{t('tracking.publish')}</h2></div></div>
              <div className="form-grid one-column">
                <label>{t('tracking.driver')}<select value={selectedDriverId} onChange={(e) => { autoRouteKeyRef.current = ''; setSelectedDriverId(e.target.value); }}><option value="">{t('tracking.selectDriver')}</option>{drivers.map((driver) => <option value={driver.id} key={driver.id}>{driver.displayName} · {shortId(driver.id)}</option>)}</select></label>
                <label>{t('filters.mapDrivers')}<select value={mapDriverStatus} onChange={(e) => setMapDriverStatus(e.target.value)}><option value="ALL">{t('filters.all')}</option><option value="AVAILABLE">{statusLabel('AVAILABLE')}</option><option value="RESERVED">{statusLabel('RESERVED')}</option><option value="OFFLINE">{statusLabel('OFFLINE')}</option></select></label>
                <label>{t('orders.latitude')}<input type="number" step="0.0001" value={trackingForm.latitude} onChange={(e) => setTrackingForm({ ...trackingForm, latitude: Number(e.target.value) })} /></label>
                <label>{t('orders.longitude')}<input type="number" step="0.0001" value={trackingForm.longitude} onChange={(e) => setTrackingForm({ ...trackingForm, longitude: Number(e.target.value) })} /></label>
                <label>{t('tracking.speed')}<input type="number" value={trackingForm.speedKph} onChange={(e) => setTrackingForm({ ...trackingForm, speedKph: Number(e.target.value) })} /></label>
                <label>{t('tracking.heading')}<input type="number" value={trackingForm.headingDegrees} onChange={(e) => setTrackingForm({ ...trackingForm, headingDegrees: Number(e.target.value) })} /></label>
              </div>
              <div className="split-actions"><button className="button primary" onClick={() => void publishLocation(false)}>{t('tracking.sendRest')}</button><button className="button secondary" onClick={() => void publishLocation(true)}>{t('tracking.sendWs')}</button></div>
              <button className="button soft full-button" onClick={() => void loadTrackingDetails()}>{t('tracking.queryDetails')}</button>
              <button className="button secondary full-button" onClick={() => void buildDriverRoute()} disabled={!selectedDriverId}>{t('route.build')}</button>
            </article>

            <article className="panel full-span">
                <div className="panel-heading"><div><span className="eyebrow">{t('tracking.postgis')}</span><h2>{t('tracking.samples')}</h2></div></div>
                <div className="table-wrap"><table><thead><tr><th>{t('tracking.recorded')}</th><th>{t('orders.latitude')}</th><th>{t('orders.longitude')}</th><th>{t('tracking.speed')}</th><th>{t('tracking.heading')}</th></tr></thead><tbody>{history.slice(0, 12).map((location, index) => <tr key={`${location.recordedAt}-${index}`}><td>{time(location.recordedAt)}</td><td>{location.latitude.toFixed(5)}</td><td>{location.longitude.toFixed(5)}</td><td>{location.speedKph ?? '—'} km/h</td><td>{location.headingDegrees ?? '—'}°</td></tr>)}</tbody></table></div>
              </article>
          </section>
        )}

        {tab === 'dispatch' && (
          <section className="assignment-layout">
            <article className="panel assignment-list-panel">
              <div className="panel-heading"><div><span className="eyebrow">{t('dispatch.readModel')}</span><h2>{t('dispatch.lifecycle')}</h2></div><span className="count-chip">{filteredDispatches.length}/{dispatches.length}</span></div>
              <p className="lede">{t('dispatch.operationsCopy')}</p>
              <div className="filter-bar compact">
                <label className="filter-search"><span>{t('filters.search')}</span><input value={dispatchFilters.query} onChange={(e) => setDispatchFilters({ ...dispatchFilters, query: e.target.value })} placeholder={t('filters.dispatchPlaceholder')} /></label>
                <label><span>{t('filters.status')}</span><select value={dispatchFilters.status} onChange={(e) => setDispatchFilters({ ...dispatchFilters, status: e.target.value })}><option value="ALL">{t('filters.all')}</option>{Array.from(new Set(dispatches.map((item) => item.status))).map((status) => <option value={status} key={status}>{statusLabel(status)}</option>)}</select></label>
                <button className="filter-clear" onClick={() => setDispatchFilters({ query: '', status: 'ALL' })}>{t('filters.clear')}</button>
              </div>
              <div className="table-wrap assignments-table"><table><thead><tr><th>{t('dispatch.dispatch')}</th><th>{t('orders.driver')}</th><th>{t('api.status')}</th><th>{t('orders.updated')}</th><th>{t('dispatch.failure')}</th><th>{t('dispatch.actions')}</th></tr></thead><tbody>{filteredDispatches.map((item) => <tr key={item.id}><td>{shortId(item.orderId)}</td><td>{shortId(item.driverId)}</td><td><StatusPill value={item.status} label={statusLabel(item.status)} /></td><td>{time(item.updatedAt)}</td><td>{item.failureReason ?? '—'}</td><td className="action-cell"><button className="tiny-button" onClick={() => void runAction(async () => { const result = await api.getDispatchDecision(item.id); setDecision(result); return result; })}>{t('dispatch.decision')}</button>{item.driverId && <button className="tiny-button route-action" onClick={() => void openDispatchRoute(item)}>{t('route.view')}</button>}{item.status === 'ASSIGNED' && <button className="tiny-button danger" onClick={() => void runAction(async () => { const result = await api.cancelDispatch(item.id); await refresh(true); return result; })}>{t('dispatch.compensate')}</button>}</td></tr>)}</tbody></table></div>
            </article>
            <article className="panel decision-panel assignment-detail">
              <div className="panel-heading"><div><span className="eyebrow">{t('dispatch.audit')}</span><h2>{t('dispatch.scoring')}</h2></div></div>
              <p className="lede">{t('dispatch.reasonCopy')}</p>
              {decision ? <>
                <div className="decision-summary"><div><span>{t('dispatch.strategy')}</span><strong>{decision.strategyVersion}</strong></div><div><span>{t('dispatch.selected')}</span><strong>{shortId(decision.selectedCandidateId)}</strong></div><div><span>{t('dispatch.radius')}</span><strong>{decision.searchRadiusKm} km</strong></div></div>
                <div className="candidate-list">{rankedCandidates.length ? rankedCandidates.map((candidate, index) => <div className={`candidate-card ${candidate.driverId === decision.selectedCandidateId ? 'selected' : ''}`} key={`${candidate.driverId}-${index}`}><div className="candidate-rank">{index + 1}</div><div className="candidate-body"><div className="candidate-main"><strong>{candidate.driverId === decision.selectedCandidateId ? `✓ ${t('dispatch.selected')}` : `${t('orders.driver')} ${shortId(candidate.driverId)}`}</strong><span>{shortId(candidate.driverId)}</span></div><div className="candidate-metrics"><div className="candidate-metric"><span>{t('dispatch.score')}</span><strong>{typeof candidate.score === 'number' ? candidate.score.toFixed(3) : '—'}</strong></div><div className="candidate-metric"><span>{t('dispatch.distance')}</span><strong>{typeof candidate.distanceKm === 'number' ? `${candidate.distanceKm.toFixed(1)} km` : '—'}</strong></div><div className="candidate-metric"><span>{t('dispatch.eta')}</span><strong>{typeof candidate.etaMinutes === 'number' ? `${candidate.etaMinutes} min` : '—'}</strong></div></div></div></div>) : <div className="empty-state">{t('dispatch.noCandidates')}</div>}</div>
                <div className="technical-payload"><span className="eyebrow">{t('technical.payload')}</span><JsonViewer value={decision} /></div>
              </> : <div className="empty-state tall">{t('dispatch.emptyDecision')}</div>}
            </article>
          </section>
        )}

        {tab === 'optimization' && (
          <section className="page-grid">
            <article className="panel form-panel">
              <div className="panel-heading"><div><span className="eyebrow">paired-insertion-v1</span><h2>{t('optimization.planner')}</h2></div></div>
              <p className="lede">{t('optimization.copy')}</p>
              <div className="planner-purpose"><strong>{t('optimization.labPurpose')}</strong><span>{t('optimization.labPurposeCopy')}</span></div>
              <button className="button primary large full-button" onClick={() => void buildRoutePlan()}>{t('optimization.run')}</button>
              {routePlan && <div className="optimization-metrics"><div><span>{t('optimization.optimized')}</span><strong>{routePlan.totalDistanceKm} km</strong></div><div><span>{t('optimization.sequential')}</span><strong>{routePlan.sequentialDistanceKm} km</strong></div><div><span>{t('optimization.saving')}</span><strong>{routePlan.estimatedDistanceSavingsPct}%</strong></div></div>}
            </article>
            <article className="panel span-2 map-panel featured-panel">
              <div className="panel-heading"><div><span className="eyebrow">{t('optimization.route')}</span><h2>{t('optimization.sequence')}</h2></div></div>
              <LiveMap language={language} theme={resolvedTheme} selectedDriverId={selectedDriverId} locations={filteredMapLocations} stops={routePlan?.stops ?? []} routeMode="optimization" onDriverSelect={setSelectedDriverId} />
              {routePlan && <div className="route-stops">{routePlan.stops.map((stop) => <div key={`${stop.orderId}-${stop.type}`}><span>{stop.sequence}</span><strong>{stop.type}</strong><code>{shortId(stop.orderId)}</code><small>{stop.legDistanceKm} km · load {stop.loadAfter}</small></div>)}</div>}
            </article>
          </section>
        )}

        {tab === 'api' && (
          <section className="page-grid">
            <article className="panel span-2">
              <div className="panel-heading"><div><span className="eyebrow">{t('api.browserGateway')}</span><h2>{t('api.activity')}</h2></div><span className="count-chip">{traces.length}</span></div>
              <div className="table-wrap"><table><thead><tr><th>{t('api.time')}</th><th>{t('api.method')}</th><th>{t('api.path')}</th><th>{t('api.status')}</th><th>{t('api.latency')}</th><th>{t('api.correlation')}</th></tr></thead><tbody>{traces.map((trace, index) => <tr key={`${trace.timestamp}-${index}`}><td>{time(trace.timestamp)}</td><td><code>{trace.method}</code></td><td><code>{trace.path}</code></td><td><StatusPill value={trace.status === 0 ? 'NETWORK' : String(trace.status)} /></td><td>{trace.durationMs.toFixed(1)} ms</td><td><code>{shortId(trace.correlationId)}</code></td></tr>)}</tbody></table></div>
            </article>
            <article className="panel">
              <div className="panel-heading"><div><span className="eyebrow">{t('api.inspector')}</span><h2>{t('api.lastPayload')}</h2></div></div>
              <JsonViewer value={lastResponse} empty={t('api.empty')} />
            </article>
          </section>
        )}
      </main>
    </div>
  );
}
