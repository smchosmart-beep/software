const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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

const FOUR_DIGIT_REGEX = /^\d{4}$/;

function normalizeSchoolCode(code) {
  if (!code || typeof code !== 'string') return null;
  const trimmed = code.trim().toUpperCase();
  return trimmed.length <= 10 ? trimmed : null;
}

function withCors(res) {
  return { ...res, headers: { ...CORS_HEADERS, ...res.headers } };
}

/** GET: hasPassword?school_code=XXX */
async function handleGet(event) {
  const schoolCode = normalizeSchoolCode(event.queryStringParameters?.school_code);
  if (!schoolCode) {
    return withCors({ statusCode: 400, body: JSON.stringify({ error: 'school_code required' }) });
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('school_passwords')
    .select('school_code')
    .eq('school_code', schoolCode)
    .maybeSingle();
  if (error) {
    return withCors({ statusCode: 500, body: JSON.stringify({ error: error.message }) });
  }
  return withCors({
    statusCode: 200,
    body: JSON.stringify({ hasPassword: !!data })
  });
}

/** POST: set or verify (body.action) */
async function handlePost(event) {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return withCors({ statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) });
  }
  const action = body.action;
  const schoolCode = normalizeSchoolCode(body.school_code);
  if (!schoolCode) {
    return withCors({ statusCode: 400, body: JSON.stringify({ error: 'school_code required' }) });
  }

  if (action === 'set') {
    const password = body.password;
    const role = body.role;
    if (role !== 'manager') {
      return withCors({ statusCode: 403, body: JSON.stringify({ error: '담당 교사만 비밀번호를 설정할 수 있습니다.' }) });
    }
    if (!FOUR_DIGIT_REGEX.test(password)) {
      return withCors({ statusCode: 400, body: JSON.stringify({ error: '비밀번호는 숫자 4자리여야 합니다.' }) });
    }
    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from('school_passwords')
      .select('school_code')
      .eq('school_code', schoolCode)
      .maybeSingle();
    if (existing) {
      return withCors({ statusCode: 409, body: JSON.stringify({ error: '이미 비밀번호가 설정되어 있습니다. 변경은 담당 교사 화면에서 해주세요.' }) });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const { error: insertError } = await supabase
      .from('school_passwords')
      .insert({ school_code: schoolCode, password_hash });
    if (insertError) {
      return withCors({ statusCode: 500, body: JSON.stringify({ error: insertError.message }) });
    }
    return withCors({ statusCode: 200, body: JSON.stringify({ success: true }) });
  }

  if (action === 'verify') {
    const password = body.password;
    if (!FOUR_DIGIT_REGEX.test(password)) {
      return withCors({ statusCode: 400, body: JSON.stringify({ valid: false, error: '비밀번호는 숫자 4자리여야 합니다.' }) });
    }
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('school_passwords')
      .select('password_hash')
      .eq('school_code', schoolCode)
      .maybeSingle();
    if (error) {
      return withCors({ statusCode: 500, body: JSON.stringify({ valid: false, error: error.message }) });
    }
    if (!data) {
      return withCors({ statusCode: 200, body: JSON.stringify({ valid: false }) });
    }
    const valid = await bcrypt.compare(password, data.password_hash);
    return withCors({ statusCode: 200, body: JSON.stringify({ valid }) });
  }

  if (action === 'reset') {
    const expectedName = (process.env.ADMIN_NAME || '').trim();
    const expectedCode = (process.env.ADMIN_CODE || '').toString().toLowerCase().replace(/\s/g, '');
    if (!expectedName || !expectedCode) {
      return withCors({ statusCode: 500, body: JSON.stringify({ success: false, error: '관리자 설정이 없습니다.' }) });
    }
    const adminName = (body.admin_name || '').toString().trim();
    const adminCode = (body.admin_code || '').toString().toLowerCase().replace(/\s/g, '');
    if (adminName !== expectedName || adminCode !== expectedCode) {
      return withCors({ statusCode: 403, body: JSON.stringify({ success: false, error: '관리자 인증에 실패했습니다.' }) });
    }
    const supabase = getSupabase();
    const password_hash = await bcrypt.hash('0000', 10);
    const { error: upsertError } = await supabase
      .from('school_passwords')
      .upsert({ school_code: schoolCode, password_hash }, { onConflict: 'school_code' });
    if (upsertError) {
      return withCors({ statusCode: 500, body: JSON.stringify({ success: false, error: upsertError.message }) });
    }
    return withCors({ statusCode: 200, body: JSON.stringify({ success: true }) });
  }

  return withCors({ statusCode: 400, body: JSON.stringify({ error: 'action must be set, verify or reset' }) });
}

/** PUT: change password (body: school_code, current_password, new_password) */
async function handlePut(event) {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return withCors({ statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) });
  }
  const schoolCode = normalizeSchoolCode(body.school_code);
  const currentPassword = body.current_password;
  const newPassword = body.new_password;
  if (!schoolCode || !currentPassword || !newPassword) {
    return withCors({ statusCode: 400, body: JSON.stringify({ error: 'school_code, current_password, new_password required' }) });
  }
  if (!FOUR_DIGIT_REGEX.test(currentPassword) || !FOUR_DIGIT_REGEX.test(newPassword)) {
    return withCors({ statusCode: 400, body: JSON.stringify({ error: '비밀번호는 숫자 4자리여야 합니다.' }) });
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('school_passwords')
    .select('password_hash')
    .eq('school_code', schoolCode)
    .maybeSingle();
  if (error) {
    return withCors({ statusCode: 500, body: JSON.stringify({ error: error.message }) });
  }
  if (!data) {
    return withCors({ statusCode: 404, body: JSON.stringify({ error: '비밀번호가 설정되지 않은 학교입니다.' }) });
  }
  const currentValid = await bcrypt.compare(currentPassword, data.password_hash);
  if (!currentValid) {
    return withCors({ statusCode: 200, body: JSON.stringify({ success: false, error: '현재 비밀번호가 일치하지 않습니다.' }) });
  }
  const newHash = await bcrypt.hash(newPassword, 10);
  const { error: updateError } = await supabase
    .from('school_passwords')
    .update({ password_hash: newHash })
    .eq('school_code', schoolCode);
  if (updateError) {
    return withCors({ statusCode: 500, body: JSON.stringify({ error: updateError.message }) });
  }
  return withCors({ statusCode: 200, body: JSON.stringify({ success: true }) });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }
  const method = event.httpMethod;
  try {
    if (method === 'GET') return await handleGet(event);
    if (method === 'POST') return await handlePost(event);
    if (method === 'PUT') return await handlePut(event);
    return withCors({ statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) });
  } catch (err) {
    console.error('school-password error:', err);
    return withCors({
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal server error' })
    });
  }
};
