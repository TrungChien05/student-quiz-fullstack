import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { achievementService } from '../services/achievementService';
import type { AchievementBadge } from '../types';
import './BadgeUnlockModal.css';

const BadgeUnlockModal = () => {
  const { isAuthenticated, user } = useAuth();
  const [queue, setQueue] = useState<AchievementBadge[]>([]);
  const [closing, setClosing] = useState(false);

  const loadUnseen = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setQueue(await achievementService.getUnseenBadges());
    } catch (error) {
      console.error('Không thể tải huy hiệu mới:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setQueue([]);
      return;
    }
    const timer = window.setTimeout(loadUnseen, 900);
    window.addEventListener('studentquizz:achievement-updated', loadUnseen);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('studentquizz:achievement-updated', loadUnseen);
    };
  }, [isAuthenticated, user?.id, loadUnseen]);

  const current = queue[0];
  if (!current) return null;

  const handleClose = async () => {
    if (closing) return;
    setClosing(true);
    try {
      await achievementService.acknowledge(current.userBadgeId);
      setQueue(items => items.slice(1));
    } catch (error) {
      console.error('Không thể xác nhận huy hiệu:', error);
    } finally {
      setClosing(false);
    }
  };

  return createPortal(
    <div className="badge-unlock-overlay" role="dialog" aria-modal="true" aria-labelledby="badge-unlock-title">
      <div className="badge-confetti" aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => (
          <i key={index} style={{ '--i': index, '--delay': `${(index % 5) * 0.05}s` } as CSSProperties} />
        ))}
      </div>
      <div className="badge-unlock-card">
        <div className="badge-unlock-sparkles"><Sparkles size={22} /></div>
        <p className="badge-unlock-kicker">Huy hiệu mới!</p>
        <div className="badge-unlock-icon" aria-hidden="true">{current.icon}</div>
        <h2 id="badge-unlock-title">{current.name}</h2>
        <p>{current.description}</p>
        <button type="button" onClick={handleClose} disabled={closing}>
          {closing ? 'Đang lưu...' : queue.length > 1 ? 'Tuyệt vời · Xem tiếp' : 'Tuyệt vời!'}
        </button>
      </div>
    </div>,
    document.body
  );
};

export default BadgeUnlockModal;
