// 아이디 → Supabase 인증용 이메일. 계정 생성과 로그인 양쪽에서 동일하게 사용해야 한다.
// 한글은 이메일 로컬파트로 못 쓰므로 UTF-8 바이트를 hex로 인코딩해 항상 ASCII로 만든다.
export function loginEmail(username) {
  const asciiSafe = /^[a-zA-Z0-9._-]+$/.test(username)
  const local = asciiSafe
    ? username
    : Array.from(new TextEncoder().encode(username))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
  return `${local}@soomoonjae.com`
}
