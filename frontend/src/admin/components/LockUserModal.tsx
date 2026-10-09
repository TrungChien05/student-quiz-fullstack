import { useState } from 'react';
import { X } from 'lucide-react';
import './AdminModals.css';

interface Props {
  userName: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

const LockUserModal = ({ userName, onClose, onConfirm }: Props) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do khóa tài khoản.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch {
      setError('Không thể khóa tài khoản. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-box" onClick={e => e.stopPropagation()}>
        <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Đóng">
          <X size={18} />
        </button>
        <h3 className="admin-modal-title">Khóa tài khoản</h3>
        <p className="admin-modal-subtitle">{userName}</p>
        <form onSubmit={handleSubmit}>
          <label className="admin-modal-label" htmlFor="lock-reason">
            Lý do khóa (user sẽ thấy khi đăng nhập)
          </label>
          <textarea
            id="lock-reason"
            className="admin-modal-textarea"
            rows={3}
            maxLength={300}
            placeholder="Ví dụ: Vi phạm điều khoản sử dụng..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            autoFocus
          />
          <div className="admin-modal-char">{reason.length}/300</div>
          {error && <p className="admin-modal-error">{error}</p>}
          <div className="admin-modal-actions">
            <button type="button" className="admin-btn" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="admin-btn admin-btn-danger" disabled={loading}>
              {loading ? 'Đang khóa...' : 'Khóa tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LockUserModal;
