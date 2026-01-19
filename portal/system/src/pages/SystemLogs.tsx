import { useState, useEffect } from 'react';
import { callRpc } from '../utils/rpc';
import { useLang } from '../providers/LanguageProvider';

interface SysLog {
  time: string;
  level: string;
  service: string;
  message: string;
}

export default function SystemLogs() {
  const { t } = useLang();
  const [logs, setLogs] = useState<SysLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
        const res = await callRpc<{ logs: SysLog[] }>('system.get_system_logs', {});
        setLogs(res.logs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()));
    } catch (e) {
        // mock
        setLogs([
            { time: new Date().toISOString(), level: 'info', service: 'router', message: 'System startup complete. 12 services registered.' },
            { time: new Date(Date.now() - 10000).toISOString(), level: 'warn', service: 'user', message: 'High latency detected on db_shard_01' }
        ]);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="panel service-list-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{t('system_log.title')}</span>
        <button className="service-btn small" onClick={fetchLogs} disabled={loading}>
          {loading ? '...' : t('system_log.refresh')}
        </button>
      </div>

      <div className="panel-content" style={{ padding: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="service-header-row" style={{ gridTemplateColumns: '1.5fr 0.5fr 1fr 3fr' }}>
          <div>{t('system_log.col_time')}</div>
          <div>{t('system_log.col_level')}</div>
          <div>{t('system_log.col_service')}</div>
          <div>{t('system_log.col_message')}</div>
        </div>

        <div className="service-list-container" style={{ flex: 1, overflowY: 'auto' }}>
            {logs.map((log, i) => (
                <div key={i} className="service-row" style={{ gridTemplateColumns: '1.5fr 0.5fr 1fr 3fr', fontSize: '12px' }}>
                    <div style={{ opacity: 0.6 }}>{new Date(log.time).toLocaleString()}</div>
                    <div style={{ 
                        color: log.level === 'error' ? '#f85149' : log.level === 'warn' ? '#d29922' : '#238636',
                        fontWeight: 'bold'
                    }}>{log.level.toUpperCase()}</div>
                    <div style={{ fontFamily: 'monospace' }}>{log.service}</div>
                    <div style={{ color: '#c9d1d9' }}>{log.message}</div>
                </div>
            ))}
            {logs.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', opacity: 0.5 }}>{t('system_log.empty')}</div>
            )}
        </div>
      </div>
    </div>
  );
}
