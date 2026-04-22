// src/utils/checkWifi.js
// 학원 WiFi 연결 여부 확인
// Vercel API를 통해 요청자 공인 IP와 학원 IP를 비교
export async function checkAcademyWifi() {
  try {
    const res = await fetch('/api/check-wifi')
    const { ok } = await res.json()
    return { ok }
  } catch {
    return { ok: false }
  }
}
