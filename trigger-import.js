// Script to trigger LeetCode problems import
const https = require('https');
const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error.message);
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

async function testAndImport() {
  try {
    console.log("🔄 Testing server connection...");
    
    // First test GET endpoint
    const statsOptions = {
      hostname: 'localhost',
      port: 9002,
      path: '/api/problems',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const statsResponse = await makeRequest(statsOptions);
    console.log("📊 Current stats response:", statsResponse);

    if (statsResponse.status === 200 || statsResponse.status === 500) {
      console.log("✅ Server is responding");
      
      console.log("🚀 Starting LeetCode problems import...");
      console.log("⚠️  This may take 5-10 minutes to complete...");
      
      // Start import
      const importOptions = {
        hostname: 'localhost',
        port: 9002,
        path: '/api/problems',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const importResponse = await makeRequest(importOptions);
      console.log("📥 Import response:", importResponse);
      
    } else {
      console.error("❌ Server not responding correctly");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testAndImport();