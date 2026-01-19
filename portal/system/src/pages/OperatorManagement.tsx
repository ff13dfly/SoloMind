import { useState, useEffect } from 'react';
import { callRpc } from '../utils/rpc';
import { deriveLoginHash, generateSalt } from '../utils/crypto';
import { useUI } from '../providers/UIProvider';
import { useLang } from '../providers/LanguageProvider';

interface Operator {
  id: string;
  name: string;
  create: string;
  last: string;
  disabled?: boolean;
}

export default function OperatorManagement() {
  const { toast, confirm } = useUI();
  const { t } = useLang();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [targetOperator, setTargetOperator] = useState<Operator | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchOperators = async () => {
    setLoading(true);
    try {
      const result = await callRpc<{ operators: Operator[] }>('operator.list', {});
      const sorted = result.operators.sort((a, b) => new Date(b.create).getTime() - new Date(a.create).getTime());
      setOperators(sorted);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to load operators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperators();
  }, []);

  const handleToggleStatus = async (op: Operator) => {
    const isConfirmed = await confirm({
      message: t(op.disabled ? 'operator.confirm_enable' : 'operator.confirm_disable', { name: op.name }),
      confirmLabel: t(op.disabled ? 'operator.confirm_btn_enable' : 'operator.confirm_btn_disable'),
      isDangerous: !op.disabled
    });
    
    if (!isConfirmed) return;
    
    try {
      await callRpc('operator.update_status', {
        name: op.name,
        disabled: !op.disabled
      });
      toast.success(t('operator.toast_status_success', { 
          name: op.name, 
          action: t(op.disabled ? 'operator.btn_enable' : 'operator.btn_disable') 
      }));
      fetchOperators();
    } catch (err: any) {
      toast.error('Failed to update status: ' + err.message);
    }
  };

  const openPasswordModal = (op: Operator) => {
    setTargetOperator(op);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handleChangePassword = async () => {
    if (!targetOperator || !newPassword) return;
    
    try {
      const salt = generateSalt();
      const hash = deriveLoginHash(newPassword, targetOperator.name, salt, 200000);
      
      await callRpc('operator.change_password', {
        name: targetOperator.name,
        salt,
        hash
      });
      
      toast.success(t('operator.toast_pwd_success', { name: targetOperator.name }));
      setShowPasswordModal(false);
      setTargetOperator(null);
    } catch (err: any) {
      toast.error('Failed to change password: ' + err.message);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '-';
    try { return new Date(iso).toLocaleString(); } catch (e) { return iso; }
  };

  return (
    <div className="panel service-list-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{t('operator.title')}</span>
        <button className="service-btn small" onClick={fetchOperators} disabled={loading}>
          {loading ? '...' : t('operator.refresh')}
        </button>
      </div>
      
      <div className="panel-content" style={{ padding: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="service-header-row" style={{ gridTemplateColumns: '1.5fr 2fr 1fr 1.5fr 2fr' }}>
          <div>{t('operator.col_uid')}</div>
          <div>{t('operator.col_name')}</div>
          <div>{t('operator.col_status')}</div>
          <div>{t('operator.col_created')}</div>
          <div style={{ textAlign: 'right' }}>{t('operator.col_actions')}</div>
        </div>

        <div className="service-list-container" style={{ flex: 1, overflowY: 'auto' }}>
          {operators.map(op => (
            <div key={op.id} className="service-row" style={{ gridTemplateColumns: '1.5fr 2fr 1fr 1.5fr 2fr' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', opacity: 0.8 }} title={op.id}>{op.id.substring(0, 8)}...</div>
              <div style={{ fontWeight: 500, color: 'var(--text-color)' }}>{op.name}</div>
              <div>
                <span className={`method-tag ${op.disabled ? 'disabled' : 'active'}`} 
                      style={{ color: op.disabled ? 'var(--error-color)' : 'var(--success-color)', borderColor: 'currentColor' }}>
                    {op.disabled ? t('operator.status_disabled') : t('operator.status_active')}
                </span>
              </div>
              <div style={{ fontSize: '11px', opacity: 0.6 }}>{formatDate(op.create)}</div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button 
                  className="service-btn"
                  style={{ fontSize: '10px', padding: '4px 8px' }}
                  onClick={() => openPasswordModal(op)}
                >
                  {t('operator.btn_reset')}
                </button>
                <button 
                  className={`service-btn ${op.disabled ? '' : 'danger'}`}
                  style={{ fontSize: '10px', padding: '4px 8px' }}
                  onClick={() => handleToggleStatus(op)}
                >
                  {op.disabled ? t('operator.btn_enable') : t('operator.btn_disable')}
                </button>
              </div>
            </div>
          ))}
          
          {!loading && operators.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', opacity: 0.5 }}>{t('operator.empty')}</div>
          )}
        </div>
      </div>

      {showPasswordModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="panel" style={{ width: '400px', background: '#0d1117', border: '1px solid var(--accent-color)' }}>
            <div className="panel-title">{t('operator.modal_title', { name: targetOperator?.name || '' })}</div>
            <div className="panel-content">
              <div className="form-group">
                <label className="form-label">{t('operator.modal_label')}</label>
                <input 
                  type="text" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder={t('operator.modal_placeholder')}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button className="service-btn" onClick={() => setShowPasswordModal(false)}>{t('operator.modal_cancel')}</button>
                <button className="service-btn" style={{ borderColor: 'var(--success-color)', color: 'var(--success-color)' }} onClick={handleChangePassword}>{t('operator.modal_confirm')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
