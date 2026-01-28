export default async (req, context) => {
  const url = new URL(req.url);
  const schoolCode = url.searchParams.get('code');
  
  if (!schoolCode) {
    return new Response(JSON.stringify({ success: false, error: 'Missing school code' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const API_KEY = '2773b688e2d74b028faa01081f8c407d';
  const apiUrl = `https://open.neis.go.kr/hub/schoolInfo?KEY=${API_KEY}&Type=json&SD_SCHUL_CODE=${schoolCode}`;
  
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.schoolInfo && data.schoolInfo[1]?.row?.[0]) {
      const school = data.schoolInfo[1].row[0];
      return new Response(JSON.stringify({
        success: true,
        schoolName: school.SCHUL_NM,
        address: school.ORG_RDNMA,
        schoolType: school.SCHUL_KND_SC_NM
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ success: false }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
