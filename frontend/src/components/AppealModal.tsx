import { useState } from 'react';
import { X, Send } from 'lucide-react';
import './AppealModal.css';

interface Props {
  title: string;
  rejectReason?: string;
  onClose: () => void;
  onSubmit: (message: string) => Promise<void>;
}

const AppealModal = ({ title, rejectReason, onClose, onSubmit }: Props) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Vui lòng nhập nội dung khiếu nại.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSubmit(message.trim());
      onClose();
    } catch {
      setError('Gửi khiếu nại thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="appeal-overlay" onClick={onClose}>
      <div className="appeal-box" onClick={e => e.stopPropagation()}>
        <button type="button" className="appeal-close" onClick={onClose} aria-label="Đóng">
          <X size={18} />
        </button>
        <h3 className="appeal-title">Gửi khiếu nại</h3>
        <p className="appeal-item">{title}</p>
        {rejectReason && (
          <div className="appeal-reject-box">
            <strong>Lý do admin từ chối:</strong>
            <p>{rejectReason}</p>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <label className="appeal-label" htmlFor="appeal-message">
            Nội dung khiếu nại gửi admin
          </label>
          <textarea
            id="appeal-message"
            className="appeal-textarea"
            rows={4}
            maxLength={500}
            placeholder="Giải thích lý do bạn cho rằng nội dung nên được duyệt lại..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            autoFocus
          />
          <div className="appeal-char">{message.length}/500</div>
          {error && <p className="appeal-error">{error}</p>}
          <button type="submit" className="btn btn-primary appeal-submit" disabled={loading}>
            <Send size={16} />
            {loading ? 'Đang gửi...' : 'Gửi khiếu nại'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AppealModal;
