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
import { ExtensionRegistry, DISCOVERABLE_SERVICES } from './ExtensionRegistry';
import GenericEntityPage from './pages/default';

function DynamicRoutes() {
  const { services } = useServices();
  
  // Get IDs of services that are actually online/discovered
  const discoveredIds = services.map(s => s.id);
  
  // Only show services that are in the explicit DISCOVERABLE_SERVICES allowlist
  // AND either discovered OR have a specialized implementation in the registry.
  const allServiceIds = DISCOVERABLE_SERVICES.filter(id => 
    discoveredIds.includes(id) || !!ExtensionRegistry[id]
  );

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
        {allServiceIds.map(id => {
          const Component = ExtensionRegistry[id] || GenericEntityPage;
          return (
            <Route 
              key={id} 
              path={`/${id}`} 
              element={<Component serviceId={id} />} 
            />
          );
        })}
        
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
