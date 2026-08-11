// functions/login.js

export async function onRequestPost(context) {
  try {
    // 1. 프론트엔드(React/Vite 등)에서 보낸 데이터를 JSON 형태로 읽어옵니다.
    const body = await context.request.json();
    const { password } = body;

    // 2. 클라우드플레어 대시보드 환경 변수에 저장해 둔 진짜 비밀번호를 불러옵니다.
    // (대시보드에서 환경 변수 이름을 'ADMIN_PASSWORD'로 설정했다고 가정)
    const correctPassword = context.env.ADMIN_PASSWORD;

    // 3. 사용자가 입력한 비밀번호와 환경 변수의 비밀번호를 비교합니다.
    if (password === correctPassword) {
      // 일치할 경우: 인증 성공 응답
      return new Response(JSON.stringify({ 
        success: true, 
        message: "관리자 인증 성공",
        // 필요하다면 이곳에 인증 토큰(JWT 등)을 추가로 넘겨줄 수 있습니다.
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      // 일치하지 않을 경우: 401 에러 응답
      return new Response(JSON.stringify({ 
        success: false, 
        message: "비밀번호가 일치하지 않습니다." 
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (error) {
    // 서버에서 에러가 발생한 경우
    return new Response(JSON.stringify({ 
      success: false, 
      message: "서버 오류가 발생했습니다." 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
