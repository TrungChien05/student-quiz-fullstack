import React, { useEffect, useState } from 'react';
import { adminService } from '../adminService';
import LockUserModal from '../components/LockUserModal';
import { useDialog } from '../../context/DialogContext';
import '../components/AdminModals.css';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  locked?: boolean;
  lockReason?: string;
}

const UsersPage: React.FC = () => {
  const { confirm, alert: showAlert } = useDialog();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [lockTarget, setLockTarget] = useState<User | null>(null);

  const load = async (p = 0) => {
    setLoading(true);
    try {
      const data = await adminService.getUsers(p, 10);
      setUsers(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(0); }, []);

  const handleRoleChange = async (id: number, newRole: string) => {
    setActionLoading(id);
    try {
      await adminService.updateUserRole(id, newRole);
      setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
    } catch {
      await showAlert({ title: 'Lỗi', message: 'Không thể cập nhật vai trò.', variant: 'danger', theme: 'admin' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleLockConfirm = async (reason: string) => {
    if (!lockTarget) return;
    const res = await adminService.updateUserLock(lockTarget.id, true, reason);
    setUsers(users.map(u => u.id === lockTarget.id ? {
      ...u,
      locked: res.locked,
      lockReason: res.lockReason,
    } : u));
  };

  const handleUnlock = async (user: User) => {
    const ok = await confirm({
      title: 'Mở khóa tài khoản',
      message: `Mở khóa cho "${user.name}"?\nUser có thể đăng nhập và sử dụng lại bình thường.`,
      confirmText: 'Mở khóa',
      variant: 'success',
      theme: 'admin',
    });
    if (!ok) return;
    setActionLoading(user.id);
    try {
      const res = await adminService.updateUserLock(user.id, false);
      setUsers(users.map(u => u.id === user.id ? {
        ...u,
        locked: res.locked,
        lockReason: undefined,
      } : u));
    } catch {
      await showAlert({ title: 'Lỗi', message: 'Không thể mở khóa tài khoản.', variant: 'danger', theme: 'admin' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const ok = await confirm({
      title: 'Xóa người dùng',
      message: `Xóa vĩnh viễn "${name}"?\nToàn bộ quiz, bài viết và bình luận của user sẽ bị xóa.`,
      confirmText: 'Xóa',
      variant: 'danger',
      theme: 'admin',
    });
    if (!ok) return;
    setActionLoading(id);
    try {
      await adminService.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
      setTotalElements(t => t - 1);
    } catch {
      await showAlert({ title: 'Lỗi', message: 'Không thể xóa người dùng.', variant: 'danger', theme: 'admin' });
    } finally {
      setActionLoading(null);
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div>
      {lockTarget && (
        <LockUserModal
          userName={lockTarget.name}
          onClose={() => setLockTarget(null)}
          onConfirm={handleLockConfirm}
        />
      )}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            👥 Danh sách người dùng
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400, marginLeft: 8 }}>
              ({totalElements} người dùng)
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner" /> Đang tải...
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">👤</div>
            <div className="admin-empty-text">Không có người dùng nào</div>
          </div>
        ) : (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div className="admin-user-cell">
                          <div className="admin-avatar">{getInitials(user.name)}</div>
                          <div>
                            <div className="admin-user-cell-name">{user.name}</div>
                            <div className="admin-user-cell-email">#{user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{user.email}</td>
                      <td>
                        <span className={`badge ${user.role === 'ADMIN' ? 'badge-admin' : 'badge-user'}`}>
                          {user.role === 'ADMIN' ? '🛡️ Admin' : '👤 User'}
                        </span>
                      </td>
                      <td>
                        {user.role === 'ADMIN' ? (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>
                        ) : user.locked ? (
                          <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                            🔒 Đã khóa
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                            ✅ Hoạt động
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <select
                            className="admin-select"
                            value={user.role}
                            onChange={e => handleRoleChange(user.id, e.target.value)}
                            disabled={actionLoading === user.id}
                          >
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                          {user.role !== 'ADMIN' && (
                            user.locked ? (
                              <button
                                className="admin-btn"
                                style={{ background: '#10b981', color: 'white' }}
                                onClick={() => handleUnlock(user)}
                                disabled={actionLoading === user.id}
                              >
                                Mở khóa
                              </button>
                            ) : (
                              <button
                                className="admin-btn"
                                style={{ background: '#f59e0b', color: 'white' }}
                                onClick={() => setLockTarget(user)}
                                disabled={actionLoading === user.id}
                              >
                                🔒 Khóa
                              </button>
                            )
                          )}
                          <button
                            className="admin-btn admin-btn-danger"
                            onClick={() => handleDelete(user.id, user.name)}
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id ? '⏳' : '🗑️'} Xóa
                          </button>
                        </div>
                        {user.locked && user.lockReason && (
                          <div className="admin-moderation-note admin-moderation-note--reject" style={{ marginTop: 8 }}>
                            <strong>Lý do khóa:</strong> {user.lockReason}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="admin-pagination">
                <button
                  className="admin-page-btn"
                  onClick={() => load(page - 1)}
                  disabled={page === 0}
                >‹</button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    className={`admin-page-btn ${i === page ? 'active' : ''}`}
                    onClick={() => load(i)}
                  >{i + 1}</button>
                ))}
                <button
                  className="admin-page-btn"
                  onClick={() => load(page + 1)}
                  disabled={page >= totalPages - 1}
                >›</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UsersPage;
