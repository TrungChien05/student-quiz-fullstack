import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => (
  <footer className="footer">
    <div className="container footer__inner">
      <div className="footer__brand">
        <Link to="/" className="footer__logo">
          <span className="footer__logo-icon">S</span>
          <span>StudentQuizz</span>
        </Link>
        <p className="footer__tagline">
          Nền tảng học tập thông minh với AI
        </p>
      </div>

      <div className="footer__links-group">
        <h4>Sản phẩm</h4>
        <Link to="/explore">Khám phá</Link>
        <Link to="/create">Tạo Quiz</Link>
        <Link to="/forum">Diễn đàn</Link>
      </div>

      <div className="footer__links-group">
        <h4>Hỗ trợ</h4>
        <a href="#">Hướng dẫn</a>
        <a href="#">Liên hệ</a>
        <a href="#">Báo lỗi</a>
      </div>

      <div className="footer__links-group">
        <h4>Pháp lý</h4>
        <a href="#">Điều khoản</a>
        <a href="#">Bảo mật</a>
      </div>
    </div>

    <div className="footer__bottom">
      <div className="container">
        <span>© 2026 StudentQuizz. All rights reserved.</span>
      </div>
    </div>
  </footer>
);

export default Footer;
