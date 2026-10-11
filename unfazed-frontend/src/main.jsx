import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

/**
 * main.jsx — Application Entry Point
 * 
 * This is the first JavaScript file that runs.
 * It renders the App component into the #root div in index.html.
 * 
 * StrictMode helps catch potential problems during development
 * by running components twice to detect side effects.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
