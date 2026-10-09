import { Zap, Users, MessageCircle } from 'lucide-react';
import './FeatureSection.css';

const features = [
  {
    id: 'feature-ai',
    icon: <Zap size={22} />,
    title: 'AI tạo quiz tự động',
    description:
      'Công nghệ AI hiện đại tự động phân tích tài liệu và tạo câu hỏi trắc nghiệm chính xác',
  },
  {
    id: 'feature-share',
    icon: <Users size={22} />,
    title: 'Chia sẻ với bạn bè',
    description:
      'Chia sẻ quiz với bạn học, theo dõi tiến độ và cộng tác trong quá trình học tập',
  },
  {
    id: 'feature-chat',
    icon: <MessageCircle size={22} />,
    title: 'Đối đáp với AI',
    description:
      'Hỏi AI để được giải thích chi tiết, làm rõ các khái niệm khó hiểu',
  },
];

const FeatureSection = () => {
  return (
    <section className="features">
      <div className="container">
        <h2 className="section-title">Tính năng chính</h2>
        <p className="section-subtitle">Tất cả những gì bạn cần để học hiệu quả</p>

        <div className="features__grid">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              id={feature.id}
              className="feature-card card"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="feature-card__icon">
                {feature.icon}
              </div>
              <h3 className="feature-card__title">{feature.title}</h3>
              <p className="feature-card__desc">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
