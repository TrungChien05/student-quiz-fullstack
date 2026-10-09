import { Link } from 'react-router-dom';
import type { Quiz } from '../../types';
import './QuizCard.css';

interface QuizCardProps {
  quiz: Quiz;
}

const AVATAR_COLORS = [
  '#7C3AED', '#8B5CF6', '#A855F7', '#6D28D9', '#9F67FA', '#C084FC',
];

const getCategoryColor = (category: string) => {
  const map: Record<string, string> = {
    'Lịch sử': '#EF4444',
    'Hóa học': '#F59E0B',
    'Ngoại ngữ': '#10B981',
    'Toán học': '#3B82F6',
    'Sinh học': '#14B8A6',
    'Vật lý': '#F97316',
  };
  return map[category] || '#7C3AED';
};

const QuizCard = ({ quiz }: QuizCardProps) => {
  const avatarColor = AVATAR_COLORS[quiz.id % AVATAR_COLORS.length];
  const categoryColor = getCategoryColor(quiz.category);

  return (
    <Link to={`/quiz/${quiz.id}`} id={`quiz-card-${quiz.id}`} className="quiz-card card">
      {/* Thumbnail */}
      <div className="quiz-card__thumbnail">
        <div className="quiz-card__thumbnail-inner" />
      </div>

      {/* Content */}
      <div className="quiz-card__body">
        <h3 className="quiz-card__title">{quiz.title}</h3>

        <span
          className="quiz-card__category"
          style={{ color: categoryColor, background: `${categoryColor}15` }}
        >
          {quiz.category}
        </span>

        <div className="quiz-card__stats">
          <span className="quiz-card__stat">
            <span className="quiz-card__stat-icon">📝</span>
            {quiz.questionCount} câu
          </span>
          <span className="quiz-card__stat">
            <span className="quiz-card__stat-icon">👥</span>
            {quiz.playCount.toLocaleString('vi-VN')} lượt
          </span>
        </div>

        <div className="quiz-card__author">
          <div
            className="quiz-card__avatar"
            style={{ background: avatarColor }}
          >
            {quiz.author.name.charAt(0)}
          </div>
          <span className="quiz-card__author-name">{quiz.author.name}</span>
        </div>
      </div>
    </Link>
  );
};

export default QuizCard;
