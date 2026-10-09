import { useState } from 'react';
import { CornerDownRight, Loader2, Send } from 'lucide-react';
import { UserProfileModal } from '../UserProfileModal';
import type { ForumComment, QuizComment } from '../../types';
import { timeAgo } from '../../utils/dateUtils';
import './CommentThread.css';

const AVATAR_COLORS = ['#7C3AED', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

const getInitials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

interface Props {
  comment: ForumComment | QuizComment;
  depth?: number;
  isAuthenticated: boolean;
  onReply: (parentId: number, content: string) => Promise<void>;
}

const CommentThread = ({
  comment,
  depth = 0,
  isAuthenticated,
  onReply,
}: Props) => {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState<number | null>(null);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await onReply(comment.id, replyText.trim());
      setReplyText('');
      setReplying(false);
    } finally {
      setSubmitting(false);
    }
  };

  const avatarColor = AVATAR_COLORS[(comment.author.id || 0) % AVATAR_COLORS.length];
  const maxDepth = 4;

  return (
    <div className={`comment-thread ${depth > 0 ? 'comment-thread--nested' : ''}`}>
      <div className="comment-item">
        <div 
          className="comment-avatar" 
          style={{ background: avatarColor, textDecoration: 'none', color: 'white', cursor: 'pointer' }}
          onClick={() => setSelectedAuthorId(comment.author.id)}
        >
          {getInitials(comment.author.name)}
        </div>
        <div className="comment-body">
          <div className="comment-header">
            <div 
              className="comment-author" 
              style={{ textDecoration: 'underline', color: 'inherit', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => setSelectedAuthorId(comment.author.id)}
            >
              {comment.author.name}
            </div>
            {comment.replyToAuthorName && (
              <span className="comment-reply-to">
                <CornerDownRight size={12} />
                {comment.replyToAuthorName}
              </span>
            )}
            <span className="comment-time">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="comment-content">{comment.content}</p>
          {isAuthenticated && depth < maxDepth && (
            <button
              type="button"
              className="comment-reply-btn"
              onClick={() => setReplying(prev => !prev)}
            >
              {replying ? 'Hủy' : 'Trả lời'}
            </button>
          )}
        </div>
      </div>

      {replying && (
        <form className="comment-reply-form" onSubmit={handleReplySubmit}>
          <textarea
            className="comment-form__input"
            rows={2}
            maxLength={500}
            placeholder={`Trả lời ${comment.author.name}...`}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            autoFocus
          />
          <div className="comment-reply-form__footer">
            <span className="form-char-count">{replyText.length}/500</span>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!replyText.trim() || submitting}
            >
              {submitting ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
              Gửi trả lời
            </button>
          </div>
        </form>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map(reply => (
            <CommentThread
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              isAuthenticated={isAuthenticated}
              onReply={onReply}
            />
          ))}
        </div>
      )}

      {selectedAuthorId !== null && (
        <UserProfileModal 
          userId={selectedAuthorId} 
          onClose={() => setSelectedAuthorId(null)} 
        />
      )}
    </div>
  );
};

export default CommentThread;
