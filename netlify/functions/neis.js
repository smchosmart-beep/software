const https = require('https');

const NEIS_API_KEY = '2773b688e2d74b028faa01081f8c407d';
const NEIS_BASE = 'https://open.neis.go.kr/hub/schoolInfo';

exports.handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONS 요청 처리 (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // 쿼리 파라미터 가져오기
    const params = event.queryStringParameters || {};
    
    // NEIS API URL 구성
    const searchParams = new URLSearchParams({
      KEY: NEIS_API_KEY,
      Type: 'json',
      pIndex: '1',
      pSize: '100',
      ...params
    });
    
    const apiUrl = `${NEIS_BASE}?${searchParams.toString()}`;
    
    // NEIS API 호출
    const data = await new Promise((resolve, reject) => {
      https.get(apiUrl, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('JSON 파싱 실패'));
          }
        });
      }).on('error', reject);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('NEIS API 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
