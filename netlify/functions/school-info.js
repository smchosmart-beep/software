exports.handler = async (event, context) => {
  const schoolCode = event.queryStringParameters?.code;
  
  if (!schoolCode) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: 'Missing school code' })
    };
  }
  
  const API_KEY = '2773b688e2d74b028faa01081f8c407d';
  const apiUrl = `https://open.neis.go.kr/hub/schoolInfo?KEY=${API_KEY}&Type=json&SD_SCHUL_CODE=${schoolCode}`;
  
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.schoolInfo && data.schoolInfo[1]?.row?.[0]) {
      const school = data.schoolInfo[1].row[0];
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          schoolName: school.SCHUL_NM,
          address: school.ORG_RDNMA,
          schoolType: school.SCHUL_KND_SC_NM
        })
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: false })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
