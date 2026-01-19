import React, { createContext, useContext, useState, useCallback } from 'react';

// --- Types ---
type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
}

interface UIContextType {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const UIContext = createContext<UIContextType | null>(null);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within UIProvider');
  return context;
};

// --- Components ---

const ToastItem = ({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) => {
  const bgColors = {
    success: '#1a7f37',
    error: '#cf222e',
    info: '#0969da'
  };

  return (
    <div 
      style={{
        background: '#161b22',
        border: `1px solid ${bgColors[toast.type]}`,
        borderLeft: `4px solid ${bgColors[toast.type]}`,
        borderRadius: '6px',
        padding: '12px 16px',
        marginBottom: '12px',
        color: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minWidth: '300px',
        maxWidth: '400px',
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      <div style={{ marginRight: '12px', fontSize: '14px' }}>{toast.message}</div>
      <button 
        onClick={() => onClose(toast.id)}
        style={{ 
          background: 'transparent', 
          border: 'none', 
          color: 'rgba(255,255,255,0.5)', 
          cursor: 'pointer',
          padding: 0,
          fontSize: '16px'
        }}
      >
        ×
      </button>
    </div>
  );
};

const ConfirmModal = ({ 
  isOpen, 
  options, 
  onConfirm, 
  onCancel 
}: { 
  isOpen: boolean; 
  options: ConfirmOptions; 
  onConfirm: () => void; 
  onCancel: () => void; 
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999
    }}>
      <div className="panel" style={{ width: '400px', background: '#0d1117', border: '1px solid #30363d', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', borderRadius: '8px' }}>
        <div className="panel-title" style={{ color: options.isDangerous ? '#da3633' : '#58a6ff' }}>
          {options.title || 'CONFIRM ACTION'}
        </div>
        <div className="panel-content">
          <p style={{ margin: '0 0 24px 0', color: '#c9d1d9' }}>{options.message}</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="service-btn" onClick={onCancel}>
              {options.cancelLabel || 'CANCEL'}
            </button>
            <button 
              className={`service-btn ${options.isDangerous ? 'danger' : ''}`}
              style={!options.isDangerous ? { borderColor: '#2ea043', color: '#2ea043' } : {}}
              onClick={onConfirm}
            >
              {options.confirmLabel || 'CONFIRM'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const UIProvider = ({ children }: { children: React.ReactNode }) => {
  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Confirm State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: { message: '' },
    resolve: null
  });

  // --- Toast Logic ---
  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000); // Auto remove after 5s
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg: string) => addToast('success', msg),
    error: (msg: string) => addToast('error', msg),
    info: (msg: string) => addToast('info', msg)
  };

  // --- Confirm Logic ---
  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmState.resolve) confirmState.resolve(true);
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  }, [confirmState]);

  const handleCancel = useCallback(() => {
    if (confirmState.resolve) confirmState.resolve(false);
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  }, [confirmState]);

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}
      
      {/* Toast Container */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end'
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>

      {/* Confirm Modal */}
      <ConfirmModal 
        isOpen={confirmState.isOpen}
        options={confirmState.options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </UIContext.Provider>
  );
};
