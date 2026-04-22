// src/utils/checkWifi.js
// 학원 WiFi 연결 여부 확인
// 학원 내부망 서버에 이미지 요청을 보내서 응답 여부로 판단

export function checkAcademyWifi(timeoutMs = 2000) {
  return new Promise((resolve) => {
    const url = import.meta.env.VITE_WIFI_CHECK_URL
    if (!url) {
      resolve({ ok: false, reason: 'config' })
      return
    }

    const img = new Image()
    const timer = setTimeout(() => {
      img.src = ''
      resolve({ ok: false, reason: 'timeout' })
    }, timeoutMs)

    img.onload = () => {
      clearTimeout(timer)
      resolve({ ok: true })  // 이미지 로드 성공 = 학원 WiFi 연결됨
    }

    img.onerror = () => {
      clearTimeout(timer)
      resolve({ ok: false }) // 이미지 로드 실패 = 서버 미응답 = WiFi 아님
    }

    img.src = `${url}/ping.png?t=${Date.now()}`
  })
}
