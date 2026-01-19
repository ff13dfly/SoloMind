import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { callRpc } from '../utils/rpc';

export interface EntityField {
  type: string;
  description?: string;
  required?: boolean;
}

export interface EntityDefinition {
  description?: string;
  fields: Record<string, EntityField>;
}

export interface Service {
  id: string;
  url: string;
  status: string;
  available: boolean;
  version?: string;
  entities?: Record<string, EntityDefinition>;
  methods?: any[];
}

interface ServicesContextType {
  services: Service[];
  loading: boolean;
  error: string | null;
  refreshServices: () => Promise<void>;
}

const ServicesContext = createContext<ServicesContextType | undefined>(undefined);

export const ServicesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const list = await callRpc<Service[]>('system.list_services');
      setServices(list);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch services:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <ServicesContext.Provider value={{ services, loading, error, refreshServices: fetchServices }}>
      {children}
    </ServicesContext.Provider>
  );
};

export const useServices = () => {
  const context = useContext(ServicesContext);
  if (context === undefined) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  return context;
};
