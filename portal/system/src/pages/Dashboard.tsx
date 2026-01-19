import { clearSession } from '../utils/auth';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import ServiceManagement from './ServiceManagement';
import SystemLogs from './SystemLogs';
import Overview from './Overview';
import UserManagement from './UserManagement';
import WorkflowManagement from './WorkflowManagement';
import AISupport from './AISupport';
import ErrorLogs from './ErrorLogs';
import { useLang } from '../providers/LanguageProvider';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang, setLang } = useLang();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const menuItems = [
    { label: 'Overview', id: 'overview', path: '/overview', name: t('nav.dashboard') },
    { label: 'Service', id: 'service', path: '/services', name: t('nav.services') },
    { label: 'User Management', id: 'users', path: '/users', name: t('nav.users') },
    { label: 'Workflows', id: 'workflows', path: '/workflows', name: t('nav.workflows') },
    { label: 'AI Support', id: 'ai_support', path: '/ai', name: t('nav.ai_support') },
    { label: 'Error Logs', id: 'errors', path: '/errors', name: t('nav.errors') },
    { label: 'System Logs', id: 'logs', path: '/logs', name: t('nav.logs') },
  ];

  // Determine active item based on current path
  const activeItem = menuItems.find(item => item.path === location.pathname) || menuItems[0];

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <span>{t('dashboard.header')}</span>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button 
              key={item.id} 
              className={`nav-item ${activeItem.id === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              {`> ${item.name}`}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            [ {t('nav.logout')} ]
          </button>
        </div>
      </div>
      
      <main className="main-content">
        <div className="content-header">
          <div className="breadcrumb">
            {t('dashboard.breadcrumb_root')} / {activeItem.name.toUpperCase()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="session-timer">{t('dashboard.session_active')}</div>
            <select 
                value={lang} 
                onChange={(e) => setLang(e.target.value as any)}
                style={{
                    background: 'transparent',
                    color: '#8b949e',
                    border: '1px solid #30363d',
                    borderRadius: '4px',
                    padding: '2px 4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    outline: 'none'
                }}
            >
                <option value="en">ENGLISH</option>
                <option value="zh">中文</option>
            </select>
          </div>
        </div>
        <div className="content-body">
            <Routes>
                <Route path="overview" element={<Overview />} />
                <Route path="services" element={<ServiceManagement />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="workflows" element={<WorkflowManagement />} />
                <Route path="ai" element={<AISupport />} />
                <Route path="errors" element={<ErrorLogs />} />
                <Route path="logs" element={<SystemLogs />} />
                <Route path="/" element={<Navigate to="/overview" replace />} />
                <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
        </div>
      </main>
    </div>
  );
}
