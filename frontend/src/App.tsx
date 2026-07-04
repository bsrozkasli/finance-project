import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';

import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
