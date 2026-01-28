// NEIS: SD_SCHUL_CODE=7자리, ATPT_OFCDC_SC_CODE=3자리(선택). 필수: pIndex, pSize
function parseSchoolCodeInput(input) {
  const raw = String(input || '').trim().toUpperCase();
  if (/^[0-9]{7}$/.test(raw)) return { sdSchulCode: raw };
  if (/^[A-Z][0-9]{9}$/.test(raw)) return { atptOfcdcScCode: raw.slice(0, 3), sdSchulCode: raw.slice(3, 10) };
  return null;
}

exports.handler = async (event, context) => {
  const schoolCode = event.queryStringParameters?.code;

  if (!schoolCode) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: 'Missing school code' })
    };
  }

  const parsed = parseSchoolCodeInput(schoolCode);
  if (!parsed) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: 'Invalid school code format (use 7 digits or 10 chars e.g. B107010911)' })
    };
  }

  const API_KEY = '2773b688e2d74b028faa01081f8c407d';
  const params = new URLSearchParams({
    KEY: API_KEY,
    Type: 'json',
    pIndex: '1',
    pSize: '100',
    SD_SCHUL_CODE: parsed.sdSchulCode
  });
  if (parsed.atptOfcdcScCode) params.set('ATPT_OFCDC_SC_CODE', parsed.atptOfcdcScCode);
  const apiUrl = `https://open.neis.go.kr/hub/schoolInfo?${params.toString()}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    const head = data.schoolInfo?.[0]?.head;
    const result = Array.isArray(head) ? head[0] : head;
    if (result?.RESULT?.CODE && result.RESULT.CODE !== 'INFO-000') {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: false, error: result.RESULT.MESSAGE || 'No data' })
      };
    }

    const row = data.schoolInfo?.[1]?.row;
    const list = Array.isArray(row) ? row : row ? [row] : [];
    const school = list[0];
    if (!school) {
      return { statusCode: 200, body: JSON.stringify({ success: false }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        schoolName: school.SCHUL_NM,
        address: school.ORG_RDNMA,
        schoolType: school.SCHUL_KND_SC_NM
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
