import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import ConfirmModal from '../components/ConfirmModal';

type DialogVariant = 'primary' | 'danger' | 'success' | 'warning';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  theme?: 'light' | 'admin';
}

interface AlertOptions {
  title: string;
  message: string;
  confirmText?: string;
  variant?: DialogVariant;
  theme?: 'light' | 'admin';
}

interface DialogState {
  type: 'confirm' | 'alert';
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  variant: DialogVariant;
  theme: 'light' | 'admin';
  loading: boolean;
  resolve?: (value: boolean) => void;
}

interface DialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const close = useCallback((result: boolean) => {
    setDialog(prev => {
      prev?.resolve?.(result);
      return null;
    });
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      setDialog({
        type: 'confirm',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText ?? 'Xác nhận',
        cancelText: options.cancelText ?? 'Hủy',
        variant: options.variant ?? 'primary',
        theme: options.theme ?? 'light',
        loading: false,
        resolve,
      });
    });
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>(resolve => {
      setDialog({
        type: 'alert',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText ?? 'Đã hiểu',
        variant: options.variant ?? 'primary',
        theme: options.theme ?? 'light',
        loading: false,
        resolve: () => resolve(),
      });
    });
  }, []);

  const handleConfirm = async () => {
    if (!dialog) return;
    if (dialog.type === 'alert') {
      close(true);
      return;
    }
    close(true);
  };

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog && (
        <ConfirmModal
          theme={dialog.theme}
          title={dialog.title}
          message={dialog.message}
          confirmText={dialog.confirmText}
          cancelText={dialog.cancelText}
          variant={dialog.variant}
          showCancel={dialog.type === 'confirm'}
          loading={dialog.loading}
          onConfirm={handleConfirm}
          onCancel={() => close(false)}
        />
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog phải dùng trong DialogProvider');
  }
  return ctx;
};
