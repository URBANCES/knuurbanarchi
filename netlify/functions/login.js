exports.handler = async (event) => {
  // CORS Headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS Preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' }),
    };
  }

  try {
    const { password } = JSON.parse(event.body || '{}');

    // Netlify 환경 변수에서 관리자 비밀번호 로드
    const expectedPassword = '24052*';

    if (!expectedPassword) {
      console.error('ADMIN_PASSWORD environment variable is not configured.');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '서버 환경 변수(ADMIN_PASSWORD)가 설정되지 않았습니다.',
        }),
      };
    }

    // 비밀번호 검증
    if (password === expectedPassword) {
      // 인증 성공: 간단한 세션 토큰 발행 (또는 JWT)
      const token = 'ual_admin_token_' + Date.now();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '로그인에 성공하였습니다.',
          token: token,
        }),
      };
    } else {
      // 인증 실패 (401 Unauthorized)
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: '비밀번호가 일치하지 않습니다.',
        }),
      };
    }
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: '잘못된 요청 형식입니다.',
      }),
    };
  }
};
