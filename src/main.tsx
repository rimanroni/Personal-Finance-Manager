import ReactDOM from 'react-dom/client';
import App from './App';
import { DataProvider } from './context/DataContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <DataProvider>
    <App />
  </DataProvider>
);

// Service worker is production-only. In dev it would cache Vite's transformed
// modules (@vite/client, /src/*.tsx, deps) and serve stale code after edits,
// which breaks HMR and can produce bogus "export not found" errors.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
