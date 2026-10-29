import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ToastProvider } from './components/ui/ToastProvider';
import './index.css';

const routerBasename = import.meta.env.BASE_URL.replace(/\/+$/, '');
const showDemoBanner = import.meta.env.VITE_DEMO_BANNER === 'true';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter basename={routerBasename}>
          {showDemoBanner && (
            <div role="note" style={{ background: '#352b1d', color: '#e5b66b', padding: '8px 16px', fontSize: 13, textAlign: 'center' }}>
              Demo: bu yayına backend bağlı değil. Veri gerektiren paneller “Veri alınamadı” gösterir; hiçbir rakam örnek veya uydurma değildir.
            </div>
          )}
          <App />
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
