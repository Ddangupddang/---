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

// 감지된 주소의 생김새로 원인을 짚는다.
//
// 2026-09-17에 한 학생의 주소를 조회해 보니 Fastly와 Cloudflare였다.
// 둘 다 애플 iCloud+ 「사설 릴레이」가 출구로 쓰는 회사다 — 학원 WiFi에
// 제대로 연결돼 있는데도 통신이 미국을 한 바퀴 돌아 나가고 있었다.
// WiFi를 껐다 켜면 출구가 Fastly에서 Cloudflare로 바뀌었다. 그래서 주소가
// 매번 달랐고, 학원 주소를 아무리 등록해도 맞출 수 없었다.
//
// 릴레이 출구 대역은 수백 개고 계속 바뀌므로 전부 적을 수 없다.
// 흔한 것만 적고 못 맞히면 일반 안내로 떨어진다 — 진단이 아니라 힌트다.
const RELAY_RANGES = [
  // Cloudflare
  { from: [104, 16],  to: [104, 31] },
  { from: [172, 64],  to: [172, 71] },
  { from: [162, 158], to: [162, 159] },
  // Fastly
  { from: [140, 248], to: [140, 248] },
  { from: [151, 101], to: [151, 101] },
  { from: [199, 232], to: [199, 232] },
]

function inRelayRange(clientIp) {
  const [a, b] = clientIp.split('.').map(Number)
  if (!Number.isInteger(a) || !Number.isInteger(b)) return false
  return RELAY_RANGES.some(({ from, to }) => {
    const v = a * 256 + b
    return v >= from[0] * 256 + from[1] && v <= to[0] * 256 + to[1]
  })
}

// 'none' | 'ipv6' | 'relay' | 'unknown'
// 화면 문구와 따로 두는 이유: 나중에 기록을 모아 원인별로 세어 보려면
// 문장이 아니라 종류가 필요하다.
export function wifiFailureCause(clientIp) {
  if (!clientIp) return 'none'
  // IPv6는 콜론이 들어간다. 학원 주소는 IPv4로 등록돼 있어 절대 맞지 않는다.
  if (clientIp.includes(':')) return 'ipv6'
  if (inRelayRange(clientIp)) return 'relay'
  return 'unknown'
}

const HINTS = {
  none: '주소를 확인하지 못했습니다. 잠시 후 다시 눌러 주세요.',
  ipv6: 'IPv6 주소로 접속돼 있습니다. 학원 주소는 IPv4로 등록돼 있어 맞출 수 없습니다.',
  // 여기서 "WiFi를 껐다 켜보라"고 하면 안 된다. WiFi는 멀쩡하고, 껐다 켜도
  // 릴레이 출구만 바뀔 뿐 계속 실패한다. 한 달 동안 그렇게 헛돌았다.
  relay: '아이폰 「사설 릴레이」가 켜져 있습니다. WiFi는 정상입니다. ' +
         '설정 → Wi-Fi → 학원 WiFi 옆 ⓘ → 「IP 주소 추적 제한」을 꺼 주세요.',
  unknown: '학원 WiFi가 아닌 다른 망(데이터·다른 WiFi)으로 나가고 있습니다. ' +
           'WiFi에 연결돼 있는데도 이 화면이 나오면, 사설 릴레이나 VPN 앱이 켜져 있을 수 있습니다.',
}

export function wifiFailureHint(clientIp) {
  return HINTS[wifiFailureCause(clientIp)]
}
