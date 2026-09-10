// api/notify-homework-submission.js
// 학생이 과제를 낼 때마다 그 과제를 낸 교사 폰으로 알림을 보낸다.
//
// 제출은 homework_submissions_v2에 한 줄이 들어가는 것으로 끝난다.
// 한 줄 = 한 사건이라 웹훅으로 잡는 편이 정확하다(Q&A 알림과 같은 방식).
// 학생 화면이 직접 부르게 하면, 학생 계정이 교사에게 알림을 쏘는 통로가 열린다.
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { isAuthorizedWebhook } from './notify-qna.js'
import { submissionNotification, submissionTargets } from '../src/utils/homeworkNotify.js'
import { sendToSubscriptions } from '../src/utils/pushDispatch.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // 비밀값은 Q&A 웹훅과 같은 것을 쓴다 — 설정할 값이 늘지 않게
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

  const record = req.body?.record
  if (!record?.day_id || !record?.student_id) {
    return res.status(400).json({ error: '제출 정보가 없습니다.' })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: day } = await admin
    .from('homework_days').select('id, set_id, weekday').eq('id', record.day_id).single()
  if (!day) return res.status(200).json({ sent: 0, removed: 0, reason: '요일 없음' })

  const [setRes, studentRes, adminsRes] = await Promise.all([
    admin.from('homework_sets').select('id, teacher_id, title').eq('id', day.set_id).single(),
    admin.from('students').select('id, name').eq('id', record.student_id).single(),
    admin.from('profiles').select('id').eq('role', 'admin'),
  ])

  const targets = submissionTargets(setRes.data, adminsRes.data ?? [])
  if (targets.length === 0) {
    return res.status(200).json({ sent: 0, removed: 0, reason: '받을 사람 없음' })
  }

  const { data: subs } = await admin
    .from('push_subscriptions').select('endpoint, p256dh, auth').in('profile_id', targets)

  webpush.setVapidDetails(contact, publicKey, privateKey)
  const payload = JSON.stringify({
    ...submissionNotification(studentRes.data, day),
    url: '/homework',
  })
  const { sent, dead } = await sendToSubscriptions(webpush, subs ?? [], payload)

  if (dead.length > 0) {
    await admin.from('push_subscriptions').delete().in('endpoint', dead)
  }

  return res.status(200).json({ sent, removed: dead.length })
}
