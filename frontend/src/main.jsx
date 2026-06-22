import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ThemeProvider } from './theme/ThemeContext.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import { FeedbackProvider } from './ui/FeedbackContext.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <FeedbackProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </FeedbackProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
