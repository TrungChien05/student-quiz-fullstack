import { Link } from 'react-router-dom';
import { CheckCircle2, FileText, Sparkles } from 'lucide-react';
import './HeroSection.css';

const DemoCard = () => (
  <div className="demo-card animate-fade-up-delay-3">
    <div className="demo-step">
      <div className="demo-step__header">
        <FileText size={14} className="demo-step__icon step-icon--upload" />
        <span className="demo-step__label">Upload tài liệu</span>
      </div>
      <div className="demo-step__file">
        <span className="demo-file-icon">📄</span>
        <span>sample.pdf</span>
      </div>
    </div>

    <div className="demo-connector">
      <div className="demo-connector__line" />
    </div>

    <div className="demo-step">
      <div className="demo-step__header">
        <Sparkles size={14} className="demo-step__icon step-icon--ai" />
        <span className="demo-step__label">AI xử lý</span>
      </div>
      <div className="demo-step__processing">
        <span className="demo-processing-icon">✨</span>
        <span className="demo-processing-text">Đang tạo câu hỏi...</span>
      </div>
    </div>

    <div className="demo-connector">
      <div className="demo-connector__line" />
    </div>

    <div className="demo-step demo-step--success">
      <div className="demo-step__header">
        <CheckCircle2 size={14} className="demo-step__icon step-icon--done" />
        <span className="demo-step__label">Quiz sẵn sàng</span>
      </div>
      <div className="demo-step__file">
        <span className="demo-file-icon">📊</span>
        <span className="demo-ready-text">Bắt đầu học</span>
      </div>
    </div>
  </div>
);

const HeroSection = () => {
  return (
    <section className="hero">
      <div className="container hero__inner">
        {/* Left content */}
        <div className="hero__content">
          <h1 className="hero__title animate-fade-up">
            Biến tài liệu dài dòng<br />
            thành bài quiz thông<br />
            minh
          </h1>
          <p className="hero__desc animate-fade-up-delay-1">
            Upload file PDF/DOCX – AI tự động tạo câu hỏi trắc nghiệm
            giúp bạn học nhanh hơn
          </p>
          <div className="hero__actions animate-fade-up-delay-2">
            <Link to="/create" id="hero-create-btn" className="btn btn-primary">Tạo Quiz ngay</Link>
            <Link to="/explore" id="hero-explore-btn" className="btn btn-outline">Khám phá bài quiz</Link>
          </div>
        </div>

        {/* Right: Demo Card */}
        <div className="hero__demo">
          <DemoCard />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
