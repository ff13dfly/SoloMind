import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { isValidSession } from './utils/auth';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!isValidSession()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

import { LanguageProvider } from './providers/LanguageProvider';

// ... existing code ...

import { UIProvider } from './providers/UIProvider';

function App() {
  return (
    <UIProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/*" 
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              } 
            />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </UIProvider>
  );
}

export default App;
