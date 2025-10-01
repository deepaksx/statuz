import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import './index.css';

// Add error logging
window.addEventListener('error', (e) => {
  console.error('💥 Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('💥 Unhandled promise rejection:', e.reason);
});

console.log('🚀 Renderer starting...');

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" />
      </BrowserRouter>
    </React.StrictMode>,
  );
  console.log('✅ React app mounted');
} catch (error) {
  console.error('💥 Failed to mount React app:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; color: red;">
      <h1>Failed to start app</h1>
      <pre>${error}</pre>
    </div>
  `;
}