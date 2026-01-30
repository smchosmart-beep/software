const { createClient } = require('@supabase/supabase-js');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://yrywezxcnoglkpsloynu.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
}

function normalizeSchoolCode(code) {
  if (!code || typeof code !== 'string') return null;
  const trimmed = code.trim().toUpperCase();
  return trimmed.length <= 10 ? trimmed : null;
}

function withCors(res) {
  return { ...res, headers: { ...CORS_HEADERS, ...res.headers } };
}

/** POST: 개인정보 수집·이용 동의 기록 (body: school_code, role) */
async function handlePost(event) {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return withCors({ statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) });
  }
  const schoolCode = normalizeSchoolCode(body.school_code);
  const role = body.role;
  if (!schoolCode) {
    return withCors({ statusCode: 400, body: JSON.stringify({ error: 'school_code required' }) });
  }
  if (role !== 'teacher' && role !== 'manager') {
    return withCors({ statusCode: 400, body: JSON.stringify({ error: 'role must be teacher or manager' }) });
  }
  const ip = event.headers['x-forwarded-for'] || event.headers['x-nf-client-connection-ip'] || null;
  const userAgent = event.headers['user-agent'] || null;
  const supabase = getSupabase();
  const { error } = await supabase
    .from('consent_log')
    .insert({
      school_code: schoolCode,
      role,
      ip: ip ? (ip.split(',')[0].trim() || null) : null,
      user_agent: userAgent
    });
  if (error) {
    return withCors({ statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) });
  }
  return withCors({ statusCode: 200, body: JSON.stringify({ success: true }) });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return withCors({ statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) });
  }
  try {
    return await handlePost(event);
  } catch (err) {
    console.error('consent error:', err);
    return withCors({
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal server error' })
    });
  }
};
