import { useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, ChevronDown, Loader2, Sparkles, XCircle } from 'lucide-react';
import { aiLearningService } from '../services/aiLearningService';
import type { AiQuestionExplanation as Explanation, Question } from '../types';
import './AiQuestionExplanation.css';

interface Props {
  question: Question;
  selectedAnswer: number | null;
  disabled?: boolean;
}

const toTypingText = (result: Explanation) => [
  result.overview,
  ...result.steps.map((step, index) => `\n${index + 1}. ${step}`),
  ...result.optionAnalyses.map(item => `\n${String.fromCharCode(65 + item.optionIndex)}. ${item.explanation}`),
  `\n💡 ${result.studyTip}`,
].join('');

const AiQuestionExplanation = ({ question, selectedAnswer, disabled }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Explanation | null>(null);
  const [error, setError] = useState('');
  const [visibleCharacters, setVisibleCharacters] = useState(0);
  const typingText = useMemo(() => result ? toTypingText(result) : '', [result]);
  const typing = !!result && visibleCharacters < typingText.length;

  useEffect(() => {
    if (!result || visibleCharacters >= typingText.length) return;
    const timer = window.setInterval(() => {
      setVisibleCharacters(current => Math.min(current + 4, typingText.length));
    }, 18);
    return () => window.clearInterval(timer);
  }, [result, visibleCharacters, typingText.length]);

  const handleAsk = async () => {
    if (result) {
      setOpen(current => !current);
      return;
    }
    setOpen(true);
    setLoading(true);
    setError('');
    try {
      const explanation = await aiLearningService.explainQuestion({
        questionId: question.id,
        question: question.content,
        options: question.options,
        correctAnswer: question.correctAnswer,
        selectedAnswer,
        existingExplanation: question.explanation,
      });
      setResult(explanation);
      setVisibleCharacters(0);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'AI chưa thể giải thích câu hỏi này. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`ai-question ${open ? 'ai-question--open' : ''}`}>
      <button
        type="button"
        className="ai-question__trigger"
        onClick={handleAsk}
        disabled={loading || disabled}
        title={disabled ? 'Đăng nhập để hỏi trợ lý AI' : undefined}
      >
        {loading ? <Loader2 size={17} className="spin" /> : <Sparkles size={17} />}
        {loading ? 'AI đang suy nghĩ...' : 'Hỏi AI về câu này'}
        {result && <ChevronDown size={16} className="ai-question__chevron" />}
      </button>

      {open && (
        <div className="ai-question__panel">
          <div className="ai-question__heading"><Bot size={20} /><strong>Trợ lý học tập Gemini</strong></div>
          {loading && <div className="ai-question__skeleton"><i /><i /><i /></div>}
          {error && <div className="ai-question__error">{error}</div>}
          {result && typing && (
            <div className="ai-question__typing">
              {typingText.slice(0, visibleCharacters)}<span className="ai-question__cursor" />
            </div>
          )}
          {result && !typing && (
            <div className="ai-question__content">
              <p className="ai-question__overview">{result.overview}</p>
              <ol className="ai-question__steps">{result.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
              <div className="ai-question__options">
                {result.optionAnalyses.map(item => (
                  <div key={item.optionIndex} className={`ai-question__option ${item.correct ? 'is-correct' : 'is-wrong'}`}>
                    {item.correct ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
                    <div><strong>{String.fromCharCode(65 + item.optionIndex)}. {item.optionText}</strong><p>{item.explanation}</p></div>
                    {item.selected && <span>Bạn chọn</span>}
                  </div>
                ))}
              </div>
              <div className="ai-question__tip">💡 <strong>Mẹo học:</strong> {result.studyTip}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AiQuestionExplanation;
