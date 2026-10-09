import { useState } from 'react';
import { BrainCircuit, CheckCircle2, Loader2, RefreshCw, Sparkles, Target, TriangleAlert } from 'lucide-react';
import { aiLearningService } from '../services/aiLearningService';
import type { AiWeaknessAnalysis } from '../types';
import './AiLearningAnalysisPanel.css';

const PRIORITY_LABEL = { HIGH: 'Ưu tiên cao', MEDIUM: 'Ưu tiên vừa', LOW: 'Ưu tiên thấp' } as const;

const AiLearningAnalysisPanel = () => {
  const [analysis, setAnalysis] = useState<AiWeaknessAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  const analyze = async () => {
    setLoading(true);
    setError('');
    try {
      setAnalysis(await aiLearningService.analyzeWeakness());
      setSelectedAnswers({});
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'AI chưa thể phân tích dữ liệu học tập. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="ai-learning" aria-labelledby="ai-learning-title">
      <div className="ai-learning__header">
        <div className="ai-learning__title-icon"><BrainCircuit size={24} /></div>
        <div>
          <span><Sparkles size={13} /> Cá nhân hóa bởi Gemini</span>
          <h2 id="ai-learning-title">Phân tích học tập thông minh từ AI</h2>
          <p>AI đọc lịch sử làm bài và các câu sai để tìm lỗ hổng kiến thức riêng của bạn.</p>
        </div>
        <button type="button" onClick={analyze} disabled={loading}>
          {loading ? <Loader2 size={17} className="spin" /> : analysis ? <RefreshCw size={17} /> : <Sparkles size={17} />}
          {loading ? 'Đang phân tích...' : analysis ? 'Phân tích lại' : 'Phân tích ngay'}
        </button>
      </div>

      {loading && <div className="ai-learning__loading"><i /><i /><i /><small>Gemini đang tổng hợp kết quả và tạo bài ôn tập...</small></div>}
      {error && <div className="ai-learning__error"><TriangleAlert size={18} />{error}</div>}

      {analysis?.insufficientData && (
        <div className="ai-learning__empty">
          <span>🧠</span><div><strong>AI cần thêm dữ liệu</strong><p>{analysis.recommendations[0]}</p></div>
        </div>
      )}

      {analysis && !analysis.insufficientData && (
        <div className="ai-learning__results">
          <div className="ai-learning__meta">Đã phân tích <strong>{analysis.analyzedAttempts}</strong> lượt làm bài và <strong>{analysis.analyzedWrongAnswers}</strong> câu sai chi tiết.</div>
          <div className="ai-learning__columns">
            <div className="ai-learning__block ai-learning__block--strength">
              <h3><CheckCircle2 size={18} /> Điểm mạnh</h3>
              {analysis.strengths.length ? <ul>{analysis.strengths.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>Chưa đủ dữ liệu để xác định rõ điểm mạnh.</p>}
            </div>
            <div className="ai-learning__block ai-learning__block--weakness">
              <h3><Target size={18} /> Điểm cần củng cố</h3>
              <div className="ai-learning__weaknesses">
                {analysis.weaknesses.map((item, index) => (
                  <article key={index}>
                    <div><strong>{item.topic}</strong><span className={`priority-${item.priority.toLowerCase()}`}>{PRIORITY_LABEL[item.priority]}</span></div>
                    <p>{item.reason}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="ai-learning__recommendations">
            <h3>📚 Lộ trình gợi ý</h3>
            <ol>{analysis.recommendations.map((item, index) => <li key={index}><b>{index + 1}</b><span>{item}</span></li>)}</ol>
          </div>

          <div className="ai-learning__review">
            <div className="ai-learning__review-title"><div><span>Bộ ôn tập cá nhân hóa</span><h3>5 câu lấp lỗ hổng kiến thức</h3></div><em>AI tạo tự động</em></div>
            {analysis.reviewQuestions.map((question, questionIndex) => {
              const selected = selectedAnswers[questionIndex];
              const answered = selected !== undefined;
              return (
                <article className="ai-review-question" key={questionIndex}>
                  <h4><span>{questionIndex + 1}</span>{question.content}</h4>
                  <div className="ai-review-question__options">
                    {question.options.map((option, optionIndex) => {
                      const className = answered
                        ? optionIndex === question.correctAnswer ? 'is-correct' : optionIndex === selected ? 'is-wrong' : ''
                        : '';
                      return <button type="button" key={optionIndex} className={className} disabled={answered} onClick={() => setSelectedAnswers(previous => ({...previous,[questionIndex]:optionIndex}))}><b>{String.fromCharCode(65 + optionIndex)}</b>{option}</button>;
                    })}
                  </div>
                  {answered && <div className="ai-review-question__explanation">{selected === question.correctAnswer ? '✅ Chính xác! ' : '💡 Chưa đúng. '}{question.explanation}</div>}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default AiLearningAnalysisPanel;
