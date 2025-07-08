import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Importing global CSS styles
import { RouterProvider } from 'react-router-dom'; // Importing RouterProvider for routing

import './i18n'; // Importing internationalization configuration
import { router } from './routes'; // Importing the router configuration

// Creating a root element and rendering the application
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode> {/* Enabling strict mode for highlighting potential problems */}
    <RouterProvider router={router} /> {/* Providing the router to the application */}
  </React.StrictMode>
);
