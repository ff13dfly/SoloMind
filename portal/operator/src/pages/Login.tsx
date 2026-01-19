import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { callRpc } from '../utils/rpc';
import { setSession, clearSession } from '../utils/auth';
import { deriveLoginHash, computeResponse } from '../utils/crypto';
import { useUI } from '../providers/UIProvider';
import { useLang } from '../providers/LanguageProvider';

export default function Login() {
  const { toast } = useUI();
  const { t } = useLang();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log('[Login] === Starting login flow ===');

    try {
      // 1. Request Challenge (using user service)
      console.log('[Login] Step 1: Requesting challenge...');
      const checkParams = { name: username };
      const challengeRes = await callRpc<{
        challenge: string;
        salt: string;
        iterations: number;
      }>('user.login_request', checkParams);
      console.log('[Login] Step 1 SUCCESS: Got challenge');

      const { challenge, salt, iterations } = challengeRes;

      // 2. Compute Response
      console.log('[Login] Step 2: Computing response...');
      const loginHash = deriveLoginHash(password, username, salt, iterations);
      const response = computeResponse(challenge, loginHash);
      console.log('[Login] Step 2 SUCCESS: Response computed');

      // 3. Verify (using user service)
      console.log('[Login] Step 3: Verifying credentials...');
      const verifyRes = await callRpc<{ success: boolean; token: string; uid: string }>('user.login_verify', {
        name: username,
        challenge,
        response,
        deviceId: 'web_op_' + Date.now()
      });
      console.log('[Login] Step 3 RESULT:', verifyRes);

      if (!verifyRes.success) {
        console.log('[Login] Step 3 FAILED: verifyRes.success is false');
        toast.error(t('login.fail'));
        return;
      }
      console.log('[Login] Step 3 SUCCESS: Token received, uid:', verifyRes.uid);

      // 4. Set session first so subsequent API calls have auth token
      console.log('[Login] Step 4: Setting session token...');
      setSession(verifyRes.token);
      console.log('[Login] Step 4 SUCCESS: Session set');

      // 5. Role Validation - Check if user has operator role (case-insensitive key lookup)
      console.log('[Login] Step 5: Fetching user profile for role check...');
      const profile = await callRpc<{ categories?: Record<string, string> }>('user.profile', { uid: verifyRes.uid });
      console.log('[Login] Step 5 SUCCESS - Profile received:', profile);
      const categories = profile.categories || {};
      console.log('[Login] Categories:', categories);
      // Try both cases for the key
      const userRole = categories['ROLE'] || categories['role'] || '';
      console.log('[Login] UserRole:', userRole);
      
      if (userRole.toLowerCase() !== 'operator') {
        console.log('[Login] Step 5 FAILED: Role is not operator');
        // Clear session if role check fails
        clearSession();
        toast.error(t('login.role_denied') || 'Access denied: Operator role required');
        return;
      }
      console.log('[Login] Step 5 SUCCESS: Role is operator');

      // 6. Success - navigate
      console.log('[Login] === Login complete, navigating ===');
      toast.success(t('login.success'));
      navigate('/');

    } catch (err: any) {
      console.error('[Login] ERROR:', err);
      toast.error(err.message || t('login.fail'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <div className="auth-title">{t('login.title')}</div>
        <div className="auth-status-indicator">{t('login.secure')}</div>
      </div>
      
      <form onSubmit={handleLogin} className="auth-form">
        <div className="form-group">
          <label className="form-label">{t('login.username_label')}</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            autoFocus
            placeholder={t('login.username_placeholder')}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">{t('login.password_label')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder={t('login.password_placeholder')}
          />
        </div>
        
        <button type="submit" className="primary" style={{ width: '100%' }} disabled={loading || !username || !password}>
          {loading ? t('login.authenticating') : t('login.submit')}
        </button>
      </form>
    </div>
  );
}
