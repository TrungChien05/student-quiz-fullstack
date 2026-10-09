const axios = require('axios');
const FormData = require('form-data');

async function test() {
  try {
    // 1. Login to get token
    const loginRes = await axios.post('http://localhost:8080/api/auth/login', {
      email: 'thao@example.com',
      password: 'password123'
    });
    const token = loginRes.data.token;
    console.log("Got token");

    // 2. Create quiz
    const form = new FormData();
    form.append('title', 'Test Quiz from Node');
    form.append('category', 'Khác');
    form.append('questionCount', '5');
    // file is optional, we skip it

    const res = await axios.post('http://localhost:8080/api/quizzes', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    console.log("Success:", res.data);
  } catch (err) {
    console.error("Error status:", err.response?.status);
    console.error("Error data:", err.response?.data);
  }
}
test();
