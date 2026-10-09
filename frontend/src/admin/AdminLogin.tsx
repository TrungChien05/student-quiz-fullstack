import React, { useState } from 'react';
import { adminService } from './adminService';
import './admin.css';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await adminService.login(email, password);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Tài khoản hoặc mật khẩu không đúng, hoặc không có quyền admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-bg" />
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <div className="admin-login-icon">🛡️</div>
          <h1 className="admin-login-title">Quản trị hệ thống</h1>
          <p className="admin-login-subtitle">StudentQuizz Admin Panel</p>
        </div>

        {error && (
          <div className="admin-login-error">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              className="admin-form-input"
              placeholder="admin@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="admin-password">Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-password"
                type={showPw ? 'text' : 'password'}
                className="admin-form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: 'absolute', right: 14, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  color: '#94a3b8', cursor: 'pointer', fontSize: '1rem'
                }}
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="admin-login-submit"
            disabled={loading}
          >
            {loading ? '⏳ Đang xác thực...' : '🔐 Đăng nhập'}
          </button>
        </form>

        <p className="admin-security-note">
          🔒 Khu vực bảo mật cao — Chỉ dành cho quản trị viên được uỷ quyền
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
