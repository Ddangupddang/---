// api/check-wifi.js
// 요청자 IP가 학원 지점들의 공인 IP 중 하나와 일치하는지 확인
//
// 환경변수 ACADEMY_IPS 에 지점 IP를 쉼표로 이어 적는다 (예: 1.2.3.4,5.6.7.8)
// 지점이 늘면 코드는 그대로 두고 값만 덧붙이면 된다.
// ACADEMY_IP(단수)는 지점이 하나이던 시절의 이름이라 함께 읽어준다.
export function academyIps(env) {
  return [env.ACADEMY_IPS, env.ACADEMY_IP]
    .filter(Boolean)
    .flatMap((v) => v.split(','))
    .map((ip) => ip.trim())
    .filter(Boolean)
}

export function isAcademyIp(clientIp, env) {
  const allowed = academyIps(env)
  // IP를 하나도 등록하지 않았으면 통과시키지 않는다.
  // (등록 전에는 아무나 출석되는 것보다 아무도 안 되는 편이 안전하다)
  if (!clientIp || allowed.length === 0) return false
  return allowed.includes(clientIp)
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const forwarded = req.headers['x-forwarded-for']
  const clientIp = forwarded ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress

  // clientIp는 지점 IP를 확인할 때 쓴다 — 각 지점 WiFi에서 이 주소를 열면 그 지점의 공인 IP가 보인다
  res.status(200).json({ ok: isAcademyIp(clientIp, process.env), clientIp })
}
