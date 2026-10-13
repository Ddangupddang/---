// src/utils/demoWifi.js
// 졸업전시회 시연용 출석 체크 — 학원 WiFi 대조를 흉내만 낸다.
//
// 왜 필요한가: 출석 체크는 서버 함수(/api/check-wifi)가 폰의 공인 IP를 학원 주소와
// 대조해야 통과한다. 시연장은 학원이 아니고, 시연은 `npm run dev`로 띄워 서버 함수가
// 아예 돌지 않는다. 그대로 누르면 무조건 "학원 WiFi에 연결되어 있지 않습니다"가 뜬다.
//
// 그래서 시연에서는 대조 과정을 단계별로 보여주고 출석을 기록한다.
// 실제 학원에서 이 모드가 켜지면 아무나 출석이 되므로, 켜지는 조건을 두 겹으로 둔다:
//   1. .env 에 VITE_DEMO_WIFI=on 이 있고
//   2. 앱이 데모 DB(graduate)를 보고 있을 때만.
// 운영 DB 주소로는 VITE_DEMO_WIFI 를 켜도 동작하지 않는다.

export const DEMO_DB_REF = 'zlvubufzbdhwvdtpomlz'

export function isDemoWifi(env = import.meta.env) {
  return env?.VITE_DEMO_WIFI === 'on' &&
    String(env?.VITE_SUPABASE_URL ?? '').includes(DEMO_DB_REF)
}

// 실제 출석 체크가 하는 일 그대로의 순서
export const DEMO_STEPS = ['폰의 공인 IP 확인', '학원 WiFi 주소와 대조', '출석 기록']

// 한 단계를 보여주는 시간. 관람객이 읽을 수 있을 만큼.
export const DEMO_STEP_MS = 900
