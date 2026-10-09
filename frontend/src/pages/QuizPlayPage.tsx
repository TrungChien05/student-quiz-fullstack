import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, XCircle, Trophy, RotateCcw, Send, Play, HelpCircle, 
  UserCheck, Loader2, Clock, BookOpen, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { quizService } from '../services/quizService';
import { useAuth } from '../context/AuthContext';
import CommentThread from '../components/Forum/CommentThread';
import AiQuestionExplanation from '../components/AiQuestionExplanation';
import type { Quiz, Question, QuizComment } from '../types';
import './QuizPlayPage.css';

const QuizPlayPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [hasStarted, setHasStarted] = useState(false);
  const [comments, setComments] = useState<QuizComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [playRecorded, setPlayRecorded] = useState(false);

  // New features: Practice vs Exam mode
  const [playMode, setPlayMode] = useState<'practice' | 'exam'>('practice');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [examAnswers, setExamAnswers] = useState<(number | null)[]>([]);
  const [practiceAnswers, setPracticeAnswers] = useState<(number | null)[]>([]);

  // Safely extract questions list at component level
  const questions: Question[] = quiz?.questions || [];

  useEffect(() => {
    if (!id) return;
    quizService.getById(Number(id)).then(data => {
      setQuiz(data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    quizService.getComments(Number(id))
      .then(setComments)
      .catch(console.error);
  }, [id]);

  // Timer effect for exam mode
  useEffect(() => {
    if (!hasStarted || playMode !== 'exam' || isFinished) return;
    if (timeLeft <= 0) {
      handleSubmitExam();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStarted, playMode, timeLeft, isFinished, examAnswers, quiz]);

  const handleAddComment = async (e: React.FormEvent, parentId?: number) => {
    e.preventDefault();
    if (!id) return;
    const content = newComment.trim();
    if (!content) return;

    setSubmittingComment(true);
    try {
      await quizService.addComment(Number(id), content, parentId);
      setNewComment('');
      const freshComments = await quizService.getComments(Number(id));
      setComments(freshComments);
    } catch (err) {
      console.error('Lỗi khi thêm bình luận:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  useEffect(() => {
    if (!isFinished || playRecorded || !id) return;
    const selectedAnswers = playMode === 'exam' ? examAnswers : practiceAnswers;
    const answerDetails = questions.map((question, index) => ({
      questionId: question.id,
      selectedAnswer: selectedAnswers[index] ?? null,
    }));
    quizService.recordAttempt(Number(id), score, questions.length, answerDetails)
      .then(() => {
        setPlayRecorded(true);
        window.dispatchEvent(new Event('studentquizz:achievement-updated'));
      })
      .catch((err) => {
        console.error('Lỗi khi lưu lịch sử:', err);
        setPlayRecorded(true);
      });
  }, [isFinished, playRecorded, id, score, questions.length, playMode, examAnswers, practiceAnswers]);

  const handleStartQuiz = () => {
    if (!quiz) return;
    setHasStarted(true);
    setCurrentQIndex(0);
    setScore(0);
    setIsFinished(false);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setPlayRecorded(false);
    setPracticeAnswers(new Array(questions.length).fill(null));

    if (playMode === 'exam') {
      setTimeLeft(questions.length * 60); // 1 minute per question
      setExamAnswers(new Array(questions.length).fill(null));
    }
  };

  const handleSelectOption = (index: number) => {
    if (playMode === 'practice') {
      if (isAnswered) return;
      setSelectedAnswer(index);
    } else {
      // Exam mode
      setExamAnswers(prev => {
        const copy = [...prev];
        copy[currentQIndex] = index;
        return copy;
      });
    }
  };

  const handleSubmitAnswerPractice = () => {
    if (selectedAnswer === null) return;
    setPracticeAnswers(previous => {
      const next = [...previous];
      next[currentQIndex] = selectedAnswer;
      return next;
    });
    setIsAnswered(true);
    if (selectedAnswer === questions[currentQIndex].correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextPractice = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrevExam = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(prev => prev - 1);
    }
  };

  const handleNextExam = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
    }
  };

  const handleSubmitExam = () => {
    let finalScore = 0;
    questions.forEach((q, idx) => {
      if (examAnswers[idx] === q.correctAnswer) {
        finalScore++;
      }
    });
    setScore(finalScore);
    setIsFinished(true);
  };

  const handleConfirmSubmitExam = () => {
    if (window.confirm("Bạn có chắc chắn muốn nộp bài thi?")) {
      handleSubmitExam();
    }
  };

  const handleExit = () => {
    if (hasStarted && !isFinished && playMode === 'exam') {
      if (window.confirm("Bạn đang làm bài kiểm tra trong phòng thi. Nếu thoát bây giờ, kết quả của bạn sẽ không được lưu. Bạn có chắc chắn muốn thoát?")) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  const handleRetry = () => {
    handleStartQuiz();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="quiz-play-page loading-state">
        <Loader2 className="spinner spin" size={40} color="var(--primary)" />
        <p>Đang tải câu hỏi...</p>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="quiz-play-page error-state">
        <h2>
          {!quiz
            ? 'Không tìm thấy bài Quiz hoặc bài Quiz chưa được duyệt'
            : 'Bài Quiz chưa có câu hỏi'}
        </h2>
        <Link to="/explore" className="btn btn-primary">Quay lại Khám phá</Link>
      </div>
    );
  }

  // Render landing page if not started
  if (!hasStarted) {
    const totalCommentsCount = comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0);
    const getInitials = (name: string) =>
      name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const AVATAR_COLORS = ['#7C3AED', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
    const handleReply = async (parentId: number, content: string) => {
      await quizService.addComment(Number(id), content, parentId);
      const freshComments = await quizService.getComments(Number(id));
      setComments(freshComments);
    };

    return (
      <main className="quiz-landing-page">
        <div className="container">
          <Link to="/explore" className="back-link">
            <ArrowLeft size={16} /> Khám phá Quiz
          </Link>

          <div className="quiz-landing-layout">
            {/* Quiz Info Card */}
            <div className="quiz-info-card card">
              <span className="quiz-category-tag">{quiz.category}</span>
              <h1 className="quiz-landing-title">{quiz.title}</h1>
              {quiz.description && <p className="quiz-landing-description">{quiz.description}</p>}
              
              <div className="quiz-landing-stats">
                <div className="stat-item">
                  <HelpCircle size={18} className="stat-icon" />
                  <div>
                    <span className="stat-value">{questions.length}</span>
                    <span className="stat-label">câu hỏi</span>
                  </div>
                </div>
                <div className="stat-item">
                  <Play size={18} className="stat-icon" />
                  <div>
                    <span className="stat-value">{quiz.playCount}</span>
                    <span className="stat-label">lượt chơi</span>
                  </div>
                </div>
                {quiz.author && (
                  <div className="stat-item">
                    <UserCheck size={18} className="stat-icon" />
                    <div>
                      <span className="stat-value">{quiz.author.name}</span>
                      <span className="stat-label">người tạo</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Mode Selector */}
              <div className="mode-selector-section">
                <h3 className="mode-selector-title">Chọn chế độ làm bài:</h3>
                <div className="mode-selector-grid">
                  <button
                    type="button"
                    className={`mode-card ${playMode === 'practice' ? 'active' : ''}`}
                    onClick={() => setPlayMode('practice')}
                  >
                    <span className="mode-card-icon"><BookOpen size={24} color="var(--primary)" /></span>
                    <span className="mode-card-info">
                      <span className="mode-card-name">Chế độ Ôn tập</span>
                      <span className="mode-card-desc">Không giới hạn thời gian. Xem ngay đáp án đúng và giải thích chi tiết sau mỗi câu hỏi.</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`mode-card ${playMode === 'exam' ? 'active' : ''}`}
                    onClick={() => setPlayMode('exam')}
                  >
                    <span className="mode-card-icon"><Clock size={24} color="#EF4444" /></span>
                    <span className="mode-card-info">
                      <span className="mode-card-name">Chế độ Phòng thi</span>
                      <span className="mode-card-desc">Thời gian giới hạn (1 phút/câu). Di chuyển tự do giữa các câu và chỉ biết kết quả sau khi nộp bài.</span>
                    </span>
                  </button>
                </div>
              </div>

              <button className="btn btn-primary btn-start-play-quiz" onClick={handleStartQuiz}>
                <Play size={18} fill="currentColor" /> Bắt đầu làm bài
              </button>
            </div>

            {/* Quiz Comments Section */}
            <section className="quiz-comments-section">
              <h2 className="comments-title">Thảo luận & Đánh giá ({totalCommentsCount})</h2>

              {isAuthenticated ? (
                <form onSubmit={(e) => handleAddComment(e)} className="comment-form">
                  <div
                    className="comment-form__avatar"
                    style={{ background: AVATAR_COLORS[(user?.id || 0) % AVATAR_COLORS.length] }}
                  >
                    {user ? getInitials(user.name) : '?'}
                  </div>
                  <div className="comment-form__input-wrap">
                    <textarea
                      id="comment-input"
                      className="comment-form__input"
                      placeholder="Viết bình luận hoặc câu hỏi của bạn về bài quiz này..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      rows={3}
                      maxLength={500}
                    />
                    <div className="comment-form__footer">
                      <span className="form-char-count">{newComment.length}/500</span>
                      <button
                        id="submit-comment-btn"
                        type="submit"
                        className="btn btn-primary"
                        disabled={!newComment.trim() || submittingComment}
                      >
                        {submittingComment ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
                        Gửi bình luận
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="comment-login-prompt">
                  <Link to="/login" className="auth-link">Đăng nhập</Link> để tham gia thảo luận về bài quiz.
                </div>
              )}

              <div className="comment-list" style={{ marginTop: '24px' }}>
                {comments.map(comment => (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    isAuthenticated={isAuthenticated}
                    onReply={handleReply}
                  />
                ))}
                {comments.length === 0 && (
                  <div className="comments-empty">Chưa có bình luận nào cho bài Quiz này. Hãy là người đầu tiên thảo luận!</div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    );
  }

  const currentQuestion = questions[currentQIndex];

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="quiz-play-page">
        <div className="container quiz-result-container" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div className="card quiz-result-card" style={{ margin: '0 auto' }}>
            <Trophy size={64} className="result-icon" />
            <h1 className="result-title">Hoàn thành!</h1>
            <p className="result-subtitle">Bạn đã hoàn thành bài quiz <strong>{quiz.title}</strong> ở chế độ <strong>{playMode === 'exam' ? 'Phòng thi' : 'Ôn tập'}</strong></p>
            
            <div className="result-score-box">
              <span className="result-score">{score} / {questions.length}</span>
              <span className="result-percentage">({percentage}%)</span>
            </div>

            <div className="result-actions">
              <button className="btn btn-primary" onClick={handleRetry}>
                <RotateCcw size={16} /> Làm lại
              </button>
              <button className="btn btn-outline" onClick={() => navigate('/explore')}>
                Khám phá quiz khác
              </button>
            </div>
          </div>

          {/* Exam detailed review section */}
          {playMode === 'exam' && (
            <div className="exam-review-section">
              <h2 className="review-title">Xem lại chi tiết bài làm</h2>
              <div className="review-list">
                {questions.map((q, idx) => {
                  const userAnswer = examAnswers[idx];
                  const isCorrect = userAnswer === q.correctAnswer;
                  
                  return (
                    <div key={idx} className={`review-card card ${isCorrect ? 'review-correct' : userAnswer === null ? 'review-unanswered' : 'review-incorrect'}`}>
                      <div className="review-card-header">
                        <h3>Câu {idx + 1}</h3>
                        <span className={`review-status-badge ${isCorrect ? 'badge-correct' : userAnswer === null ? 'badge-unanswered' : 'badge-incorrect'}`}>
                          {isCorrect ? '✓ Đúng' : userAnswer === null ? '⚠ Chưa trả lời' : '✗ Sai'}
                        </span>
                      </div>
                      
                      <p className="review-question-text">{q.content}</p>
                      
                      <div className="review-options-list">
                        {q.options.map((opt, optIdx) => {
                          let optClass = "review-option-item";
                          const isSelected = userAnswer === optIdx;
                          const isCorrectOpt = q.correctAnswer === optIdx;
                          
                          if (isCorrectOpt) optClass += " correct-opt";
                          else if (isSelected) optClass += " incorrect-opt";
                          
                          return (
                            <div key={optIdx} className={optClass}>
                              <span className="option-label">{String.fromCharCode(65 + optIdx)}</span>
                              <span className="option-text">{opt}</span>
                              {isCorrectOpt && <CheckCircle2 size={16} className="opt-status-icon" color="#10B981" />}
                              {isSelected && !isCorrectOpt && <XCircle size={16} className="opt-status-icon" color="#EF4444" />}
                            </div>
                          );
                        })}
                      </div>
                      
                      {q.explanation && (
                        <div className="review-explanation-box">
                          <strong>Giải thích:</strong> {q.explanation}
                        </div>
                      )}

                      <AiQuestionExplanation
                        question={q}
                        selectedAnswer={userAnswer}
                        disabled={!isAuthenticated}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-play-page">
      <div className="container quiz-play-container">
        {/* Header */}
        <div className="quiz-play-header">
          <button className="back-btn" onClick={handleExit}>
            <ArrowLeft size={18} /> Thoát
          </button>
          
          {/* Show timer if in exam mode */}
          {playMode === 'exam' && (
            <div className={`exam-timer-banner ${timeLeft < 60 ? 'warning' : ''}`}>
              <Clock size={16} />
              <span>Thời gian: {formatTime(timeLeft)}</span>
            </div>
          )}

          <div className="quiz-progress-text">
            {playMode === 'exam' ? 'Chế độ Phòng thi' : 'Chế độ Ôn tập'} • Câu {currentQIndex + 1} / {questions.length}
          </div>
        </div>

        {/* Progress bar */}
        <div className="quiz-progress-bar">
          <div 
            className="quiz-progress-fill" 
            style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question Panel Grid in Exam Mode */}
        {playMode === 'exam' && (
          <div className="exam-question-grid">
            {questions.map((_, idx) => (
              <button
                key={idx}
                className={`grid-item-btn ${currentQIndex === idx ? 'active' : ''} ${examAnswers[idx] !== null ? 'answered' : ''}`}
                onClick={() => setCurrentQIndex(idx)}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        )}

        {/* Question Area */}
        <div className="quiz-question-area card">
          <h2 className="question-text">{currentQuestion.content}</h2>
          
          <div className="options-grid">
            {currentQuestion.options.map((opt, index) => {
              let btnClass = "option-btn";
              const isSelected = playMode === 'practice' 
                ? selectedAnswer === index 
                : examAnswers[currentQIndex] === index;

              if (playMode === 'practice') {
                if (isAnswered) {
                  if (index === currentQuestion.correctAnswer) btnClass += " correct";
                  else if (index === selectedAnswer) btnClass += " incorrect";
                  else btnClass += " disabled";
                } else if (isSelected) {
                  btnClass += " selected";
                }
              } else {
                // Exam Mode
                if (isSelected) {
                  btnClass += " selected";
                }
              }

              return (
                <button 
                  key={index}
                  className={btnClass}
                  onClick={() => handleSelectOption(index)}
                  disabled={playMode === 'practice' && isAnswered}
                >
                  <span className="option-label">{String.fromCharCode(65 + index)}</span>
                  <span className="option-text">{opt}</span>
                  {playMode === 'practice' && isAnswered && index === currentQuestion.correctAnswer && <CheckCircle2 className="option-icon" size={18} />}
                  {playMode === 'practice' && isAnswered && index === selectedAnswer && index !== currentQuestion.correctAnswer && <XCircle className="option-icon" size={18} />}
                </button>
              );
            })}
          </div>

          {/* Explanation Area (Practice mode only) */}
          {playMode === 'practice' && isAnswered && currentQuestion.explanation && (
            <div className={`explanation-box ${selectedAnswer === currentQuestion.correctAnswer ? 'correct-bg' : 'incorrect-bg'}`}>
              <strong>Giải thích:</strong> {currentQuestion.explanation}
            </div>
          )}

          {playMode === 'practice' && isAnswered && (
            <AiQuestionExplanation
              question={currentQuestion}
              selectedAnswer={selectedAnswer}
              disabled={!isAuthenticated}
            />
          )}

          {/* Actions */}
          <div className="quiz-actions" style={{ width: '100%' }}>
            {playMode === 'practice' ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                {!isAnswered ? (
                  <button 
                    className="btn btn-primary submit-ans-btn" 
                    onClick={handleSubmitAnswerPractice}
                    disabled={selectedAnswer === null}
                  >
                    Kiểm tra đáp án
                  </button>
                ) : (
                  <button 
                    className="btn btn-primary next-ans-btn" 
                    onClick={handleNextPractice}
                  >
                    {currentQIndex < questions.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}
                  </button>
                )}
              </div>
            ) : (
              // Exam Mode Actions
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <button 
                  className="btn btn-outline" 
                  onClick={handlePrevExam}
                  disabled={currentQIndex === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ChevronLeft size={16} /> Câu trước
                </button>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  {currentQIndex < questions.length - 1 ? (
                    <button 
                      className="btn btn-primary" 
                      onClick={handleNextExam}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      Câu tiếp theo <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button 
                      className="btn btn-primary" 
                      onClick={handleConfirmSubmitExam}
                    >
                      Nộp bài thi
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizPlayPage;
