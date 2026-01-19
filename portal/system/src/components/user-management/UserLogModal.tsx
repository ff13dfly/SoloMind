import { useState, useEffect } from 'react';
import { callRpc } from '../../utils/rpc';
import { useUI } from '../../providers/UIProvider';

interface UserLogModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

interface LogRecord {
  prompts: string;
  method: string;
  stamp: number;
  answer: any;
  status: string;
}

export default function UserLogModal({ userId, userName, onClose }: UserLogModalProps) {
  const { toast } = useUI();
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Format: YYYYMM
  const getMonthStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}${m}`;
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const month = getMonthStr(currentDate);
      const result = await callRpc<LogRecord[]>('system.get_interaction_logs', {
        userId,
        month,
        limit: 100
      });
      // Sort by stamp desc
      const sorted = (result || []).sort((a, b) => new Date(b.stamp).getTime() - new Date(a.stamp).getTime());
      setLogs(sorted);
    } catch (err: any) {
      toast.error('Failed to load logs: ' + err.message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentDate, userId]);

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  return (
    <div 
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary, #1c2128)',
          borderRadius: '8px',
          padding: '24px',
          width: '800px',
          height: '600px', // Fixed height
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Interaction Logs: {userName}</h3>
            <div style={{ fontSize: '11px', opacity: 0.6 }}>ID: {userId}</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Month Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                <button 
                  onClick={handlePrevMonth}
                  className="service-btn small"
                  style={{ border: 'none', background: 'none', padding: '4px 8px', cursor: 'pointer', color: 'inherit' }}
                >
                  ◀
                </button>
                <span style={{ padding: '0 8px', fontSize: '13px', fontWeight: 600, minWidth: '80px', textAlign: 'center' }}>
                    {getMonthStr(currentDate)}
                </span>
                <button 
                  onClick={handleNextMonth}
                  className="service-btn small"
                  style={{ border: 'none', background: 'none', padding: '4px 8px', cursor: 'pointer', color: 'inherit' }}
                >
                  ▶
                </button>
            </div>
            
            <button 
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', opacity: 0.6 }}
            >
                ✕
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', padding: '12px' }}>
            {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', opacity: 0.6 }}>Loading...</div>
            ) : logs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', opacity: 0.4 }}>No logs found for this month</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {logs.map((log, i) => (
                        <div key={i} style={{ 
                            background: 'var(--bg-primary, #2d333b)', 
                            borderRadius: '6px',
                            padding: '12px',
                            borderLeft: `3px solid ${log.status === 'FALLBACK' ? '#e74c3c' : '#2ecc71'}`
                        }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11px', opacity: 0.7 }}>
                                 <span style={{ fontFamily: 'monospace' }}>{log.method}</span>
                                 <span>{new Date(log.stamp).toLocaleString()}</span>
                             </div>
                             
                             <div style={{ marginBottom: '8px' }}>
                                 <div style={{ fontSize: '10px', opacity: 0.5, marginBottom: '2px' }}>PROMPT</div>
                                 <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>{log.prompts}</div>
                             </div>
                             
                             <div>
                                 <div style={{ fontSize: '10px', opacity: 0.5, marginBottom: '2px' }}>ANSWER</div>
                                 <div style={{ 
                                     fontSize: '12px', 
                                     fontFamily: 'monospace', 
                                     background: 'rgba(0,0,0,0.2)', 
                                     padding: '8px',
                                     borderRadius: '4px',
                                     whiteSpace: 'pre-wrap',
                                     maxHeight: '100px',
                                     overflowY: 'auto'
                                 }}>
                                     {typeof log.answer === 'object' ? JSON.stringify(log.answer, null, 2) : String(log.answer)}
                                 </div>
                             </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
