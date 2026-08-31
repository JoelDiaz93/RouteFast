import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import 'leaflet/dist/leaflet.css';
import './styles.css';

const storedTheme = globalThis.localStorage?.getItem('routefast.theme');
const initialTheme = storedTheme === 'light' || storedTheme === 'dark'
  ? storedTheme
  : globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
document.documentElement.dataset.theme = initialTheme;
document.documentElement.style.colorScheme = initialTheme;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
