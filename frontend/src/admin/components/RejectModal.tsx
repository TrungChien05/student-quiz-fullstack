import { useState } from 'react';
import { X } from 'lucide-react';
import './AdminModals.css';

interface Props {
  title: string;
  itemLabel: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

const RejectModal = ({ title, itemLabel, onClose, onConfirm }: Props) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do từ chối.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch {
      setError('Không thể từ chối. Vui lòng thử lại.');
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
        <h3 className="admin-modal-title">{title}</h3>
        <p className="admin-modal-subtitle">{itemLabel}</p>
        <form onSubmit={handleSubmit}>
          <label className="admin-modal-label" htmlFor="reject-reason">
            Lý do từ chối (user sẽ nhận được)
          </label>
          <textarea
            id="reject-reason"
            className="admin-modal-textarea"
            rows={4}
            maxLength={500}
            placeholder="Ví dụ: Nội dung không phù hợp quy định cộng đồng..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            autoFocus
          />
          <div className="admin-modal-char">{reason.length}/500</div>
          {error && <p className="admin-modal-error">{error}</p>}
          <div className="admin-modal-actions">
            <button type="button" className="admin-btn" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="admin-btn admin-btn-danger" disabled={loading}>
              {loading ? 'Đang gửi...' : 'Xác nhận từ chối'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RejectModal;
