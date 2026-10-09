const axios = require('axios');

async function testGeminiFlash() {
  const apiKey = 'AIzaSyBgty6M27Eyx3Ubcz7N-qHWeZY8T9TUOJA';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: "Tạo 2 câu hỏi trắc nghiệm về Toán học lớp 10. Trả về JSON array: [{\"content\":\"...\",\"options\":[\"A...\",...],\"correctAnswer\":0,\"explanation\":\"...\"}]" }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json"
    }
  };

  try {
    const res = await axios.post(url, body);
    const text = res.data.candidates[0].content.parts[0].text;
    console.log("✅ SUCCESS!");
    console.log("Response:", text.substring(0, 500));
  } catch (err) {
    console.log("❌ FAILED:", err.response?.status, JSON.stringify(err.response?.data?.error));
  }
}

testGeminiFlash();
