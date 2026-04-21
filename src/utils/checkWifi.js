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
      resolve({ ok: true })
    }

    img.onerror = () => {
      clearTimeout(timer)
      // 서버가 응답했지만 이미지가 없는 경우도 연결 성공으로 판단
      // (서버가 없으면 즉시 onerror가 아닌 timeout으로 처리됨)
      resolve({ ok: true })
    }

    img.src = `${url}/ping.png?t=${Date.now()}`
  })
}
