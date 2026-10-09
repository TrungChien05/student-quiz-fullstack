import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, HelpCircle, Loader2 } from 'lucide-react';
import './SupportChatbot.css';

interface Message {
  sender: 'bot' | 'user';
  text: string;
  time: Date;
}

interface QuickQuestion {
  id: string;
  text: string;
}

const QUICK_QUESTIONS: QuickQuestion[] = [
  { id: 'q1', text: '✨ Cách tạo bài Quiz bằng AI hoặc thủ công?' },
  { id: 'q2', text: '🤝 Cách kết bạn với người khác?' },
  { id: 'q3', text: '💬 Cách nhắn tin riêng tư thời gian thực?' },
  { id: 'q4', text: '🏆 Xem lịch sử làm bài và điểm số ở đâu?' },
  { id: 'q5', text: '📝 Diễn đàn hoạt động thế nào và đăng bài ra sao?' },
  { id: 'q6', text: '📊 Bảng xếp hạng tính điểm và thứ tự ra sao?' },
  { id: 'q7', text: '🖼️ Làm thế nào để thay đổi ảnh đại diện (avatar)?' },
  { id: 'q8', text: '⚖️ Làm gì khi bài viết/quiz bị từ chối duyệt (Khiếu nại)?' }
];

const BOT_ANSWERS: Record<string, string> = {
  q1: "Để tạo bài Quiz mới, bạn có hai phương thức:\n\n1. **Tạo tự động bằng AI:** Vào trang 'Tạo Quiz', chọn tab 'Tạo tự động bằng AI'. Bạn chỉ cần đặt tên, chọn danh mục và **tải lên tệp tài liệu PDF hoặc DOCX (tối đa 20MB)**. AI sẽ tự động đọc tài liệu và biên soạn bộ câu hỏi tương ứng.\n\n2. **Tự soạn thủ công:** Chọn tab 'Tự soạn thủ công' để tự nhập chi tiết nội dung câu hỏi, 4 phương án đáp án, chọn đáp án đúng và điền lời giải thích.",
  q2: "Để gửi lời mời kết bạn:\n\n1. Hãy tìm và nhấp chuột vào tên hiển thị hoặc ảnh đại diện (Avatar) của người dùng đó trên Diễn đàn để mở **Trang cá nhân (Profile)** của họ.\n\n2. Nhấn vào nút **'Kết bạn'** màu tím ở góc trên bên phải.\n\n3. Khi người đó nhận được thông báo kết bạn và chọn **'Đồng ý'**, hai bạn sẽ chính thức trở thành bạn bè trên hệ thống.",
  q3: "Để chat/nhắn tin riêng tư:\n\n1. Nhấp vào biểu tượng Tin nhắn (Message) trên thanh Navbar hoặc truy cập trang `/chat`.\n\n2. Tại thanh bên trái, bạn có thể nhấp chọn một người bạn để nhắn tin trực tiếp.\n\n3. Ngoài ra, bạn có thể vào Profile của một người bạn và nhấn nút **'Nhắn tin'** để mở nhanh hộp đối thoại.",
  q4: "Để xem lại các bài quiz đã làm và điểm số tích lũy:\n\n1. Nhấn vào Avatar ở thanh Navbar phía trên, chọn **'Hồ sơ'**.\n\n2. Chọn tab **'Lịch sử'** ở khu vực nội dung.\n\n3. Bạn sẽ thấy danh sách toàn bộ các lượt làm bài, số câu trả lời đúng, tỷ lệ phần trăm đạt được và thời gian hoàn tất cụ thể.",
  q5: "Diễn đàn là không gian giao lưu thảo luận:\n\n1. Hãy truy cập trang **'Diễn đàn'** để xem các bài viết công khai của mọi người.\n\n2. Bấm nút **'Tạo bài viết'** để đăng bài mới (nhập tiêu đề, nội dung, gắn thẻ tags, đính kèm ảnh hoặc tệp tin/liên kết ngoài nếu có).\n\n3. Bạn có thể thả tim thích bài viết và thảo luận trực tiếp bằng khung bình luận dưới mỗi bài đăng.",
  q6: "Bảng xếp hạng (Leaderboards) chia làm 2 phân mục:\n\n1. **Top Tích Cực:** Xếp hạng các học viên chăm chỉ làm bài nhiều lần nhất (dựa trên tổng số lượt làm bài kiểm tra).\n\n2. **Top Điểm Số:** Xếp hạng học viên xuất sắc nhất dựa trên **tổng số câu hỏi trả lời đúng tích lũy** qua tất cả các bài kiểm tra đã làm.",
  q7: "Để cập nhật ảnh đại diện cá nhân:\n\n1. Truy cập vào trang **'Hồ sơ'** của bạn.\n\n2. Bấm vào nút **'Chỉnh sửa thông tin'** ở phần đầu trang.\n\n3. Nhấp vào ảnh tròn đại diện hiện tại để chọn tải lên ảnh mới từ máy tính của bạn, sau đó nhấn **'Lưu thay đổi'** để hoàn tất cập nhật.",
  q8: "Nếu bài đăng hoặc bài quiz của bạn bị từ chối duyệt (Trạng thái màu đỏ):\n\n1. Hãy vào trang **'Hồ sơ'** cá nhân để tìm bài bị từ chối và đọc lý do Admin ghi chú.\n\n2. Click vào nút **'Gửi khiếu nại'** ở góc dưới thẻ bài viết đó.\n\n3. Nhập lời giải trình giải thích ngắn gọn rồi gửi đi. Trạng thái bài viết sẽ chuyển về dạng 'Chờ duyệt' để Admin đánh giá lại."
};

const SupportChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting
  useEffect(() => {
    setMessages([
      {
        sender: 'bot',
        text: 'Xin chào! 👋 Mình là trợ lý ảo hỗ trợ học tập của StudentQuizz. Mình có thể giúp gì cho bạn hôm nay?',
        time: new Date()
      }
    ]);
  }, []);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    // 1. Add user message
    const userMsg: Message = { sender: 'user', text, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    // 2. Bot reply simulation
    setIsTyping(true);
    setTimeout(() => {
      let replyText = '';
      const cleanText = text.toLowerCase().trim();

      // Check keywords
      if (cleanText.includes('quiz') || cleanText.includes('đề thi') || cleanText.includes('kiểm tra') || cleanText.includes('tạo bài')) {
        replyText = BOT_ANSWERS.q1;
      } else if (cleanText.includes('kết bạn') || cleanText.includes('bạn bè') || cleanText.includes('add friend')) {
        replyText = BOT_ANSWERS.q2;
      } else if (cleanText.includes('nhắn tin') || cleanText.includes('chat') || cleanText.includes('tin nhắn') || cleanText.includes('trò chuyện')) {
        replyText = BOT_ANSWERS.q3;
      } else if (cleanText.includes('lịch sử') || cleanText.includes('điểm số') || cleanText.includes('đã làm') || cleanText.includes('kết quả')) {
        replyText = BOT_ANSWERS.q4;
      } else if (cleanText.includes('diễn đàn') || cleanText.includes('forum') || cleanText.includes('bài viết') || cleanText.includes('đăng bài')) {
        replyText = BOT_ANSWERS.q5;
      } else if (cleanText.includes('xếp hạng') || cleanText.includes('bxh') || cleanText.includes('top') || cleanText.includes('cúp')) {
        replyText = BOT_ANSWERS.q6;
      } else if (cleanText.includes('avatar') || cleanText.includes('ảnh đại diện') || cleanText.includes('đổi ảnh')) {
        replyText = BOT_ANSWERS.q7;
      } else if (cleanText.includes('từ chối') || cleanText.includes('khiếu nại') || cleanText.includes('duyệt') || cleanText.includes('bị khóa')) {
        replyText = BOT_ANSWERS.q8;
      } else if (cleanText.includes('chào') || cleanText.includes('hello') || cleanText.includes('hi')) {
        replyText = 'Xin chào học viên! Rất vui được hỗ trợ bạn. Bạn có thể chọn nhanh các câu hỏi gợi ý bên dưới hoặc hỏi mình về các chức năng tạo quiz, kết bạn, nhắn tin, diễn đàn nhé.';
      } else {
        replyText = 'Xin lỗi, mình chưa rõ câu hỏi của bạn. Bạn hãy thử chọn nhanh một trong các câu hỏi gợi ý bên dưới, hoặc nhập các từ khóa rõ nghĩa như: *tạo quiz, kết bạn, nhắn tin, diễn đàn, lịch sử, xếp hạng, đổi avatar* để mình tư vấn chính xác nhé!';
      }

      setMessages(prev => [...prev, { sender: 'bot', text: replyText, time: new Date() }]);
      setIsTyping(false);
    }, 900);
  };

  const handleQuickQuestionClick = (qId: string) => {
    // 1. Add user selected question text
    const questionText = QUICK_QUESTIONS.find(q => q.id === qId)?.text || '';
    const userMsg: Message = { sender: 'user', text: questionText, time: new Date() };
    setMessages(prev => [...prev, userMsg]);

    // 2. Bot reply simulation
    setIsTyping(true);
    setTimeout(() => {
      const replyText = BOT_ANSWERS[qId] || '';
      setMessages(prev => [...prev, { sender: 'bot', text: replyText, time: new Date() }]);
      setIsTyping(false);
    }, 900);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="support-chatbot">
      {/* Floating Action Button */}
      <button
        type="button"
        className={`chatbot-fab ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Hỗ trợ trực tuyến"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} className="chatbot-icon-pulse" />}
        {!isOpen && (
          <span className="chatbot-fab__tooltip">Trợ giúp</span>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-window__header">
            <div className="chatbot-window__header-info">
              <div className="chatbot-avatar-active">
                <HelpCircle size={18} />
              </div>
              <div>
                <h4>Trợ lý học tập</h4>
                <span>Trực tuyến</span>
              </div>
            </div>
            <button type="button" className="chatbot-close-btn" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Messages Body */}
          <div className="chatbot-window__body">
            {messages.map((msg, index) => (
              <div key={index} className={`chat-bubble-wrap ${msg.sender}`}>
                <div className={`chat-bubble ${msg.sender}`}>
                  {msg.text.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i < msg.text.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                  <span className="chat-bubble__time">{formatTime(msg.time)}</span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chat-bubble-wrap bot">
                <div className="chat-bubble bot typing">
                  <Loader2 size={16} className="spin" />
                  <span>Đang soạn câu trả lời...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions scroll list */}
          <div className="chatbot-window__suggestions">
            <p className="suggestions-title">💡 Câu hỏi gợi ý thường gặp:</p>
            <div className="suggestions-scroll">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  className="suggestion-btn"
                  onClick={() => handleQuickQuestionClick(q.id)}
                  disabled={isTyping}
                >
                  {q.text}
                </button>
              ))}
            </div>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="chatbot-window__footer"
          >
            <input
              type="text"
              placeholder="Nhập nội dung thắc mắc của bạn..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isTyping}
              maxLength={200}
            />
            <button type="submit" disabled={!inputValue.trim() || isTyping}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default SupportChatbot;
