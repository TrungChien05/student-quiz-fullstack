import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ThumbsUp, MessageCircle, Send, Loader2, ExternalLink, Download, FileText } from 'lucide-react';
import { forumService } from '../services/quizService';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import CommentThread from '../components/Forum/CommentThread';
import { UserProfileModal } from '../components/UserProfileModal';
import type { ForumPost, ForumComment } from '../types';
import { timeAgo } from '../utils/dateUtils';
import { getForumAttachments, isImageAttachment } from '../utils/forumAttachments';
import './ForumPostPage.css';

const AVATAR_COLORS = ['#7C3AED', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

const getInitials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const countAllComments = (comments: ForumComment[]): number =>
  comments.reduce((sum, c) => sum + 1 + countAllComments(c.replies || []), 0);

const ForumPostPage = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { alert } = useDialog();
  const [selectedAuthorId, setSelectedAuthorId] = useState<number | null>(null);

  const loadComments = useCallback(async () => {
    if (!id) return;
    const c = await forumService.getComments(Number(id));
    setComments(c);
    return c;
  }, [id]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      forumService.getPostById(Number(id)),
      forumService.getComments(Number(id)),
    ]).then(([p, c]) => {
      setPost(p);
      setComments(c);
      setLoading(false);
    });
  }, [id]);

  const totalComments = countAllComments(comments);

  const handleLike = async () => {
    if (!isAuthenticated || !post) return;
    try {
      const res = await forumService.toggleLike(post.id);
      setPost(prev => prev ? { ...prev, liked: res.liked, likeCount: res.likeCount } : null);
    } catch {
      await alert({
        title: 'Không thể thích',
        message: 'Đã có lỗi khi cập nhật lượt thích. Vui lòng thử lại.',
        variant: 'danger',
      });
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !isAuthenticated || !id) return;
    setSubmitting(true);
    try {
      await forumService.addComment(Number(id), commentText.trim());
      const updated = await loadComments();
      setPost(prev => prev ? {
        ...prev,
        commentCount: updated ? countAllComments(updated) : prev.commentCount + 1,
      } : null);
      setCommentText('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: number, content: string) => {
    if (!id) return;
    await forumService.addComment(Number(id), content, parentId);
    const updated = await loadComments();
    setPost(prev => prev ? {
      ...prev,
      commentCount: updated ? countAllComments(updated) : (prev.commentCount + 1),
    } : null);
  };

  if (loading) {
    return (
      <main className="forum-post-page">
        <div className="container">
          <div className="forum-post-skeleton" />
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="forum-post-page">
        <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
          <p>Bài viết không tồn tại.</p>
          <Link to="/forum" className="btn btn-primary" style={{ marginTop: 16 }}>
            Quay lại diễn đàn
          </Link>
        </div>
      </main>
    );
  }

  const attachments = getForumAttachments(post);
  const imageAttachments = attachments.filter(isImageAttachment);
  const fileAttachments = attachments.filter(attachment => !isImageAttachment(attachment));

  return (
    <main className="forum-post-page">
      <div className="container">
        <Link to="/forum" className="back-link">
          <ArrowLeft size={16} /> Diễn đàn
        </Link>

        <div className="forum-post-layout">
          <article className="forum-post-article card">
            <div 
              className="fpa-author" 
              onClick={() => setSelectedAuthorId(post.author.id)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}
            >
              <div
                className="fpa-avatar"
                style={{ background: AVATAR_COLORS[post.author.id % AVATAR_COLORS.length] }}
              >
                {getInitials(post.author.name)}
              </div>
              <div>
                <div className="fpa-name" style={{ textDecoration: 'underline' }}>{post.author.name}</div>
                <div className="fpa-time">{timeAgo(post.createdAt)}</div>
              </div>
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="fpa-tags">
                {post.tags.map(tag => (
                  <span key={tag} className="fpc-tag"># {tag}</span>
                ))}
              </div>
            )}

            <h1 className="fpa-title">{post.title}</h1>
            <div className="fpa-content">{post.content}</div>

            {/* External Link Section */}
            {post.linkUrl && (
              <div className="fpa-link-section">
                <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" className="fpa-link-card">
                  <div className="link-card-icon">
                    <ExternalLink size={16} />
                  </div>
                  <div className="link-card-body">
                    <span className="link-card-title">Liên kết đính kèm</span>
                    <span className="link-card-url" title={post.linkUrl}>{post.linkUrl}</span>
                  </div>
                </a>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="fpa-attachment-section">
                {imageAttachments.length > 0 && (
                  <div className="fpa-images-grid">
                    {imageAttachments.map((attachment, index) => (
                      <div className="fpa-image-wrapper" key={attachment.id || attachment.url + index}>
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="fpa-image-preview"
                          onClick={() => window.open(attachment.url, '_blank')}
                        />
                        <span className="image-caption">{attachment.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {fileAttachments.length > 0 && (
                  <div className="fpa-files-list">
                    {fileAttachments.map((attachment, index) => (
                      <a
                        href={attachment.url}
                        download={attachment.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fpa-file-card"
                        key={attachment.id || attachment.url + index}
                      >
                        <div className="file-card-icon"><FileText size={18} /></div>
                        <div className="file-card-body">
                          <span className="file-card-name" title={attachment.name}>{attachment.name}</span>
                          <span className="file-card-action">Bấm để xem hoặc tải tài liệu về máy</span>
                        </div>
                        <div className="file-card-download-btn"><Download size={16} /></div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="fpa-actions">
              <button
                className={`fpc-action-btn ${post.liked ? 'liked' : ''}`}
                onClick={handleLike}
                disabled={!isAuthenticated}
                title={!isAuthenticated ? 'Đăng nhập để thích' : ''}
              >
                <ThumbsUp size={16} />
                <span>{post.likeCount} thích</span>
              </button>
              <span className="fpc-action-btn">
                <MessageCircle size={16} />
                <span>{totalComments} bình luận</span>
              </span>
            </div>
          </article>

          <section className="forum-comments">
            <h2 className="comments-title">Thảo luận ({totalComments})</h2>

            {isAuthenticated ? (
              <form onSubmit={handleComment} className="comment-form">
                <div
                  className="comment-form__avatar"
                  style={{ background: AVATAR_COLORS[(user?.id || 0) % AVATAR_COLORS.length] }}
                >
                  {user ? getInitials(user.name) : '?'}
                </div>
                <div className="comment-form__input-wrap">
                  <textarea
                    id="comment-input"
                    className="comment-form__input"
                    placeholder="Viết bình luận của bạn..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                  <div className="comment-form__footer">
                    <span className="form-char-count">{commentText.length}/500</span>
                    <button
                      id="submit-comment-btn"
                      type="submit"
                      className="btn btn-primary"
                      disabled={!commentText.trim() || submitting}
                    >
                      {submitting ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
                      Gửi bình luận
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="comment-login-prompt">
                <Link to="/login" className="auth-link">Đăng nhập</Link> để tham gia thảo luận
              </div>
            )}

            <div className="comment-list">
              {comments.map(comment => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  isAuthenticated={isAuthenticated}
                  onReply={handleReply}
                />
              ))}
              {comments.length === 0 && (
                <div className="comments-empty">Chưa có bình luận. Hãy là người đầu tiên!</div>
              )}
            </div>
          </section>
        </div>
      </div>

      {selectedAuthorId !== null && (
        <UserProfileModal 
          userId={selectedAuthorId} 
          onClose={() => setSelectedAuthorId(null)} 
        />
      )}
    </main>
  );
};

export default ForumPostPage;
