import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Upload, FileText, Loader2, CheckCircle2, Trash2, ArrowRight, Plus, ImagePlus, X } from 'lucide-react';
import { quizService } from '../services/quizService';
import { useAuth } from '../context/AuthContext';
import './CreatePage.css';

const CATEGORIES = ['Toán học', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý', 'Ngoại ngữ', 'Văn học', 'Khác'];

type Step = 'form' | 'processing' | 'done';

const getRequestErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  const message = error.response?.data?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
};

const CreatePage = () => {
  const [method, setMethod] = useState<'ai' | 'manual'>('ai');
  const [file, setFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [manualQuestions, setManualQuestions] = useState<
    { content: string; options: string[]; correctAnswer: number; explanation?: string }[]
  >([{ content: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }]);
  const [step, setStep] = useState<Step>('form');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [createdQuizId, setCreatedQuizId] = useState<number | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) validateAndSetFile(f);
  };

  const validateAndSetFile = (f: File) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(f.type) && !f.name.endsWith('.docx') && !f.name.endsWith('.pdf')) {
      setError('Chỉ hỗ trợ file PDF và DOCX.');
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError('File không được vượt quá 20MB.');
      return;
    }
    setError('');
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
  };

  const handleCoverImage = (f: File) => {
    if (!f.type.startsWith('image/')) {
      setError('Ảnh bìa phải là file hình ảnh (JPG, PNG, WEBP...).');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('Ảnh bìa không được vượt quá 5MB.');
      return;
    }
    setCoverImage(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const removeCoverImage = () => {
    setCoverImage(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
  };

  const simulateProcessing = () => {
    const delays = [1000, 2000, 1500];
    delays.forEach((_, i) => {
      setTimeout(() => setProcessingStep(i + 1), delays.slice(0, i + 1).reduce((a, b) => a + b, 0));
    });
  };

  const addQuestion = () => {
    setManualQuestions(prev => [
      ...prev,
      { content: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }
    ]);
  };

  const removeQuestion = (index: number) => {
    if (manualQuestions.length === 1) return;
    setManualQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    setManualQuestions(prev => {
      const copy = [...prev];
      if (field === 'content') {
        copy[index].content = value;
      } else if (field === 'explanation') {
        copy[index].explanation = value;
      } else if (field === 'correctAnswer') {
        copy[index].correctAnswer = Number(value);
      }
      return copy;
    });
  };

  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    setManualQuestions(prev => {
      const copy = [...prev];
      const newOpts = [...copy[qIndex].options];
      newOpts[optIndex] = value;
      copy[qIndex].options = newOpts;
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/create' } });
      return;
    }
    setError('');

    if (method === 'manual') {
      // Validate
      for (let i = 0; i < manualQuestions.length; i++) {
        const q = manualQuestions[i];
        if (!q.content.trim()) {
          setError(`Câu hỏi số ${i + 1} chưa điền nội dung câu hỏi.`);
          window.scrollTo({ top: 400, behavior: 'smooth' });
          return;
        }
        for (let j = 0; j < 4; j++) {
          if (!q.options[j].trim()) {
            setError(`Đáp án ${String.fromCharCode(65 + j)} của câu hỏi số ${i + 1} chưa điền.`);
            window.scrollTo({ top: 400, behavior: 'smooth' });
            return;
          }
        }
      }

      setStep('processing');
      setProcessingStep(0);
      setTimeout(() => setProcessingStep(1), 800);
      setTimeout(() => setProcessingStep(2), 1600);
      setTimeout(() => setProcessingStep(3), 2400);

      try {
        const [quiz] = await Promise.all([
          quizService.create({
            title,
            category,
            description,
            questionCount: manualQuestions.length,
            questions: manualQuestions
          }, undefined, coverImage || undefined),
          new Promise(resolve => setTimeout(resolve, 3000))
        ]);
        setCreatedQuizId(quiz.id);
        setStep('done');
      } catch (requestError: unknown) {
        setError(getRequestErrorMessage(
          requestError,
          'Đã có lỗi xảy ra khi lưu quiz. Vui lòng thử lại.'
        ));
        setStep('form');
      }
    } else {
      setError('');
      setStep('processing');
      setProcessingStep(0);
      simulateProcessing();

      try {
        const [quiz] = await Promise.all([
          quizService.create({ title, category, description, questionCount }, file || undefined, coverImage || undefined),
          new Promise(resolve => setTimeout(resolve, 4500))
        ]);
        setCreatedQuizId(quiz.id);
        setStep('done');
      } catch (requestError: unknown) {
        setError(getRequestErrorMessage(
          requestError,
          'Đã có lỗi xảy ra khi tạo quiz. Vui lòng thử lại.'
        ));
        setStep('form');
      }
    }
  };

  const formatBytes = (bytes: number) =>
    bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  const PROCESSING_STEPS = method === 'ai' ? [
    { label: '📄 Đọc và phân tích tài liệu', done: processingStep >= 1, active: processingStep === 0 },
    { label: '✨ AI tạo câu hỏi trắc nghiệm', done: processingStep >= 2, active: processingStep === 1 },
    { label: '📊 Hoàn thiện và lưu quiz', done: processingStep >= 3, active: processingStep === 2 },
  ] : [
    { label: '🔍 Kiểm tra tính hợp lệ', done: processingStep >= 1, active: processingStep === 0 },
    { label: '💾 Lưu trữ bộ câu hỏi thủ công', done: processingStep >= 2, active: processingStep === 1 },
    { label: '📊 Hoàn thiện và lưu quiz', done: processingStep >= 3, active: processingStep === 2 },
  ];

  return (
    <main className="create-page">
      <div className="container">
        <div className="create-header">
          <h1 className="create-title">Tạo Quiz mới</h1>
          <p className="create-subtitle">Upload tài liệu để AI tự động tạo câu hỏi trắc nghiệm</p>
        </div>

        {!isAuthenticated && step === 'form' && (
          <div className="create-auth-notice">
            🔒 Bạn cần <a href="/login" className="auth-link">đăng nhập</a> để tạo quiz và lưu vào tài khoản.
          </div>
        )}

        {step === 'form' && (
          <>
            <div className="create-tabs">
              <button
                type="button"
                className={`create-tab-btn ${method === 'ai' ? 'active' : ''}`}
                onClick={() => { setMethod('ai'); setError(''); }}
              >
                ✨ Tạo tự động bằng AI
              </button>
              <button
                type="button"
                className={`create-tab-btn ${method === 'manual' ? 'active' : ''}`}
                onClick={() => { setMethod('manual'); setError(''); }}
              >
                ✍️ Tự soạn thủ công
              </button>
            </div>

            <form onSubmit={handleSubmit} className="create-form">
              {method === 'ai' && (
                /* Upload Zone */
                <div
                  id="upload-zone"
                  className={`upload-zone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
                  onDrop={handleFileDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                >
                  {file ? (
                    <div className="upload-zone__file">
                      <FileText size={32} className="upload-zone__file-icon" />
                      <div className="upload-zone__file-info">
                        <span className="upload-zone__file-name">{file.name}</span>
                        <span className="upload-zone__file-size">{formatBytes(file.size)}</span>
                      </div>
                      <button type="button" className="upload-zone__remove" onClick={() => setFile(null)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="file-input" className="upload-zone__label">
                      <Upload size={40} className="upload-zone__upload-icon" />
                      <span className="upload-zone__text">
                        Kéo & thả file vào đây hoặc <span className="upload-zone__link">chọn file</span>
                      </span>
                      <span className="upload-zone__hint">Hỗ trợ PDF, DOCX • Tối đa 20MB</span>
                      <input id="file-input" type="file" accept=".pdf,.docx" hidden onChange={e => e.target.files?.[0] && validateAndSetFile(e.target.files[0])} />
                    </label>
                  )}
                </div>
              )}

              {error && <div className="create-error">{error}</div>}

              {/* Form Fields */}
              <div className="create-fields">
                <div className="form-group">
                  <label htmlFor="quiz-title" className="form-label">Tên bài Quiz *</label>
                  <input
                    id="quiz-title"
                    type="text"
                    className="form-input"
                    placeholder="VD: Hóa học hữu cơ – Chương 1"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={200}
                    required
                  />
                </div>

                <div className="create-fields-row">
                  <div className="form-group">
                    <label htmlFor="quiz-category" className="form-label">Danh mục *</label>
                    <select id="quiz-category" className="form-input" value={category} onChange={e => setCategory(e.target.value)} required>
                      <option value="">Chọn danh mục...</option>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>

                  {method === 'ai' && (
                    <div className="form-group">
                      <label htmlFor="quiz-count" className="form-label">
                        Số câu hỏi: <strong style={{ color: 'var(--primary)' }}>{questionCount}</strong>
                      </label>
                      <input
                        id="quiz-count"
                        type="range"
                        min={5} max={50} step={5}
                        value={questionCount}
                        onChange={e => setQuestionCount(Number(e.target.value))}
                        className="quiz-range"
                      />
                      <div className="range-labels"><span>5</span><span>25</span><span>50</span></div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="quiz-desc" className="form-label">Mô tả (tùy chọn)</label>
                  <textarea
                    id="quiz-desc"
                    className="form-input"
                    placeholder="Mô tả ngắn về nội dung bài quiz..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Cover Image Picker */}
                <div className="form-group">
                  <label className="form-label">Ảnh bìa Quiz (tùy chọn)</label>
                  {coverPreview ? (
                    <div className="cover-preview">
                      <img src={coverPreview} alt="Ảnh bìa" className="cover-preview__img" />
                      <div className="cover-preview__overlay">
                        <label htmlFor="cover-input" className="cover-preview__change-btn">
                          <ImagePlus size={16} /> Đổi ảnh
                          <input id="cover-input" type="file" accept="image/*" hidden
                            onChange={e => e.target.files?.[0] && handleCoverImage(e.target.files[0])} />
                        </label>
                        <button type="button" className="cover-preview__remove-btn" onClick={removeCoverImage}>
                          <X size={16} /> Xóa
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="cover-input" className="cover-upload-zone">
                      <ImagePlus size={28} className="cover-upload-zone__icon" />
                      <span className="cover-upload-zone__text">Nhấp để chọn ảnh bìa</span>
                      <span className="cover-upload-zone__hint">JPG, PNG, WEBP • Tối đa 5MB</span>
                      <input id="cover-input" type="file" accept="image/*" hidden
                        onChange={e => e.target.files?.[0] && handleCoverImage(e.target.files[0])} />
                    </label>
                  )}
                </div>

                {/* Manual Questions Section */}
                {method === 'manual' && (
                  <div className="manual-questions-section">
                    <h3 className="section-title">Danh sách câu hỏi</h3>
                    {manualQuestions.map((q, qIndex) => (
                      <div key={qIndex} className="manual-question-card card">
                        <div className="manual-question-card__header">
                          <h4>Câu hỏi {qIndex + 1}</h4>
                          {manualQuestions.length > 1 && (
                            <button
                              type="button"
                              className="btn-remove-question"
                              onClick={() => removeQuestion(qIndex)}
                              title="Xóa câu hỏi này"
                            >
                              <Trash2 size={16} /> Xóa câu hỏi
                            </button>
                          )}
                        </div>

                        <div className="form-group">
                          <label className="form-label">Nội dung câu hỏi *</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="VD: Cốc nước chứa dung dịch gì màu xanh lam?"
                            value={q.content}
                            onChange={e => handleQuestionChange(qIndex, 'content', e.target.value)}
                            required
                          />
                        </div>

                        <div className="manual-options-grid">
                          {q.options.map((opt, optIndex) => (
                            <div key={optIndex} className="manual-option-item">
                              <label className="option-select-label">
                                <input
                                  type="radio"
                                  name={`correct-ans-${qIndex}`}
                                  checked={q.correctAnswer === optIndex}
                                  onChange={() => handleQuestionChange(qIndex, 'correctAnswer', optIndex)}
                                />
                                <span className="option-letter">{String.fromCharCode(65 + optIndex)}</span>
                              </label>
                              <input
                                type="text"
                                className="form-input option-input"
                                placeholder={`Nhập đáp án ${String.fromCharCode(65 + optIndex)}...`}
                                value={opt}
                                onChange={e => handleOptionChange(qIndex, optIndex, e.target.value)}
                                required
                              />
                            </div>
                          ))}
                        </div>

                        <div className="form-group" style={{ marginTop: '12px' }}>
                          <label className="form-label">Giải thích chi tiết (tùy chọn)</label>
                          <textarea
                            className="form-input"
                            placeholder="Giải thích tại sao đáp án đã chọn lại chính xác..."
                            value={q.explanation || ''}
                            onChange={e => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                            rows={2}
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="btn btn-outline btn-add-question"
                      onClick={addQuestion}
                      style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px' }}
                    >
                      <Plus size={16} /> Thêm câu hỏi mới
                    </button>
                  </div>
                )}
              </div>

              <button
                id="create-quiz-btn"
                type="submit"
                className="btn btn-primary create-submit-btn"
                style={{ marginTop: '24px' }}
              >
                {method === 'ai' ? (
                  file ? <><Upload size={18} /> Tạo Quiz với AI (Có file)</> : <><ArrowRight size={18} /> Tạo Quiz với AI (Không file)</>
                ) : (
                  <><CheckCircle2 size={18} /> Đăng tải bài Quiz (Thủ công)</>
                )}
              </button>

              {method === 'ai' && (
                <p className="create-note">
                  💡 <strong>Tip:</strong> Upload file tài liệu để AI tạo câu hỏi chính xác hơn. Nếu không có file, AI sẽ tạo dựa trên tên và danh mục.
                </p>
              )}
            </form>
          </>
        )}

        {step === 'processing' && (
          <div className="create-processing">
            <div className="processing-animation">
              <div className="processing-ring" />
              <Loader2 size={32} className="processing-spinner" />
            </div>
            <h2>AI đang tạo quiz của bạn...</h2>
            <p>Đang tạo <strong>{questionCount}</strong> câu hỏi cho bài: <strong>"{title}"</strong></p>

            <div className="processing-steps">
              {PROCESSING_STEPS.map((s, i) => (
                <div key={i} className={`processing-step-item ${s.done ? 'done' : s.active ? 'active' : ''}`}>
                  <div className="processing-step-dot" />
                  <span>{s.label}</span>
                  {s.done && <CheckCircle2 size={16} color="#10B981" />}
                  {s.active && <Loader2 size={16} className="spin" color="var(--primary)" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="create-done">
            <div className="done-circle">
              <CheckCircle2 size={48} />
            </div>
            <h2>Gửi Quiz thành công! 🎉</h2>
            <p>
              Đã tạo <strong>{questionCount}</strong> câu hỏi cho bài quiz<br />
              <strong>"{title}"</strong> trong danh mục <strong>{category}</strong>.
            </p>
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              color: '#f59e0b',
              padding: '12px 16px',
              borderRadius: '8px',
              marginTop: '16px',
              marginBottom: '24px',
              fontSize: '0.9rem'
            }}>
              ⏳ Bài quiz của bạn đang <strong>Chờ duyệt</strong>. Sau khi Admin duyệt, nó sẽ được hiển thị công khai.
            </div>
            <div className="create-done__actions">
              {createdQuizId && (
                <button
                  id="start-quiz-btn"
                  className="btn btn-primary"
                  onClick={() => navigate(`/quiz/${createdQuizId}`)}
                >
                  Xem trước quiz
                </button>
              )}

              <button
                className="btn btn-outline"
                onClick={() => { setStep('form'); setFile(null); setTitle(''); setCategory(''); setDescription(''); setProcessingStep(0); }}
              >
                Tạo quiz khác
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/explore')}>
                Khám phá quiz
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default CreatePage;
