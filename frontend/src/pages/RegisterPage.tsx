import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Mail, Lock, User } from 'lucide-react';
import { authService } from '../services/quizService';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

const passwordStrength = (pw: string) => {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return score;
};

const strengthLabel = ['', 'Yếu', 'Trung bình', 'Tốt', 'Mạnh'];
const strengthColor = ['', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'];

type Fields = { name?: string; email?: string; password?: string; confirm?: string };

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Fields>({});
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; password?: boolean; confirm?: boolean }>({});
  const navigate = useNavigate();
  const { login } = useAuth();

  const strength = passwordStrength(password);

  const validate = (fields?: Partial<{ name: string; email: string; password: string; confirm: string }>) => {
    const n = fields?.name ?? name;
    const e = fields?.email ?? email;
    const p = fields?.password ?? password;
    const c = fields?.confirm ?? confirm;
    const errors: Fields = {};

    if (!n.trim()) errors.name = 'Vui lòng nhập họ và tên.';
    else if (n.trim().length < 2) errors.name = 'Họ và tên phải có ít nhất 2 ký tự.';

    if (!e.trim()) errors.email = 'Vui lòng nhập địa chỉ email.';
    else if (!isValidEmail(e)) errors.email = 'Địa chỉ email không hợp lệ.';

    if (!p) errors.password = 'Vui lòng nhập mật khẩu.';
    else if (p.length < 8) errors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';

    if (!c) errors.confirm = 'Vui lòng xác nhận mật khẩu.';
    else if (c !== p) errors.confirm = 'Mật khẩu xác nhận không khớp.';

    return errors;
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setFieldErrors(validate());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true });
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setError('');
    setLoading(true);
    try {
      const data = await authService.register(name.trim(), email.trim(), password);
      login(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Đăng ký thất bại. Email có thể đã được sử dụng.';
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

        <h1 className="auth-title">Tạo tài khoản</h1>
        <p className="auth-subtitle">Bắt đầu học thông minh hơn ngay hôm nay</p>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Họ và tên */}
          <div className="form-group">
            <label htmlFor="reg-name" className="form-label">Họ và tên</label>
            <div className="form-input-icon-wrap">
              <User size={16} className="form-input-icon" />
              <input
                id="reg-name"
                type="text"
                className={`form-input form-input--icon ${touched.name && fieldErrors.name ? 'form-input--error' : touched.name && !fieldErrors.name ? 'form-input--valid' : ''}`}
                placeholder="Nguyễn Văn A"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (touched.name) setFieldErrors(validate({ name: e.target.value }));
                }}
                onBlur={() => handleBlur('name')}
                autoComplete="name"
              />
            </div>
            {touched.name && fieldErrors.name && (
              <span className="form-field-error"><AlertCircle size={12} />{fieldErrors.name}</span>
            )}
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">Email</label>
            <div className="form-input-icon-wrap">
              <Mail size={16} className="form-input-icon" />
              <input
                id="reg-email"
                type="email"
                className={`form-input form-input--icon ${touched.email && fieldErrors.email ? 'form-input--error' : touched.email && !fieldErrors.email ? 'form-input--valid' : ''}`}
                placeholder="email@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched.email) setFieldErrors(validate({ email: e.target.value }));
                }}
                onBlur={() => handleBlur('email')}
                autoComplete="email"
              />
            </div>
            {touched.email && fieldErrors.email && (
              <span className="form-field-error"><AlertCircle size={12} />{fieldErrors.email}</span>
            )}
          </div>

          {/* Mật khẩu */}
          <div className="form-group">
            <label htmlFor="reg-password" className="form-label">Mật khẩu</label>
            <div className="form-input-icon-wrap">
              <Lock size={16} className="form-input-icon" />
              <input
                id="reg-password"
                type={showPass ? 'text' : 'password'}
                className={`form-input form-input--icon form-input--pr ${touched.password && fieldErrors.password ? 'form-input--error' : touched.password && !fieldErrors.password ? 'form-input--valid' : ''}`}
                placeholder="Tối thiểu 8 ký tự"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touched.password) setFieldErrors(validate({ password: e.target.value }));
                }}
                onBlur={() => handleBlur('password')}
                autoComplete="new-password"
              />
              <button type="button" className="form-eye-btn" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {touched.password && fieldErrors.password && (
              <span className="form-field-error"><AlertCircle size={12} />{fieldErrors.password}</span>
            )}
            {password && (
              <div className="password-strength">
                <div className="password-strength__bars">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="password-strength__bar"
                      style={{ background: i <= strength ? strengthColor[strength] : '#E5E7EB' }}
                    />
                  ))}
                </div>
                <span style={{ color: strengthColor[strength], fontSize: '0.78rem', fontWeight: 600 }}>
                  {strengthLabel[strength]}
                </span>
              </div>
            )}
            <ul className="password-rules">
              <li className={password.length >= 8 ? 'rule-ok' : ''}><CheckCircle2 size={11} /> Ít nhất 8 ký tự</li>
              <li className={/[A-Z]/.test(password) ? 'rule-ok' : ''}><CheckCircle2 size={11} /> Có chữ hoa</li>
              <li className={/[0-9]/.test(password) ? 'rule-ok' : ''}><CheckCircle2 size={11} /> Có chữ số</li>
              <li className={/[^a-zA-Z0-9]/.test(password) ? 'rule-ok' : ''}><CheckCircle2 size={11} /> Có ký tự đặc biệt</li>
            </ul>
          </div>

          {/* Xác nhận mật khẩu */}
          <div className="form-group">
            <label htmlFor="reg-confirm" className="form-label">Xác nhận mật khẩu</label>
            <div className="form-input-icon-wrap">
              <Lock size={16} className="form-input-icon" />
              <input
                id="reg-confirm"
                type={showConfirm ? 'text' : 'password'}
                className={`form-input form-input--icon form-input--pr ${touched.confirm && fieldErrors.confirm ? 'form-input--error' : touched.confirm && !fieldErrors.confirm ? 'form-input--valid' : ''}`}
                placeholder="Nhập lại mật khẩu"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (touched.confirm) setFieldErrors(validate({ confirm: e.target.value }));
                }}
                onBlur={() => handleBlur('confirm')}
              />
              <button type="button" className="form-eye-btn" onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {touched.confirm && fieldErrors.confirm && (
              <span className="form-field-error"><AlertCircle size={12} />{fieldErrors.confirm}</span>
            )}
            {touched.confirm && !fieldErrors.confirm && confirm && (
              <span className="form-field-success"><CheckCircle2 size={12} />Mật khẩu khớp!</span>
            )}
          </div>

          <button
            id="register-submit-btn"
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={loading}
          >
            {loading && <Loader2 size={18} className="spin" />}
            {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
          </button>
        </form>

        <p className="auth-switch">
          Đã có tài khoản?{' '}
          <Link to="/login" className="auth-link">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
