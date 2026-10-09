/**
 * Kiểm tra các API chính của StudentQuizz.
 * Chạy: node scripts/check-api.js [baseUrl]
 * Mặc định: http://localhost:8080/api
 */

const BASE = process.argv[2] || 'http://localhost:8080/api';

const results = [];

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  console.log(`\n🔍 Kiểm tra API: ${BASE}\n`);

  try {
    if (BASE.includes('localhost')) {
      const seed = await request('POST', '/dev/seed-samples');
      if (seed.ok) {
        const d = seed.data?.data;
        console.log(`ℹ️  Seed mẫu: +${d?.quizzesCreated ?? 0} quiz, forum=${d?.forumPostCreated ? 'có' : 'không'}\n`);
      }
    }
    const featured = await request('GET', '/quizzes/featured');
    record('GET /quizzes/featured', featured.ok, `HTTP ${featured.status}, ${Array.isArray(featured.data) ? featured.data.length + ' quiz' : ''}`);

    const list = await request('GET', '/quizzes?page=0&size=12');
    const count = list.data?.content?.length ?? 0;
    record('GET /quizzes', list.ok, `HTTP ${list.status}, ${count} quiz`);

    const forum = await request('GET', '/forum/posts');
    record('GET /forum/posts', forum.ok, `HTTP ${forum.status}, ${Array.isArray(forum.data) ? forum.data.length + ' bài' : ''}`);

    let login = await request('POST', '/auth/login', {
      email: 'demo@studentquizz.vn',
      password: 'Demo@123456',
    });
    let token = login.data?.token;
    if (!token) {
      login = await request('POST', '/auth/login', {
        email: process.env.ADMIN_EMAIL || 'admin@studentquizz.vn',
        password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      });
      token = login.data?.token;
      record('POST /auth/login (demo)', login.ok && !!token,
        token ? 'demo chưa seed — dùng admin OK' : `HTTP ${login.status}`);
    } else {
      record('POST /auth/login (demo)', true, 'có token');
    }

    if (token && featured.data?.[0]?.id) {
      const quizId = featured.data[0].id;
      const detail = await request('GET', `/quizzes/${quizId}`, null, token);
      const qCount = detail.data?.questions?.length ?? 0;
      record(`GET /quizzes/${quizId}`, detail.ok, `HTTP ${detail.status}, ${qCount} câu hỏi`);
    } else if (list.data?.content?.[0]?.id) {
      const quizId = list.data.content[0].id;
      const detail = await request('GET', `/quizzes/${quizId}`);
      record(`GET /quizzes/${quizId}`, detail.ok, `HTTP ${detail.status}`);
    }

    const failCount = results.filter((r) => !r.ok).length;
    console.log(`\n📊 Kết quả: ${results.length - failCount}/${results.length} thành công\n`);
    if (failCount > 0) {
      console.log('💡 Đảm bảo backend đang chạy: cd backend && .\\mvnw.cmd spring-boot:run\n');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Không kết nối được backend:', err.message);
    console.log('\n💡 Khởi động backend: cd backend && .\\mvnw.cmd spring-boot:run\n');
    process.exit(1);
  }
}

main();
