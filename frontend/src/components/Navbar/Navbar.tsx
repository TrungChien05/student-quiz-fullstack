import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, ChevronDown, Bell, Heart, MessageSquare, Reply, UserPlus, UserCheck, Flame, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { chatService } from '../../services/chatService';
import { UserProfileModal } from '../UserProfileModal';
import type { Notification } from '../../types';
import { timeAgo } from '../../utils/dateUtils';
import { userService } from '../../services/userService';
import './Navbar.css';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [selectedFriendRequestUserId, setSelectedFriendRequestUserId] = useState<number | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, updateUser } = useAuth();

  const navLinks = [
    { to: '/explore', label: 'Khám phá' },
    { to: '/battle', label: 'Đấu trí' },
    { to: '/groups', label: 'Nhóm học tập' },
    { to: '/create', label: 'Tạo Quiz' },
    { to: '/forum', label: 'Diễn đàn' },
    { to: '/leaderboard', label: 'Xếp hạng' },
  ];

  // Fetch unread count and set up polling every 10s
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fetchUnreadCounts = async () => {
      try {
        const count = await notificationService.getUnreadCount();
        setUnreadCount(count);
        const chatUnread = await chatService.getUnreadCount();
        setUnreadChatCount(chatUnread.count);
      } catch (err) {
        console.error('Lỗi khi lấy số lượng thông báo/tin nhắn:', err);
      }
    };

    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const refreshStreak = async () => {
      try {
        const profile = await userService.getMyProfile();
        if (profile.currentStreak !== user.currentStreak || profile.longestStreak !== user.longestStreak) {
          updateUser({
            ...user,
            name: profile.name,
            email: profile.email,
            avatar: profile.avatar,
            currentStreak: profile.currentStreak ?? 0,
            longestStreak: profile.longestStreak ?? 0,
            lastActivityDate: profile.lastActivityDate,
          });
        }
      } catch (error) {
        console.error('Không thể cập nhật chuỗi ngày học:', error);
      }
    };
    refreshStreak();
    window.addEventListener('studentquizz:achievement-updated', refreshStreak);
    return () => window.removeEventListener('studentquizz:achievement-updated', refreshStreak);
  }, [isAuthenticated, user?.id, user?.currentStreak, user?.longestStreak]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleNotifications = async () => {
    const nextShow = !showNotifications;
    setShowNotifications(nextShow);
    if (userDropdown) setUserDropdown(false);

    if (nextShow) {
      try {
        const data = await notificationService.getAll();
        setNotifications(data);
        const count = await notificationService.getUnreadCount();
        setUnreadCount(count);
      } catch (err) {
        console.error('Lỗi khi lấy danh sách thông báo:', err);
      }
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    setShowNotifications(false);
    try {
      if (!n.isRead) {
        await notificationService.markAsRead(n.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      if (n.type === 'FRIEND_REQUEST') {
        setSelectedFriendRequestUserId(n.actor.id);
      } else if (n.type === 'BADGE_UNLOCKED') {
        navigate('/profile');
      } else if (n.type === 'QUIZ_COMMENT' || n.type === 'QUIZ_REPLY') {
        if (n.quizId) {
          navigate(`/quiz/${n.quizId}`);
        }
      } else {
        if (n.postId) {
          navigate(`/forum/${n.postId}`);
        }
      }
    } catch (err) {
      console.error('Lỗi khi xử lý click thông báo:', err);
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Lỗi khi đánh dấu tất cả đã đọc:', err);
    }
  };

  const handleLogout = () => {
    setUserDropdown(false);
    setMenuOpen(false);
    setShowNotifications(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/');
  };

  const getInitials = (name?: string) =>
    (name?.trim() || 'U').split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const displayName = user?.name?.trim() || user?.email || 'Người dùng';

  const formatNotifTime = (dateStr: string) => timeAgo(dateStr);

  const renderNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'LIKE':
        return <Heart size={12} className="navbar__notification-item-icon navbar__notification-item-icon--like" fill="currentColor" />;
      case 'COMMENT':
      case 'QUIZ_COMMENT':
        return <MessageSquare size={12} className="navbar__notification-item-icon navbar__notification-item-icon--comment" fill="currentColor" />;
      case 'REPLY':
      case 'QUIZ_REPLY':
        return <Reply size={12} className="navbar__notification-item-icon navbar__notification-item-icon--reply" />;
      case 'FRIEND_REQUEST':
        return <UserPlus size={12} className="navbar__notification-item-icon" style={{ color: 'var(--primary)' }} />;
      case 'FRIEND_ACCEPT':
        return <UserCheck size={12} className="navbar__notification-item-icon" style={{ color: '#10B981' }} />;
      case 'BADGE_UNLOCKED':
        return <Award size={12} className="navbar__notification-item-icon navbar__notification-item-icon--badge" />;
      default:
        return <Bell size={12} className="navbar__notification-item-icon" />;
    }
  };

  return (
    <nav className="navbar">
      <div className="container navbar__inner">
        {/* Logo */}
        <Link to="/" className="navbar__logo">
          <span className="navbar__logo-icon">S</span>
          <span className="navbar__logo-text">StudentQuizz</span>
        </Link>

        {/* Desktop Nav */}
        <ul className="navbar__links">
          {navLinks.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={`navbar__link ${location.pathname.startsWith(link.to) ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Auth Buttons / User Menu */}
        <div className="navbar__auth">
          {isAuthenticated && user ? (
            <>
              {/* Chat Button */}
              <Link 
                to="/chat" 
                className={`navbar__notification-btn ${location.pathname.startsWith('/chat') ? 'active' : ''}`}
                aria-label="Tin nhắn"
                style={{ marginRight: '8px' }}
              >
                <MessageSquare size={20} />
                {unreadChatCount > 0 && (
                  <span className="navbar__notification-badge">
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </span>
                )}
              </Link>

              {/* Notification Bell */}
              <div className="navbar__notification-container" ref={notificationRef}>
                <button 
                  className={`navbar__notification-btn ${showNotifications ? 'active' : ''}`}
                  onClick={handleToggleNotifications}
                  aria-label="Thông báo"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="navbar__notification-badge">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="navbar__notification-dropdown">
                    <div className="navbar__notification-header">
                      <h3>Thông báo</h3>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllAsRead} className="navbar__notification-clear">
                          Đọc tất cả
                        </button>
                      )}
                    </div>
                    <div className="navbar__notification-divider" />
                    <div className="navbar__notification-list">
                      {notifications.length === 0 ? (
                        <div className="navbar__notification-empty">
                          Không có thông báo nào.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            className={`navbar__notification-item ${!n.isRead ? 'unread' : ''}`}
                            onClick={() => handleNotificationClick(n)}
                          >
                            <div className="navbar__notification-item-avatar-wrapper">
                              {n.actor?.avatar ? (
                                <img src={n.actor.avatar} alt={n.actor.name} className="navbar__notification-item-avatar" />
                              ) : (
                                <div className="navbar__notification-item-avatar-placeholder">
                                  {getInitials(n.actor?.name || 'User')}
                                </div>
                              )}
                              <div className="navbar__notification-item-badge">
                                {renderNotificationIcon(n.type)}
                              </div>
                            </div>
                            <div className="navbar__notification-item-content">
                              <p className="navbar__notification-item-text">{n.message}</p>
                              <span className="navbar__notification-item-time">{formatNotifTime(n.createdAt)}</span>
                            </div>
                            {!n.isRead && <div className="navbar__notification-unread-dot" />}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Link to="/profile" className="navbar__streak" title={`Chuỗi học hiện tại: ${user.currentStreak ?? 0} ngày`}>
                <Flame size={19} fill="currentColor" />
                <strong>{user.currentStreak ?? 0}</strong>
                <span>ngày</span>
              </Link>

              {/* User Dropdown */}
              <div className="navbar__user" onClick={() => { setUserDropdown(!userDropdown); setShowNotifications(false); }} ref={userMenuRef}>
                <div className="navbar__user-avatar">
                  {user.avatar ? (
                    <img src={user.avatar} alt={displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    getInitials(displayName)
                  )}
                </div>
                <span className="navbar__user-name">{displayName.split(/\s+/).pop()}</span>
                <ChevronDown size={14} className={`navbar__chevron ${userDropdown ? 'open' : ''}`} />

                {userDropdown && (
                  <div className="navbar__dropdown">
                    <div className="navbar__dropdown-header">
                      <div className="navbar__dropdown-avatar">
                        {user.avatar ? (
                          <img src={user.avatar} alt={displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          getInitials(displayName)
                        )}
                      </div>
                      <div>
                        <div className="navbar__dropdown-name">{displayName}</div>
                        <div className="navbar__dropdown-email">{user.email}</div>
                      </div>
                    </div>
                    <div className="navbar__dropdown-divider" />
                    <Link to="/profile" className="navbar__dropdown-item" onClick={() => setUserDropdown(false)}>
                      <User size={15} /> Hồ sơ
                    </Link>
                    <button className="navbar__dropdown-item navbar__dropdown-item--danger" onClick={handleLogout}>
                      <LogOut size={15} /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Đăng nhập</Link>
              <Link to="/register" className="btn btn-primary">Đăng ký</Link>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button
          id="mobile-menu-btn"
          className="navbar__hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="navbar__mobile-menu">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          <div className="navbar__mobile-auth">
            {isAuthenticated ? (
              <button className="btn btn-outline" onClick={handleLogout}>
                <LogOut size={16} /> Đăng xuất
              </button>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost" onClick={() => setMenuOpen(false)}>Đăng nhập</Link>
                <Link to="/register" className="btn btn-primary" onClick={() => setMenuOpen(false)}>Đăng ký</Link>
              </>
            )}
          </div>
        </div>
      )}

      {selectedFriendRequestUserId !== null && (
        <UserProfileModal 
          userId={selectedFriendRequestUserId} 
          onClose={() => setSelectedFriendRequestUserId(null)} 
        />
      )}

      {/* ─── Logout Confirmation Modal (rendered via Portal to avoid nav stacking context) ─── */}
      {showLogoutConfirm && createPortal(
        <div className="logout-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="logout-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="logout-modal__icon">
              <span>👋</span>
            </div>
            <h3 className="logout-modal__title">Đăng xuất?</h3>
            <p className="logout-modal__desc">Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?</p>
            <div className="logout-modal__actions">
              <button className="logout-modal__btn logout-modal__btn--cancel" onClick={() => setShowLogoutConfirm(false)}>
                Ở lại
              </button>
              <button className="logout-modal__btn logout-modal__btn--confirm" onClick={confirmLogout}>
                Đăng xuất
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </nav>
  );
};

export default Navbar;
