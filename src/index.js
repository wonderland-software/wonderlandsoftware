import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const container = document.getElementById('root');
const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// `npm run build` prerenders the page into index.html so crawlers and AI
// bots get real content without executing JS. When that markup is present we
// hydrate it; otherwise (dev server) we do a normal client render.
if (container.hasChildNodes()) {
  ReactDOM.hydrateRoot(container, app);
} else {
  ReactDOM.createRoot(container).render(app);
}
