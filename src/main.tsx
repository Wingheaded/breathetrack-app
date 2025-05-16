// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
// Make sure App.css is imported HERE or in App.tsx
// If there's an 'index.css' import, remove it or make sure App.css is imported instead/also.
import './App.css' // <<< Ensure this line exists and points to the correct file

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)