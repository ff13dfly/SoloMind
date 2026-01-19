
import { useEffect, useRef } from 'react';
import { useLang } from '../../providers/LanguageProvider';
import type { Message } from './types';

interface AIMobileSimulatorProps {
  isRunning: boolean;
  currentCaseIdx: number;
  totalCases: number;
  messages: Message[];
  isGenerating: boolean;
  selectedWfId: string;
  testerToken: string | null;
  testerUser: string;
  setTesterUser: (u: string) => void;
  testerPwd: string;
  setTesterPwd: (p: string) => void;
  handleTesterLogin: () => void;
  handleTesterLogout: () => void;
  highlightLogin?: boolean;
}

export default function AIMobileSimulator({
  isRunning,
  currentCaseIdx,
  totalCases,
  messages,
  isGenerating,
  selectedWfId,
  testerToken,
  testerUser,
  setTesterUser,
  testerPwd,
  setTesterPwd,
  handleTesterLogin,
  handleTesterLogout,
  highlightLogin
}: AIMobileSimulatorProps) {
  const { t } = useLang();
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="ai-simulator">
      <div className="phone-mock">
        <div className="phone-header">
          {isRunning ? t('ai_support.sim_running', { current: currentCaseIdx + 1, total: totalCases }) : t('ai_support.simulator_title')}
        </div>
        <div className="phone-screen">
          <div className="chat-area">
            {messages.length === 0 && !isGenerating && (
              <div style={{ textAlign: 'center', marginTop: '100px', opacity: 0.5, fontSize: '13px' }}>
                {t('ai_support.sim_waiting')}
              </div>
            )}
            {isGenerating && (
              <div style={{ textAlign: 'center', marginTop: '100px', opacity: 0.8, fontSize: '13px', color: 'var(--accent-color)' }}>
                {t('ai_support.sim_generating', { id: selectedWfId })}
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.role}`}>
                {msg.role === 'system' ? (
                  <div style={{ fontSize: '11px', fontWeight: 'bold', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px', marginTop: '4px' }}>
                    [SYS] {msg.content}
                  </div>
                ) : msg.content}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
        <div className="phone-footer">
          <div className="phone-input" />
        </div>
      </div>

      <div className={`tester-session ${highlightLogin ? 'login-needed' : ''}`}>
        <div className="tester-title">{t('ai_support.tester_title')}</div>
        
        {!testerToken ? (
          <>
            <div className="form-group">
              <label className="tester-label" style={{ fontSize: '11px', marginBottom: '8px', display: 'block' }}>{t('ai_support.tester_label_user')}</label>
              <input 
                className="tester-select" 
                value={testerUser} 
                onChange={e => setTesterUser(e.target.value)}
                placeholder={t('ai_support.tester_placeholder_user')}
              />
            </div>
            <div className="form-group">
              <label className="tester-label" style={{ fontSize: '11px', marginBottom: '8px', display: 'block' }}>{t('ai_support.tester_label_pwd')}</label>
              <input 
                type="password"
                className="tester-select" 
                value={testerPwd} 
                onChange={e => setTesterPwd(e.target.value)}
                placeholder={t('ai_support.tester_placeholder_pwd')}
                onKeyDown={e => e.key === 'Enter' && handleTesterLogin()}
              />
            </div>
            <button className="service-btn" style={{ width: '100%', fontSize: '12px' }} onClick={handleTesterLogin}>
              {t('ai_support.tester_btn_login')}
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold' }}>👤 {testerUser}</span>
              <button 
                className="service-btn small danger" 
                style={{ fontSize: '10px', height: 'auto', padding: '4px 8px' }}
                onClick={handleTesterLogout}
              >
                {t('ai_support.tester_btn_logout')}
              </button>
            </div>
            <div className="tester-info" style={{ color: 'var(--success-color)', background: 'rgba(63, 185, 80, 0.1)' }}>
              TOKEN: {testerToken.substring(0, 10)}... (ACTIVE)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
