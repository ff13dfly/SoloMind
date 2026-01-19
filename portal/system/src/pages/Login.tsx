import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { deriveLoginHash, computeResponse } from '../utils/crypto';
import { callRpc } from '../utils/rpc';
import { setSession } from '../utils/auth';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState<Array<{type: string, msg: string, time: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    const time = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [...prev, { type, msg, time }]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setIsLoading(true);
    setLogs([]); // Clear previous logs
    addLog(`Initiating Z-Handshake sequence for user: ${username}`);

    try {
      // Step 1: Request Login (Handshake)
      addLog('Step 1: Requesting challenge from server...', 'info');
      
      const reqStart = Date.now();
      // Changed to RPC call
      const { salt, iterations, challenge } = await callRpc<{salt: string, iterations: number, challenge: string}>('login_request', { username });
      const reqEnd = Date.now();
      
      addLog(`Server responded in ${reqEnd - reqStart}ms`, 'info');
      addLog(`Received Salt: ${salt.substring(0, 8)}...`, 'info');
      addLog(`Received Challenge: ${challenge.substring(0, 8)}...`, 'info');
      addLog(`Iterations: ${iterations} rounds`, 'info');

      // Step 2: Client-side computation
      addLog('Step 2: Deriving keys and computing signature...', 'info');
      
      await new Promise(r => setTimeout(r, 600));

      const loginHash = deriveLoginHash(password, username, salt, iterations);
      addLog('Key derived successfully.', 'success');

      const responseSignature = computeResponse(challenge, loginHash);
      addLog(`Signature generated: ${responseSignature.substring(0, 8)}...`, 'success');

      // Step 3: Verify
      addLog('Step 3: Sending signature for verification...', 'info');
      
      // Changed to RPC call
      const verifyRes = await callRpc<{success: boolean, token: string}>('login_verify', {
        username,
        challenge,
        response: responseSignature
      });

      if (verifyRes.success) {
        addLog('ACCESS GRANTED. Token received.', 'success');
        addLog(`Session Token: ${verifyRes.token.substring(0, 10)}...`, 'success');
        
        // Store Session and Redirect
        setSession(verifyRes.token);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        addLog('Authentication Failed: Verification rejected by server.', 'error');
      }

    } catch (err: any) {
      console.error(err);
      addLog(`Error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <div className="auth-title">SYSTEM :: ACCESS</div>
        <div className="auth-status-indicator">
          {isLoading ? 'PROCESSING' : 'IDLE'}
        </div>
      </div>

      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label className="form-label">Identity (Username)</label>
          <input 
            type="text" 
            value={username}
            onChange={e => setUsername(e.target.value)}
            disabled={isLoading}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Credential (Password)</span>
            <span 
              onClick={() => setShowPassword(!showPassword)}
              style={{ cursor: 'pointer', fontSize: '10px', opacity: 0.6, textDecoration: 'underline' }}
            >
              {showPassword ? 'HIDE' : 'SHOW'}
            </span>
          </label>
          <input 
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <button type="submit" disabled={isLoading} style={{ width: '100%', marginTop: '12px' }}>
          {isLoading ? '>>> EXECUTING PROTOCOL <<<' : 'INITIATE HANDSHAKE'}
        </button>
      </form>

      <div className="status-log">
        {logs.map((log, i) => (
          <div key={i} className={`log-entry ${log.type}`}>
            [{log.time}] {log.msg}
          </div>
        ))}
        {logs.length === 0 && <div className="log-entry info">[SYSTEM READY] Waiting for input...</div>}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
