import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import './ConfirmModal.css';

type DialogVariant = 'primary' | 'danger' | 'success' | 'warning';

interface Props {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  theme?: 'light' | 'admin';
  showCancel?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantIcon = {
  primary: Info,
  danger: AlertTriangle,
  success: CheckCircle2,
  warning: AlertTriangle,
};

const ConfirmModal = ({
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'primary',
  theme = 'light',
  showCancel = true,
  loading = false,
  onConfirm,
  onCancel,
}: Props) => {
  const Icon = variantIcon[variant];

  return (
    <div className={`confirm-overlay confirm-overlay--${theme}`} onClick={onCancel}>
      <div
        className={`confirm-box confirm-box--${theme} confirm-box--${variant}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <button type="button" className="confirm-close" onClick={onCancel} aria-label="Đóng">
          <X size={18} />
        </button>
        <div className={`confirm-icon confirm-icon--${variant}`}>
          <Icon size={24} />
        </div>
        <h3 id="confirm-title" className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          {showCancel && (
            <button
              type="button"
              className={`confirm-btn confirm-btn--cancel confirm-btn--${theme}`}
              onClick={onCancel}
              disabled={loading}
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            className={`confirm-btn confirm-btn--${variant}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
