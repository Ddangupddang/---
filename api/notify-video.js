// api/notify-video.js
// 학생이 영상을 처음 보기 시작했을 때와 다 봤을 때 담당 교사·관리자 폰으로 알린다.
//
// DB 트리거가 video_events 에 한 줄을 넣고, Supabase Database Webhook 이 그 줄을 여기로 보낸다.
// 틀은 api/notify-qna.js 와 같다. 판단 로직은 순수 함수로 빼서 테스트한다.
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { isAuthorizedWebhook, isDeadSubscription, endpointsToRemove } from './notify-qna.js'

export { isAuthorizedWebhook, isDeadSubscription, endpointsToRemove }

// 학생 반 담당 교사 + 관리자 전원. 반·교사를 못 찾아도 관리자에게는 간다 (Q&A 와 같은 규칙)
export function videoNotifyTargets(student, classes = [], admins = []) {
  const klass = student && classes.find((c) => c.id === student.class_id)
  return [...new Set([
    ...(klass?.teacher_id ? [klass.teacher_id] : []),
    ...admins.map((a) => a.id),
  ])]
}

// 잠금화면에 그대로 뜬다. 진행률 같은 세부는 넣지 않는다.
export function videoNotification(type, student, video) {
  return {
    title: type === 'complete' ? '영상 시청 완료' : '영상 시청 시작',
    body: `${student?.name ?? '학생'} · ${video?.title ?? '영상'}`,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // 비밀값은 Q&A 알림과 함께 쓴다 — 환경변수를 늘리지 않는다
  if (!isAuthorizedWebhook(req.headers, process.env.QNA_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl    = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publicKey      = process.env.VAPID_PUBLIC_KEY
  const privateKey     = process.env.VAPID_PRIVATE_KEY
  const contact        = process.env.VAPID_CONTACT
  if (!supabaseUrl || !serviceRoleKey || !publicKey || !privateKey || !contact) {
    return res.status(500).json({ error: '서버 환경변수가 설정되지 않았습니다.' })
  }
  webpush.setVapidDetails(contact, publicKey, privateKey)

  const event = req.body?.record
  if (!event?.student_id || !event?.video_id || !['start', 'complete'].includes(event.type)) {
    return res.status(400).json({ error: '시청 이벤트 정보가 없습니다.' })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const [studentRes, videoRes, classesRes, adminsRes] = await Promise.all([
    admin.from('students').select('id, name, class_id').eq('id', event.student_id).maybeSingle(),
    admin.from('videos').select('id, title').eq('id', event.video_id).maybeSingle(),
    admin.from('classes').select('id, teacher_id'),
    admin.from('profiles').select('id').eq('role', 'admin'),
  ])

  const student = studentRes.data ?? undefined
  const targets = videoNotifyTargets(student, classesRes.data ?? [], adminsRes.data ?? [])
  if (targets.length === 0) return res.status(200).json({ sent: 0, removed: 0, reason: '받을 사람 없음' })

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('profile_id', targets)

  const payload = JSON.stringify({ ...videoNotification(event.type, student, videoRes.data), url: '/videos' })

  // 한 기기가 실패해도 나머지는 계속 보낸다
  const results = await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      return { endpoint: s.endpoint }
    } catch (e) {
      if (!isDeadSubscription(e.statusCode)) console.error('알림 발송 실패:', s.endpoint, e.statusCode, e.body)
      return { endpoint: s.endpoint, statusCode: e.statusCode }
    }
  }))

  const dead = endpointsToRemove(results)
  if (dead.length > 0) await admin.from('push_subscriptions').delete().in('endpoint', dead)
  return res.status(200).json({ sent: results.filter((r) => !r.statusCode).length, removed: dead.length })
}
