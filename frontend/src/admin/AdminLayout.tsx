import React from 'react';

import './admin.css';

interface AdminLayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const navItems = [
  { id: 'dashboard', icon: '📊', label: 'Tổng quan' },
  { id: 'users',     icon: '👥', label: 'Người dùng' },
  { id: 'quizzes',   icon: '📝', label: 'Bài kiểm tra' },
  { id: 'forum',     icon: '💬', label: 'Diễn đàn' },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activePage, onNavigate, onLogout }) => {
  const pageLabels: Record<string, string> = {
    dashboard: 'Tổng quan hệ thống',
    users:     'Quản lý người dùng',
    quizzes:   'Quản lý bài kiểm tra',
    forum:     'Quản lý diễn đàn',
  };

  return (
    <div className="admin-root">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <div className="admin-logo-badge">
            <div className="admin-logo-icon">🛡️</div>
            Admin Panel
          </div>
        </div>

        <nav className="admin-nav">
          <div className="admin-nav-section">Menu chính</div>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`admin-nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-user-avatar">A</div>
            <div className="admin-user-details">
              <div className="admin-user-name">Administrator</div>
              <div className="admin-user-role">Super Admin</div>
            </div>
            <button
              className="admin-logout-btn"
              onClick={onLogout}
              title="Đăng xuất"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        <header className="admin-topbar">
          <h1 className="admin-page-title">{pageLabels[activePage]}</h1>
          <div className="admin-topbar-meta">
            StudentQuizz Admin · {new Date().toLocaleDateString('vi-VN')}
          </div>
        </header>
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
