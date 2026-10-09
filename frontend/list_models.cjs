const axios = require('axios');

async function listModels() {
  const apiKey = 'AIzaSyBgty6M27Eyx3Ubcz7N-qHWeZY8T9TUOJA';
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await axios.get(url);
    console.log("Models:", res.data.models.map(m => m.name).join(', '));
  } catch (err) {
    console.log(`FAILED:`, err.response?.status, err.response?.data?.error?.message);
  }
}

listModels();
