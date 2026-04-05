import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App.jsx';

import './styles/design-system.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/pages.css';
import './styles/animations.css';

import { migrateFromLocalStorage } from './db/migration.js';
import { seedFoods } from './db/seed.js';
import { initNotifications } from './lib/notifications.js';

if (import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  }).catch(() => {});
}

(async () => {
  await migrateFromLocalStorage();
  await seedFoods();
  initNotifications();
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
