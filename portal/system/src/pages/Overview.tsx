import { useState, useEffect } from 'react';
import { callRpc } from '../utils/rpc';
import { useLang } from '../providers/LanguageProvider';
import { StatsCards } from '../components/overview/StatsCards';
import { PublicMethods } from '../components/overview/PublicMethods';
import { ServiceCapabilities } from '../components/overview/ServiceCapabilities';

interface Service {
  id: string;
  url: string;
  status: string;
  available: boolean;
  version?: string;
  entities?: Record<string, any>;
  methods?: any[];
}

interface Capability {
  method: string;
  service: string;
  description: string;
  params: any[];
  returns?: string[];
  ai?: boolean;
}

export default function Overview() {
  const { t } = useLang();
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    configured: 0
  });
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [servicesList, setServicesList] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);
  const [publicMethods] = useState<string[]>([
    'user.register', 'user.login_request', 'user.login_verify',
    'login_request', 'login_verify', 'methods',
    'system.capabilities', 'system.list_services', 'system.check_service_status'
  ]);
  const [activeEntityPopover, setActiveEntityPopover] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const services = await callRpc<Service[]>('system.list_services');
      setServicesList(services);
      const newStats = {
        total: services.length,
        online: services.filter(s => s.status === 'online' || s.available).length,
        offline: services.filter(s => s.status === 'offline' && !s.available).length,
        configured: services.filter(s => s.status === 'configured').length
      };
      setStats(newStats);

      const capsMap = await callRpc<Record<string, any>>('system.capabilities');
      const capsArray = Object.entries(capsMap || {}).map(([method, details]) => ({
        method: method,
        service: details.service,
        description: details.desc || details.description || '',
        params: details.params || [],
        returns: details.returns || [],
        ai: details.ai
      }));

      setCapabilities(capsArray);
      const servicesNames = Array.from(new Set(capsArray.map(c => c.service))).sort();
      if (servicesNames.length > 0) {
          setActiveTab(prev => servicesNames.includes(prev) ? prev : servicesNames[0]);
      }
    } catch (err) {
      console.error('Failed to fetch overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  const [userCount, setUserCount] = useState(0);

  const fetchUserStats = async () => {
      try {
          const status = await callRpc<{userCount: number}>('user.get_status');
          if (status && status.userCount !== undefined) {
              setUserCount(status.userCount);
          }
      } catch (e) {
          console.warn('Failed to fetch user stats', e);
      }
  };

  useEffect(() => {
    fetchData();
    fetchUserStats();
    const interval = setInterval(() => {
        fetchData();
        fetchUserStats();
    }, 30000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
      if (activeTab && activeTab !== 'all') {
          setIsChecking(true);
          callRpc('system.check_service_status', { serviceId: activeTab })
            .then((res: any) => {
                if (res && res.status) {
                    setServicesList(prev => prev.map(s => {
                        if (s.id === activeTab) {
                            return { 
                                ...s, 
                                available: res.status === 'online',
                                entities: res.entities || s.entities,
                                methods: res.methods || s.methods
                            };
                        }
                        return s;
                    }));
                }
            })
            .catch(console.error)
            .finally(() => {
                setTimeout(() => setIsChecking(false), 300);
            });
      }
  }, [activeTab]);

  const uniqueServices = Array.from(new Set(capabilities.map(c => c.service))).sort();
  const displayedCaps = capabilities.filter(c => c.service === activeTab);
  const activeServiceDetails = servicesList.find(s => s.id === activeTab);

  return (
    <div className="overview-container" onClick={() => setActiveEntityPopover(null)}>
      <StatsCards stats={stats} userCount={userCount} loading={loading} t={t} />
      <PublicMethods methods={publicMethods} />
      <ServiceCapabilities 
        loading={loading}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        uniqueServices={uniqueServices}
        activeServiceDetails={activeServiceDetails}
        displayedCaps={displayedCaps}
        activeEntityPopover={activeEntityPopover}
        setActiveEntityPopover={setActiveEntityPopover}
        isChecking={isChecking}
        t={t}
      />
    </div>
  );
}
