import React, { useEffect, useState } from 'react';
import { adminService } from '../adminService';
import RejectModal from '../components/RejectModal';
import { useDialog } from '../../context/DialogContext';
import type { ForumPost as ForumPostDetails } from '../../types';
import { getForumAttachments, isImageAttachment } from '../../utils/forumAttachments';
import '../components/AdminModals.css';

interface Post {
  id: number;
  title: string;
  content: string;
  likeCount: number;
  commentCount: number;
  status: string;
  rejectReason?: string;
  appealMessage?: string;
  author?: { name: string };
  tags?: string[];
}


import { forumService } from '../../services/quizService';

const ForumPage: React.FC = () => {
  const { confirm, alert: showAlert } = useDialog();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: number; title: string } | null>(null);
  const [selectedPostDetails, setSelectedPostDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const load = async (p = 0) => {
    setLoading(true);
    try {
      const data = await adminService.getPosts(p, 10);
      setPosts(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(0); }, []);

  const handleDelete = async (id: number, title: string) => {
    const ok = await confirm({
      title: 'Xóa bài viết',
      message: `Bạn có chắc muốn xóa "${title}"?\nMọi bình luận liên quan cũng sẽ bị xóa.`,
      confirmText: 'Xóa',
      variant: 'danger',
      theme: 'admin',
    });
    if (!ok) return;
    setDeleting(id);
    try {
      await adminService.deletePost(id);
      setPosts(posts.filter(p => p.id !== id));
      setTotalElements(t => t - 1);
    } catch {
      await showAlert({ title: 'Lỗi', message: 'Không thể xóa bài viết.', variant: 'danger', theme: 'admin' });
    } finally {
      setDeleting(null);
    }
  };

  const handleStatusUpdate = async (id: number, status: string, title: string) => {
    const ok = await confirm({
      title: 'Xác nhận duyệt',
      message: `Duyệt bài viết "${title}"?`,
      confirmText: 'Duyệt',
      variant: 'success',
      theme: 'admin',
    });
    if (!ok) return;
    try {
      await adminService.updatePostStatus(id, status);
      setPosts(posts.map(p => p.id === id ? { ...p, status } : p));
    } catch {
      await showAlert({ title: 'Lỗi', message: 'Không thể cập nhật trạng thái.', variant: 'danger', theme: 'admin' });
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;
    const res = await adminService.updatePostStatus(rejectTarget.id, 'REJECTED', reason);
    setPosts(posts.map(p => p.id === rejectTarget.id ? {
      ...p,
      status: 'REJECTED',
      rejectReason: res.rejectReason || reason,
      appealMessage: undefined,
    } : p));
  };

  const handleViewDetails = async (id: number) => {
    try {
      setDetailsLoading(true);
      const data = await forumService.getPostById(id);
      setSelectedPostDetails(data);
    } catch {
      await showAlert({ title: 'Lỗi', message: 'Không thể lấy thông tin chi tiết bài viết.', variant: 'danger', theme: 'admin' });
    } finally {
      setDetailsLoading(false);
    }
  };

  const statusColors: Record<string, { bg: string, text: string, label: string }> = {
    'PENDING': { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', label: '⏳ Chờ duyệt' },
    'APPROVED': { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', label: '✅ Đã duyệt' },
    'REJECTED': { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', label: '❌ Từ chối' },
  };

  const selectedAttachments = selectedPostDetails
    ? getForumAttachments(selectedPostDetails as ForumPostDetails)
    : [];

  return (
    <div>
      {rejectTarget && (
        <RejectModal
          title="Từ chối bài viết"
          itemLabel={rejectTarget.title}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleRejectConfirm}
        />
      )}

      {selectedPostDetails && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedPostDetails(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', width: '95%' }}>
            <div className="admin-modal-header">
              <h3>Chi tiết bài viết</h3>
              <button className="admin-modal-close" onClick={() => setSelectedPostDetails(null)}>&times;</button>
            </div>
            <div className="admin-modal-content" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-primary)' }}>{selectedPostDetails.title}</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Tác giả: <strong>{selectedPostDetails.author?.name || '—'}</strong> | 
                  Trạng thái: <strong>{selectedPostDetails.status}</strong>
                </p>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                  {(selectedPostDetails.tags || []).map((tag: string) => (
                    <span key={tag} style={{
                      padding: '2px 8px', borderRadius: 12,
                      fontSize: '0.7rem', fontWeight: 600,
                      background: 'rgba(124, 58, 237, 0.15)',
                      color: '#a78bfa',
                      border: '1px solid rgba(124, 58, 237, 0.2)',
                    }}>{tag}</span>
                  ))}
                </div>
              </div>

              <div style={{ 
                background: '#f8fafc', 
                padding: '16px', 
                borderRadius: '8px', 
                fontSize: '0.95rem', 
                lineHeight: '1.6', 
                color: '#334155', 
                whiteSpace: 'pre-wrap',
                border: '1px solid #e2e8f0',
                marginBottom: '20px'
              }}>
                {selectedPostDetails.content}
              </div>

              {/* Attachments Section */}
              {(selectedAttachments.length > 0 || selectedPostDetails.linkUrl) && (
                <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <h5 style={{ fontSize: '0.95rem', marginBottom: '12px' }}>Tệp đính kèm & Liên kết</h5>
                  
                  {selectedAttachments.length > 0 && (
                    <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
                      {selectedAttachments.map((attachment, index) => (
                        isImageAttachment(attachment) ? (
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            key={attachment.id || attachment.url + index}
                            style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}
                          >
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              style={{ width: '100%', maxHeight: '260px', objectFit: 'contain', display: 'block' }}
                            />
                          </a>
                        ) : (
                          <div
                            key={attachment.id || attachment.url + index}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '12px', background: '#f1f5f9', borderRadius: '8px',
                              border: '1px solid #cbd5e1', gap: '10px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <span style={{ fontSize: '1.5rem' }}>📄</span>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {attachment.name}
                                </p>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{attachment.type}</span>
                              </div>
                            </div>
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              download={attachment.name}
                              className="admin-btn"
                              style={{ background: '#10b981', color: 'white', textDecoration: 'none', display: 'inline-block', fontSize: '0.8rem', padding: '6px 12px' }}
                            >
                              📥 Tải xuống
                            </a>
                          </div>
                        )
                      ))}
                    </div>
                  )}

                  {selectedPostDetails.linkUrl && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      padding: '10px', 
                      background: 'rgba(59, 130, 246, 0.05)', 
                      borderRadius: '8px',
                      border: '1px solid rgba(59, 130, 246, 0.2)' 
                    }}>
                      <span style={{ fontSize: '1.1rem' }}>🔗</span>
                      <a 
                        href={selectedPostDetails.linkUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}
                      >
                        {selectedPostDetails.linkUrl}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn" style={{ background: '#64748b', color: 'white' }} onClick={() => setSelectedPostDetails(null)}>
                Đóng
              </button>
              {selectedPostDetails.status === 'PENDING' && (
                <>
                  <button
                    className="admin-btn"
                    style={{ background: '#10b981', color: 'white' }}
                    onClick={() => {
                      const t = selectedPostDetails;
                      setSelectedPostDetails(null);
                      handleStatusUpdate(t.id, 'APPROVED', t.title);
                    }}
                  >
                    Duyệt bài đăng
                  </button>
                  <button
                    className="admin-btn"
                    style={{ background: '#ef4444', color: 'white' }}
                    onClick={() => {
                      const t = selectedPostDetails;
                      setSelectedPostDetails(null);
                      setRejectTarget({ id: t.id, title: t.title });
                    }}
                  >
                    Từ chối
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            💬 Bài viết diễn đàn
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400, marginLeft: 8 }}>
              ({totalElements} bài)
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner" /> Đang tải...
          </div>
        ) : posts.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">💬</div>
            <div className="admin-empty-text">Chưa có bài viết nào</div>
          </div>
        ) : (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tiêu đề</th>
                    <th>Tác giả</th>
                    <th>Trạng thái</th>
                    <th>Tags</th>
                    <th>❤️ Lượt thích</th>
                    <th>💬 Bình luận</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map(post => {
                    const st = statusColors[post.status || 'PENDING'] || statusColors['PENDING'];
                    return (
                    <tr key={post.id}>
                      <td style={{ maxWidth: 240 }}>
                        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {post.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                          {post.content.slice(0, 60)}...
                        </div>
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                        {post.author?.name || '—'}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: st.bg,
                          color: st.text,
                        }}>
                          {st.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(post.tags || []).slice(0, 2).map(tag => (
                            <span key={tag} style={{
                              padding: '2px 8px', borderRadius: 12,
                              fontSize: '0.7rem', fontWeight: 600,
                              background: 'rgba(124, 58, 237, 0.15)',
                              color: '#a78bfa',
                              border: '1px solid rgba(124, 58, 237, 0.2)',
                            }}>{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>
                          ❤️ {post.likeCount}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#60a5fa', fontWeight: 600 }}>
                          💬 {post.commentCount}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="admin-btn"
                            style={{ background: '#3b82f6', color: 'white' }}
                            onClick={() => handleViewDetails(post.id)}
                            disabled={detailsLoading}
                          >
                            👁️ Xem
                          </button>
                          {post.status === 'PENDING' && (
                            <>
                              <button
                                className="admin-btn"
                                style={{ background: '#10b981', color: 'white' }}
                                onClick={() => handleStatusUpdate(post.id, 'APPROVED', post.title)}
                              >
                                Duyệt
                              </button>
                                <button
                                  className="admin-btn"
                                  style={{ background: '#ef4444', color: 'white' }}
                                  onClick={() => setRejectTarget({ id: post.id, title: post.title })}
                                >
                                  Từ chối
                                </button>
                              </>
                            )}
                            <button
                              className="admin-btn admin-btn-danger"
                              onClick={() => handleDelete(post.id, post.title)}
                              disabled={deleting === post.id}
                            >
                              {deleting === post.id ? '⏳' : '🗑️'} Xóa
                            </button>
                          </div>
                          {post.rejectReason && post.status === 'REJECTED' && (
                            <div className="admin-moderation-note admin-moderation-note--reject">
                              <strong>Lý do từ chối:</strong> {post.rejectReason}
                            </div>
                          )}
                          {post.appealMessage && post.status === 'PENDING' && (
                            <div className="admin-moderation-note admin-moderation-note--appeal">
                              <strong>🚨 Khiếu nại từ user:</strong> {post.appealMessage}
                            </div>
                          )}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="admin-pagination">
                <button className="admin-page-btn" onClick={() => load(page - 1)} disabled={page === 0}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i} className={`admin-page-btn ${i === page ? 'active' : ''}`} onClick={() => load(i)}>
                    {i + 1}
                  </button>
                ))}
                <button className="admin-page-btn" onClick={() => load(page + 1)} disabled={page >= totalPages - 1}>›</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ForumPage;
