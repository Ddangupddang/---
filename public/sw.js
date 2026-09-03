// public/sw.js
// 알림을 받아 띄우고, 누르면 앱을 여는 서비스 워커.
//
// 빌드를 거치지 않고 그대로 배포되는 파일이라 import 없이 순수 JS로 쓴다.

self.addEventListener('push', (event) => {
  // payload가 깨졌다고 알림을 통째로 버리면 교사는 질문이 온 줄도 모른다.
  // 최소한 "새 질문"이라도 띄운다.
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }

  event.waitUntil(
    self.registration.showNotification(data.title || '새 질문', {
      body:  data.body || '',
      icon:  '/icon-192.png',
      badge: '/icon-192.png',
      data:  { url: data.url || '/qna' },
      // tag를 주면 알림이 하나로 합쳐진다. 질문마다 따로 보여야 해서 주지 않는다.
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/qna'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // 이미 열려 있는 탭이 있으면 새로 열지 않고 그 탭을 앞으로 가져온다
      for (const client of list) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
