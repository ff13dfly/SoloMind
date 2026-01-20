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
import { ServicesProvider, useServices } from './providers/ServicesProvider';
import OperatorLayout from './layouts/OperatorLayout';
import { NON_DISCOVERABLE_SERVICES } from './ExtensionRegistry';
import GenericEntityPage from './pages/default';

function DynamicRoutes() {
  const { services } = useServices();
  
  // Show all discovered services EXCEPT those in the NON_DISCOVERABLE_SERVICES blacklist.
  // This allows business services (from api/apps/) to be automatically discovered
  // while hiding core infrastructure services (from api/core/).
  const allServiceIds = services
    .map(s => s.id)
    .filter(id => !NON_DISCOVERABLE_SERVICES.includes(id));

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route 
        element={
          <RequireAuth>
            <OperatorLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Dynamic Service Routes */}
        {allServiceIds.map(id => (
          <Route 
            key={id} 
            path={`/${id}`} 
            element={<GenericEntityPage serviceId={id} />} 
          />
        ))}
        
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <LanguageProvider>
      <ServicesProvider>
        <BrowserRouter>
          <DynamicRoutes />
        </BrowserRouter>
      </ServicesProvider>
    </LanguageProvider>
  );
}

export default App;
