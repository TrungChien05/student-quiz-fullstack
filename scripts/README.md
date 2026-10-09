# Scripts kiểm tra & chạy dự án

## Kiểm tra API

```bash
# Backend phải chạy trước (port 8080)
node scripts/check-api.js
```

Script tự gọi `POST /api/dev/seed-samples` trên localhost để tạo quiz mẫu nếu thiếu.

Thủ công:

```bash
curl -X POST http://localhost:8080/api/dev/seed-samples

# Hoặc kiểm tra server production
node scripts/check-api.js https://student-quizz-backend.onrender.com/api
```

## Tài khoản mẫu (tự tạo khi backend khởi động)

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Admin | admin@studentquizz.vn | Admin@123456 |
| User demo | demo@studentquizz.vn | Demo@123456 |

## Quiz mẫu

- **Quiz mẫu: Lịch sử Việt Nam cơ bản** (5 câu, nổi bật)
- **Quiz mẫu: Toán - Phương trình bậc hai** (3 câu, nổi bật)

## Chạy backend

```bash
cd backend
.\mvnw.cmd spring-boot:run
```

## Chạy frontend

```bash
cd frontend
npm run dev
```

Frontend gọi API tại `http://localhost:8080/api` khi hostname là `localhost`.
