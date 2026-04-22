// api/check-wifi.js
// 요청자 IP가 학원 공인 IP와 일치하는지 확인
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const forwarded = req.headers['x-forwarded-for']
  const clientIp = forwarded ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress

  const academyIp = process.env.ACADEMY_IP
  const ok = clientIp === academyIp

  res.status(200).json({ ok, clientIp })
}
