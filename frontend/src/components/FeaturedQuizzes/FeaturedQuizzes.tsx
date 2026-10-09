import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QuizCard from '../QuizCard/QuizCard';
import { quizService } from '../../services/quizService';
import type { Quiz } from '../../types';
import './FeaturedQuizzes.css';

const FeaturedQuizzes = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    quizService.getFeatured().then((data) => {
      setQuizzes(data);
      setLoading(false);
    });
  }, []);

  return (
    <section className="featured">
      <div className="container">
        <h2 className="section-title">Quiz nổi bật</h2>
        <p className="section-subtitle">Các bài quiz được yêu thích nhất từ cộng đồng</p>

        {loading ? (
          <div className="featured__skeleton">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="quiz-skeleton" />
            ))}
          </div>
        ) : (
          <div className="featured__grid">
            {quizzes.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        )}

        <div className="featured__cta">
          <Link to="/explore" id="view-all-btn" className="btn btn-outline">
            Xem tất cả quizzes
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedQuizzes;
