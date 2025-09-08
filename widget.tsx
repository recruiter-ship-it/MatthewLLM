import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // The App component contains all logic, we reuse it

const rootElement = document.getElementById('matthew-widget-root');
if (!rootElement) {
  throw new Error("Could not find widget root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* We reuse the main App component, it will detect it's in an extension */}
    <App />
  </React.StrictMode>
);
