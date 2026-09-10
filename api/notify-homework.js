// api/notify-homework.js
// 과제 출제가 끝나면 그 과제를 받는 학생들 폰으로 알림을 보낸다.
//
// 웹훅이 아니라 앱이 직접 부른다. 세트 하나는 homework_sets → homework_days →
// homework_questions 세 표에 나눠 저장되는데, 표 하나의 INSERT를 웹훅으로 잡으면
// 아직 문항이 안 들어간 시점에 알림이 나간다. 저장이 중간에 실패하면 있지도 않은
// 과제를 알리게 된다. 그래서 "저장이 전부 끝났다"를 아는 앱이 부른다.
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { homeworkStudentIds, newHomeworkNotification } from '../src/utils/homeworkNotify.js'
import { sendToSubscriptions } from '../src/utils/pushDispatch.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseUrl    = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publicKey      = process.env.VAPID_PUBLIC_KEY
  const privateKey     = process.env.VAPID_PRIVATE_KEY
  const contact        = process.env.VAPID_CONTACT

  if (!supabaseUrl || !serviceRoleKey || !publicKey || !privateKey || !contact) {
    return res.status(500).json({ error: '서버 환경변수가 설정되지 않았습니다.' })
  }

  const setId = req.body?.setId
  if (!setId) return res.status(400).json({ error: '과제 정보가 없습니다.' })

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 이 주소를 아는 사람이 아무나 학생들에게 알림을 쏘지 못하게 막는다.
  // 웹훅이 아니라 사람이 부르는 API라 비밀값이 아니라 로그인 토큰으로 확인한다.
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: '로그인이 필요합니다.' })

  const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !caller) return res.status(401).json({ error: '유효하지 않은 세션입니다.' })

  const { data: callerProfile } = await admin
    .from('profiles').select('role').eq('id', caller.id).single()
  if (!callerProfile || !['admin', 'teacher'].includes(callerProfile.role)) {
    return res.status(403).json({ error: '교사 또는 관리자만 보낼 수 있습니다.' })
  }

  const { data: set } = await admin
    .from('homework_sets')
    .select('id, category, target, class_id, title')
    .eq('id', setId).single()
  if (!set) return res.status(404).json({ error: '과제를 찾을 수 없습니다.' })

  const { data: students } = await admin
    .from('students').select('id, class_id, grade, jeongsi_level')

  const studentIds = homeworkStudentIds(set, students ?? [])
  if (studentIds.length === 0) {
    return res.status(200).json({ sent: 0, removed: 0, reason: '받을 학생 없음' })
  }

  // 학생 명부(students)와 로그인 계정(profiles)은 다른 표다.
  // 알림은 계정 단위로 가므로 명부 id를 계정 id로 바꿔야 한다.
  const { data: profiles } = await admin
    .from('profiles').select('id').eq('role', 'student').in('student_id', studentIds)

  const profileIds = (profiles ?? []).map((p) => p.id)
  if (profileIds.length === 0) {
    return res.status(200).json({ sent: 0, removed: 0, reason: '계정 없음' })
  }

  const { data: subs } = await admin
    .from('push_subscriptions').select('endpoint, p256dh, auth').in('profile_id', profileIds)

  webpush.setVapidDetails(contact, publicKey, privateKey)
  const payload = JSON.stringify({ ...newHomeworkNotification(set), url: '/homework' })
  const { sent, dead } = await sendToSubscriptions(webpush, subs ?? [], payload)

  if (dead.length > 0) {
    await admin.from('push_subscriptions').delete().in('endpoint', dead)
  }

  return res.status(200).json({ sent, removed: dead.length })
}
