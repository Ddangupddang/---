// src/utils/checkWifi.js
// 학원 WiFi 연결 여부 확인
// Vercel API를 통해 요청자 공인 IP와 학원 IP를 비교한다.
//
// clientIp를 함께 돌려주는 이유: 실패했을 때 "왜"를 알 길이 이것뿐이다.
// 예전에는 ok만 받아 버려서, 한 학생만 출석이 안 돼도 원인을 짚을 근거가
// 하나도 남지 않았다. 학원 WiFi에 있는데도 밖으로 나가는 주소가 다른 경우가
// 있다 — 폰이 신호가 약해 LTE로 새거나, 통신사가 IPv6로 내보내거나,
// 아이폰의 사설 릴레이가 주소를 가리는 경우다.
export async function checkAcademyWifi() {
  try {
    const res = await fetch('/api/check-wifi')
    const { ok, clientIp, registered } = await res.json()
    return { ok, clientIp, registered }
  } catch {
    return { ok: false, clientIp: null, registered: null }
  }
}

// 감지된 주소의 생김새로 흔한 원인을 짚어 준다.
// 확실한 진단이 아니라 어디부터 볼지 좁혀 주는 용도다.
export function wifiFailureHint(clientIp) {
  if (!clientIp) return '주소를 확인하지 못했습니다. 잠시 후 다시 눌러 주세요.'
  // IPv6는 콜론이 들어간다. 학원 주소는 IPv4로 등록돼 있어 절대 맞지 않는다.
  if (clientIp.includes(':')) {
    return 'IPv6 주소로 접속돼 있습니다. 학원 주소는 IPv4로 등록돼 있어 맞출 수 없습니다.'
  }
  return '학원 WiFi가 아닌 다른 망(데이터·다른 WiFi)으로 나가고 있습니다.'
}
