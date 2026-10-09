import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, Mail, Lock } from 'lucide-react';
import { authService } from '../services/quizService';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = (location.state as { from?: string })?.from || '/';

  useEffect(() => {
    const lockMsg = sessionStorage.getItem('accountLockMessage');
    if (lockMsg) {
      setError(lockMsg);
      sessionStorage.removeItem('accountLockMessage');
    }
  }, []);

  const validateFields = () => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!isValidEmail(email)) {
      errors.email = 'Địa chỉ email không hợp lệ.';
    }
    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu.';
    } else if (password.length < 6) {
      errors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
    }
    return errors;
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const errors = validateFields();
    setFieldErrors(errors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const errors = validateFields();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setError('');
    setLoading(true);
    try {
      const data = await authService.login(email.trim(), password);
      login(data.token, data.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Email hoặc mật khẩu không đúng.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <Link to="/" className="auth-logo">
          <span className="auth-logo__icon">S</span>
          <span>StudentQuizz</span>
        </Link>

        <h1 className="auth-title">Chào mừng trở lại!</h1>
        <p className="auth-subtitle">Đăng nhập để tiếp tục học tập</p>

        {from !== '/' && (
          <div className="auth-info">
            🔒 Bạn cần đăng nhập để truy cập trang này.
          </div>
        )}

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">Email</label>
            <div className="form-input-icon-wrap">
              <Mail size={16} className="form-input-icon" />
              <input
                id="login-email"
                type="email"
                className={`form-input form-input--icon ${touched.email && fieldErrors.email ? 'form-input--error' : touched.email && !fieldErrors.email ? 'form-input--valid' : ''}`}
                placeholder="email@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched.email) setFieldErrors(prev => ({ ...prev, email: isValidEmail(e.target.value) ? undefined : 'Địa chỉ email không hợp lệ.' }));
                }}
                onBlur={() => handleBlur('email')}
                autoComplete="email"
              />
            </div>
            {touched.email && fieldErrors.email && (
              <span className="form-field-error"><AlertCircle size={12} />{fieldErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="login-password" className="form-label">Mật khẩu</label>
            </div>
            <div className="form-input-icon-wrap">
              <Lock size={16} className="form-input-icon" />
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                className={`form-input form-input--icon form-input--pr ${touched.password && fieldErrors.password ? 'form-input--error' : touched.password && !fieldErrors.password ? 'form-input--valid' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touched.password) setFieldErrors(prev => ({ ...prev, password: e.target.value.length >= 6 ? undefined : 'Mật khẩu phải có ít nhất 6 ký tự.' }));
                }}
                onBlur={() => handleBlur('password')}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="form-eye-btn"
                onClick={() => setShowPass(!showPass)}
                aria-label="Toggle password visibility"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {touched.password && fieldErrors.password && (
              <span className="form-field-error"><AlertCircle size={12} />{fieldErrors.password}</span>
            )}
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={loading}
          >
            {loading && <Loader2 size={18} className="spin" />}
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="auth-switch">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="auth-link">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
