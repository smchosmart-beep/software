/**
 * 시스템 관리자 로그인 검증 (POST only).
 * body: { school_name, school_code }
 * 서버 환경 변수 ADMIN_NAME, ADMIN_CODE와 비교하여 일치하면 { ok: true } 반환.
 * 클라이언트에는 관리자 코드를 노출하지 않음.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

function withCors(res) {
  return { ...res, headers: { ...CORS_HEADERS, ...res.headers } };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return withCors({ statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) });
  }

  const adminName = (process.env.ADMIN_NAME || '').trim();
  const adminCode = (process.env.ADMIN_CODE || '').toString().toLowerCase().replace(/\s/g, '');
  if (!adminName || !adminCode) {
    return withCors({
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: '관리자 설정이 없습니다.' })
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return withCors({ statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid JSON' }) });
  }

  const schoolName = (body.school_name || '').toString().trim();
  const schoolCode = (body.school_code || '').toString().toLowerCase().replace(/\s/g, '');
  if (!schoolName || !schoolCode) {
    return withCors({ statusCode: 200, body: JSON.stringify({ ok: false }) });
  }

  const ok = schoolName === adminName && schoolCode === adminCode;
  return withCors({ statusCode: 200, body: JSON.stringify({ ok }) });
};
