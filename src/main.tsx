import React from 'react'
import { createRoot } from 'react-dom/client'
import "react-day-picker/style.css";
import "./index.css";
import App from './App.tsx'

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
