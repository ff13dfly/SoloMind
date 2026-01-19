import React from 'react';

interface StatsProps {
  stats: {
    total: number;
    online: number;
    offline: number;
    configured: number;
  };
  userCount: number;
  loading: boolean;
  t: (key: string) => string;
}

export const StatsCards: React.FC<StatsProps> = ({ stats, userCount, loading, t }) => {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-label">{t('overview.total_users')}</div>
        <div className="stat-value">{loading ? '...' : userCount}</div>
        <div className="stat-bar"><div className="bar-fill" style={{ width: '100%', background: '#3498db', boxShadow: '0 0 8px rgba(52, 152, 219, 0.3)' }}></div></div>
      </div>
      <div className="stat-card">
        <div className="stat-label">{t('overview.total_services')}</div>
        <div className="stat-value">{loading ? '...' : stats.total}</div>
        <div className="stat-bar"><div className="bar-fill" style={{ width: '100%' }}></div></div>
      </div>
      <div className="stat-card online">
        <div className="stat-label">{t('overview.online')}</div>
        <div className="stat-value">{loading ? '...' : stats.online}</div>
        <div className="stat-bar"><div className="bar-fill" style={{ width: `${(stats.online / stats.total) * 100 || 0}%` }}></div></div>
      </div>
      <div className="stat-card offline">
        <div className="stat-label">{t('overview.offline_error')}</div>
        <div className="stat-value">{loading ? '...' : stats.offline}</div>
        <div className="stat-bar"><div className="bar-fill" style={{ width: `${(stats.offline / stats.total) * 100 || 0}%` }}></div></div>
      </div>
      <div className="stat-card pending">
        <div className="stat-label">{t('overview.configured')}</div>
        <div className="stat-value">{loading ? '...' : stats.configured}</div>
        <div className="stat-bar"><div className="bar-fill" style={{ width: `${(stats.configured / stats.total) * 100 || 0}%` }}></div></div>
      </div>
    </div>
  );
};
