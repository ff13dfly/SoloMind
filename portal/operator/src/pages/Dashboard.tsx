import { useLang } from '../providers/LanguageProvider';

export default function Dashboard() {
  const { t } = useLang();

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card online">
          <div className="stat-label">{t('dashboard.system_status')}</div>
          <div className="stat-value">ONLINE</div>
          <div className="stat-bar"><div className="bar-fill" style={{ width: '100%' }}></div></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('dashboard.active_sessions')}</div>
          <div className="stat-value">1,248</div>
          <div className="stat-bar"><div className="bar-fill" style={{ width: '65%', background: '#2563eb' }}></div></div>
        </div>
        <div className="stat-card pending">
          <div className="stat-label">{t('dashboard.total_users')}</div>
          <div className="stat-value">14</div>
          <div className="stat-bar"><div className="bar-fill" style={{ width: '30%' }}></div></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">{t('dashboard.overview').toUpperCase()}</div>
        <div className="panel-content">
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            System operating normally.
          </div>
        </div>
      </div>
    </>
  );
}
