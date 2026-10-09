import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ThumbsUp, MessageCircle, Search, TrendingUp, Clock, Tag, Paperclip, Link2 } from 'lucide-react';
import { forumService } from '../services/quizService';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import type { ForumPost } from '../types';
import CreatePostModal from '../components/Forum/CreatePostModal';
import { UserProfileModal } from '../components/UserProfileModal';
import { timeAgo, parseServerDate } from '../utils/dateUtils';
import { getForumAttachments, isImageAttachment } from '../utils/forumAttachments';
import './ForumPage.css';

const getInitials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const AVATAR_COLORS = ['#7C3AED', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

const ForumAttachmentsPreview = ({ post }: { post: ForumPost }) => {
  const attachments = getForumAttachments(post);
  const images = attachments.filter(isImageAttachment);
  const files = attachments.filter(attachment => !isImageAttachment(attachment));

  if (attachments.length === 0 && !post.linkUrl) return null;

  return (
    <div className="fpc-attachments-indicator">
      {images.length > 0 && (
        <div className="fpc-image-gallery">
          {images.slice(0, 3).map((attachment, index) => (
            <div className="fpc-image-preview-wrap" key={attachment.id || attachment.url + index}>
              <img src={attachment.url} alt={attachment.name} className="fpc-image-card-preview" />
            </div>
          ))}
          {images.length > 3 && <span className="fpc-more-images">+{images.length - 3}</span>}
        </div>
      )}
      {files.length > 0 && (
        <span className="fpc-attachment-badge">
          <Paperclip size={12} /> {files.length === 1 ? files[0].name : files.length + ' tài liệu'}
        </span>
      )}
      {post.linkUrl && (
        <span className="fpc-link-badge">
          <Link2 size={12} /> {post.linkUrl.replace(/https?:\/\/(www\.)?/, '').slice(0, 30)}...
        </span>
      )}
    </div>
  );
};

const ForumPage = () => {
  const [selectedAuthorId, setSelectedAuthorId] = useState<number | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [filtered, setFiltered] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  const [showCreate, setShowCreate] = useState(false);
  const [activeTag, setActiveTag] = useState('');
  const { isAuthenticated } = useAuth();
  const { alert: showAlert } = useDialog();

  const allTags = Array.from(new Set(posts.flatMap(p => p.tags || [])));

  useEffect(() => {
    forumService.getPosts().then(data => {
      setPosts(data);
      setFiltered(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let result = [...posts];
    if (search.trim()) {
      result = result.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.content.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (activeTag) {
      result = result.filter(p => p.tags?.includes(activeTag));
    }
    if (sortBy === 'popular') {
      result.sort((a, b) => b.likeCount - a.likeCount);
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    setFiltered(result);
  }, [search, sortBy, activeTag, posts]);

  const handleLike = async (postId: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, liked: !p.liked, likeCount: p.liked ? p.likeCount - 1 : p.likeCount + 1 }
        : p
    ));
    await forumService.toggleLike(postId).catch(() => {
      // Revert on error
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, liked: !p.liked, likeCount: p.liked ? p.likeCount - 1 : p.likeCount + 1 }
          : p
      ));
    });
  };

  const handlePostCreated = (newPost: ForumPost) => {
    if (newPost.status === 'APPROVED') {
      setPosts(prev => [newPost, ...prev]);
    } else {
      void showAlert({
        title: 'Đăng bài thành công',
        message: 'Bài viết của bạn đang chờ Admin duyệt. Bạn sẽ thấy bài trên diễn đàn sau khi được duyệt.',
        variant: 'success',
      });
    }
    setShowCreate(false);
  };

  return (
    <main className="forum-page">
      <div className="container">
        {/* Header */}
        <div className="forum-header">
          <div>
            <h1 className="forum-title">Diễn đàn</h1>
            <p className="forum-subtitle">Trao đổi, chia sẻ và học hỏi cùng cộng đồng</p>
          </div>
          {isAuthenticated ? (
            <button
              id="create-post-btn"
              className="btn btn-primary"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={18} />
              Đăng bài
            </button>
          ) : (
            <Link to="/login" className="btn btn-primary">
              <Plus size={18} /> Đăng nhập để đăng bài
            </Link>
          )}
        </div>

        <div className="forum-layout">
          {/* Main content */}
          <div className="forum-main">
            {/* Controls */}
            <div className="forum-controls">
              <div className="forum-search">
                <Search size={16} className="forum-search__icon" />
                <input
                  id="forum-search"
                  type="text"
                  placeholder="Tìm kiếm bài viết..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="forum-search__input"
                />
              </div>
              <div className="forum-sort">
                <button
                  id="sort-newest"
                  className={`forum-sort-btn ${sortBy === 'newest' ? 'active' : ''}`}
                  onClick={() => setSortBy('newest')}
                >
                  <Clock size={14} /> Mới nhất
                </button>
                <button
                  id="sort-popular"
                  className={`forum-sort-btn ${sortBy === 'popular' ? 'active' : ''}`}
                  onClick={() => setSortBy('popular')}
                >
                  <TrendingUp size={14} /> Nổi bật
                </button>
              </div>
            </div>

            {/* Posts list */}
            {loading ? (
              <div className="forum-skeleton-list">
                {[1, 2, 3].map(i => <div key={i} className="forum-skeleton-item" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="forum-empty">
                <MessageCircle size={48} opacity={0.2} />
                <p>Không có bài viết nào.</p>
              </div>
            ) : (
              <div className="forum-posts">
                {filtered.map(post => (
                  <Link
                    to={`/forum/${post.id}`}
                    key={post.id}
                    id={`forum-post-${post.id}`}
                    className="forum-post-card card"
                  >
                    {/* Author */}
                    <div 
                      className="fpc-author"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (post.author.id) {
                          setSelectedAuthorId(post.author.id);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div
                        className="fpc-avatar"
                        style={{ background: AVATAR_COLORS[post.author.id % AVATAR_COLORS.length] }}
                      >
                        {getInitials(post.author.name)}
                      </div>
                      <div className="fpc-meta">
                        <span className="fpc-author-name" style={{ textDecoration: 'underline' }}>{post.author.name}</span>
                        <span className="fpc-time">{timeAgo(post.createdAt)}</span>
                      </div>
                    </div>

                    {/* Title + content */}
                    <h2 className="fpc-title">{post.title}</h2>
                    <p className="fpc-content">{post.content}</p>

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="fpc-tags">
                        {post.tags.map(tag => (
                          <span key={tag} className="fpc-tag"># {tag}</span>
                        ))}
                      </div>
                    )}

                    <ForumAttachmentsPreview post={post} />

                    {/* Actions */}
                    <div className="fpc-actions">
                      <button
                        className={`fpc-action-btn ${post.liked ? 'liked' : ''}`}
                        onClick={e => handleLike(post.id, e)}
                        title={isAuthenticated ? 'Thích' : 'Đăng nhập để thích'}
                      >
                        <ThumbsUp size={15} />
                        <span>{post.likeCount}</span>
                      </button>
                      <span className="fpc-action-btn">
                        <MessageCircle size={15} />
                        <span>{post.commentCount} bình luận</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="forum-sidebar">
            <div className="forum-sidebar-card">
              <h3 className="forum-sidebar-title">
                <Tag size={15} /> Chủ đề phổ biến
              </h3>
              <div className="forum-tag-list">
                <button
                  className={`forum-tag-btn ${activeTag === '' ? 'active' : ''}`}
                  onClick={() => setActiveTag('')}
                >Tất cả</button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    className={`forum-tag-btn ${activeTag === tag ? 'active' : ''}`}
                    onClick={() => setActiveTag(tag === activeTag ? '' : tag)}
                  >{tag}</button>
                ))}
              </div>
            </div>

            <div className="forum-sidebar-card forum-stats-card">
              <h3 className="forum-sidebar-title">📊 Thống kê</h3>
              <div className="forum-stat-row">
                <span>Tổng bài viết</span>
                <strong>{posts.length}</strong>
              </div>
              <div className="forum-stat-row">
                <span>Thành viên</span>
                <strong>128</strong>
              </div>
              <div className="forum-stat-row">
                <span>Hôm nay</span>
                <strong>{posts.filter(p => {
                  const d = parseServerDate(p.createdAt);
                  const now = new Date();
                  return d.toDateString() === now.toDateString();
                }).length} bài</strong>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreate && (
        <CreatePostModal
          onClose={() => setShowCreate(false)}
          onCreated={handlePostCreated}
        />
      )}

      {selectedAuthorId !== null && (
        <UserProfileModal 
          userId={selectedAuthorId} 
          onClose={() => setSelectedAuthorId(null)} 
        />
      )}
    </main>
  );
};

export default ForumPage;
