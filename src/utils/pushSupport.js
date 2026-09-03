// src/utils/pushSupport.js
// 이 기기에서 알림을 켤 수 있는 상태인지 판단한다.
//
// 아이폰은 Safari에서 "홈 화면에 추가"한 뒤에만 웹 알림을 허용한다(iOS 16.4+).
// 그 상태를 구분하지 않으면 아이폰 교사는 토글을 눌러도 아무 일이 없는 걸 겪는다.

export function pushEnvironment({
  hasServiceWorker, hasPushManager, isIos, isStandalone, permission, subscribed,
}) {
  // iOS 16.4 미만에는 PushManager 자체가 없다. 홈 화면에 추가해도 안 되므로 먼저 본다.
  if (!hasServiceWorker || !hasPushManager) return 'unsupported'
  if (isIos && !isStandalone) return 'ios-needs-install'
  if (permission === 'denied') return 'denied'
  if (subscribed) return 'on'
  return 'ready'
}

// 브라우저에서 위 인자들을 읽어 온다. 창이 없는 곳(테스트·서버)에서는 지원 안 함으로 본다.
export function readPushEnvironment(subscribed = false) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      hasServiceWorker: false, hasPushManager: false, isIos: false,
      isStandalone: false, permission: 'default', subscribed,
    }
  }

  return {
    hasServiceWorker: 'serviceWorker' in navigator,
    hasPushManager:   'PushManager' in window,
    // 아이패드는 데스크톱 Safari처럼 보고하므로 터치 지원까지 함께 본다
    isIos: /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    isStandalone: window.matchMedia?.('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true,
    permission: typeof Notification === 'undefined' ? 'default' : Notification.permission,
    subscribed,
  }
}
