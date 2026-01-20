import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { clearSession } from '../utils/auth';
import { useUI } from '../providers/UIProvider';
import { useLang } from '../providers/LanguageProvider';
import { useServices } from '../providers/ServicesProvider';
import { NON_DISCOVERABLE_SERVICES } from '../ExtensionRegistry';

export default function OperatorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm } = useUI();
  const { t, lang, setLang } = useLang();
  const { services } = useServices();

  // Determine active service based on path
  const currentPath = location.pathname;
  const activeServiceId = currentPath.split('/')[1];
  const isDashboard = currentPath === '/dashboard' || currentPath === '/';

  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: t('common.confirm'),
      message: t('dashboard.confirm_logout', { defaultValue: 'Are you sure you want to end your session?' }),
      confirmLabel: t('nav.logout'),
      isDangerous: false
    });

    if (isConfirmed) {
      clearSession();
      navigate('/login');
    }
  };

  // Show all discovered services EXCEPT those in the NON_DISCOVERABLE_SERVICES blacklist.
  // This allows business services (from api/apps/) to be automatically discovered
  // while hiding core infrastructure services (from api/core/).
  const allServiceIds = services
    .map(s => s.id)
    .filter(id => !NON_DISCOVERABLE_SERVICES.includes(id))
    .sort();

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div style={{ paddingBottom: '24px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-color)' }}>OP PORTAL</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>System Management</div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
          <NavButton 
            active={isDashboard} 
            onClick={() => navigate('/dashboard')} 
            label={t('nav.dashboard')} 
          />
          
          {allServiceIds.map(id => (
            <NavButton 
              key={id}
              active={activeServiceId === id} 
              onClick={() => navigate(`/${id}`)} 
              label={t(`nav.${id}`, { defaultValue: id.charAt(0).toUpperCase() + id.slice(1) })} 
            />
          ))}
        </div>

        <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <button 
            onClick={handleLogout}
            style={{ 
              width: '100%', 
              background: 'transparent', 
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              padding: '10px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {t('nav.logout')}
          </button>
        </div>
      </div>
      
      <div className="main-content">
        <div className="content-header">
          <div className="breadcrumb">
            {isDashboard ? t('nav.dashboard') : (
              activeServiceId ? t(`nav.${activeServiceId}`, { defaultValue: activeServiceId.charAt(0).toUpperCase() + activeServiceId.slice(1) }) : ''
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="session-timer">SESSION ACTIVE</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as any)}
              style={{
                fontSize: '12px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                background: 'white',
                color: '#334155',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>
        </div>
        
        <div className="content-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        background: active ? '#f3f4f6' : 'transparent',
        color: active ? 'var(--accent-color)' : 'var(--text-secondary)',
        border: 'none',
        fontWeight: active ? 600 : 500,
        padding: '10px 12px',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
    >
      {label}
    </button>
  );
}
