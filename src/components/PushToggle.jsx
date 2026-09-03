// src/components/PushToggle.jsx
// 이 기기에서 새 질문 알림을 받을지 정하는 버튼.
//
// "이 기기에서"라고 쓰는 건 실제로 기기 단위이기 때문이다.
// 교사가 PC에서만 켜면 폰은 조용하다.
import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { pushEnvironment, readPushEnvironment } from '../utils/pushSupport'

// VAPID 공개 키는 브라우저가 base64url 문자열이 아니라 바이트 배열로 요구한다
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export default function PushToggle() {
  const { user } = useAuth()
  const { savePushSubscription, deletePushSubscription } = useData()
  const [subscribed, setSubscribed] = useState(false)
  const [busy,       setBusy]       = useState(false)
  const [error,      setError]      = useState('')

  const isStaff = user?.role === 'teacher' || user?.role === 'admin'

  // 이 기기가 이미 구독 중인지 브라우저에 물어본다
  useEffect(() => {
    if (!isStaff || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    let alive = true
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => { if (alive) setSubscribed(Boolean(sub)) })
      .catch(() => {})
    return () => { alive = false }
  }, [isStaff])

  if (!isStaff) return null

  const status = pushEnvironment(readPushEnvironment(subscribed))

  async function turnOn() {
    setBusy(true)
    setError('')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setError('알림 권한이 허용되지 않았습니다.'); return }

      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
      })

      const ok = await savePushSubscription(sub, user.id)
      // 브라우저에만 등록되고 서버에 저장이 안 되면 켜진 것처럼 보이지만
      // 알림은 오지 않는다. 그 상태로 두지 않는다.
      if (!ok) { await sub.unsubscribe(); setError('알림 설정을 저장하지 못했습니다.'); return }
      setSubscribed(true)
    } catch (e) {
      console.error('알림 켜기 실패:', e)
      setError('알림을 켜지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function turnOff() {
    setBusy(true)
    setError('')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await deletePushSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch (e) {
      console.error('알림 끄기 실패:', e)
      setError('알림을 끄지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const note = {
    'ios-needs-install': '아이폰은 홈 화면에 추가한 뒤에만 알림을 받을 수 있습니다. 공유 버튼 → 홈 화면에 추가.',
    denied:              '알림이 차단되어 있습니다. 브라우저 설정에서 이 사이트의 알림을 허용해 주세요.',
    unsupported:         '이 브라우저는 알림을 지원하지 않습니다.',
  }[status]

  return (
    <div className="border border-line rounded p-3 mb-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-ink-soft">새 질문 알림</p>
        {note
          ? <p className="text-xs text-ink-mute mt-1">{note}</p>
          : <p className="text-xs text-ink-mute mt-1">
              {status === 'on' ? '이 기기로 알림을 받고 있습니다.' : '이 기기에서 알림을 받습니다.'}
            </p>}
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>

      {status === 'on' && (
        <button
          type="button"
          onClick={turnOff}
          disabled={busy}
          className="shrink-0 text-xs border border-line rounded px-3 py-2 flex items-center gap-1 hover:bg-surface-alt transition-colors"
        >
          <BellOff size={14} aria-hidden="true" />알림 끄기
        </button>
      )}
      {status === 'ready' && (
        <button
          type="button"
          onClick={turnOn}
          disabled={busy}
          className="shrink-0 text-xs bg-ink text-white rounded px-3 py-2 flex items-center gap-1"
        >
          <Bell size={14} aria-hidden="true" />알림 받기
        </button>
      )}
    </div>
  )
}
