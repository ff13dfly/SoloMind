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
  const styles: any = {
    container: {
      background: '#ffffff', // White for office theme
      border: '1px solid #e5e7eb',
      borderLeftWidth: '4px',
      borderRadius: '6px',
      padding: '12px 16px',
      marginBottom: '12px',
      color: '#1f2937', // Dark gray text
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minWidth: '300px',
      maxWidth: '400px',
      animation: 'slideIn 0.3s ease-out'
    },
    success: { borderLeftColor: '#10b981' },
    error: { borderLeftColor: '#ef4444' },
    info: { borderLeftColor: '#3b82f6' }
  };

  return (
    <div 
      style={{
        ...styles.container,
        ...styles[toast.type]
      }}
    >
      <div style={{ marginRight: '12px', fontSize: '14px', fontWeight: 500 }}>{toast.message}</div>
      <button 
        onClick={() => onClose(toast.id)}
        style={{ 
          background: 'transparent', 
          border: 'none', 
          color: '#9ca3af', 
          cursor: 'pointer',
          padding: 0,
          fontSize: '18px',
          lineHeight: 1
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
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(2px)'
    }}>
      <div className="panel" style={{ width: '400px', background: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', borderRadius: '12px' }}>
        <div className="panel-title" style={{ color: options.isDangerous ? '#ef4444' : '#1f2937', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
          {options.title || 'Please Confirm'}
        </div>
        <div className="panel-content">
          <p style={{ margin: '0 0 24px 0', color: '#4b5563', fontSize: '14px' }}>{options.message}</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="service-btn" onClick={onCancel}>
              {options.cancelLabel || 'Cancel'}
            </button>
            <button 
              className={`service-btn ${options.isDangerous ? 'danger' : ''}`}
              style={!options.isDangerous ? { background: '#2563eb', color: 'white', borderColor: '#2563eb' } : {}}
              onClick={onConfirm}
            >
              {options.confirmLabel || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const UIProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: { message: '' },
    resolve: null
  });

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg: string) => addToast('success', msg),
    error: (msg: string) => addToast('error', msg),
    info: (msg: string) => addToast('info', msg)
  };

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
      
      <div style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '12px'
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>

      <ConfirmModal 
        isOpen={confirmState.isOpen}
        options={confirmState.options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </UIContext.Provider>
  );
};
