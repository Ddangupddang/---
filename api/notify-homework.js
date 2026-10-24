// api/notify-homework.js
// 과제 출제가 끝나면 그 과제를 받는 학생들 폰으로 알림을 보낸다.
//
// 웹훅이 아니라 앱이 직접 부른다. 세트 하나는 homework_sets → homework_days →
// homework_questions 세 표에 나눠 저장되는데, 표 하나의 INSERT를 웹훅으로 잡으면
// 아직 문항이 안 들어간 시점에 알림이 나간다. 저장이 중간에 실패하면 있지도 않은
// 과제를 알리게 된다. 그래서 "저장이 전부 끝났다"를 아는 앱이 부른다.
//
// 다음 주 과제는 바로 보내지 않는다. 학생 화면은 이번 주 과제만 보여줘서,
// 알림을 눌러도 과제가 안 보인다. 그런 세트는 월요일 아침 정기 발송(GET)이 보낸다.
//   POST — 앱이 부른다 (교사 로그인 토큰)
//   GET  — Vercel 정기 실행(vercel.json의 crons)이 부른다 (CRON_SECRET)
// 정기 발송을 파일 하나로 따로 만들지 않은 이유: api/의 .js 하나가 함수 하나이고
// 무료 요금제 상한이 12개다. 지금 11개라 하나 늘리면 여유가 없다.
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import {
  homeworkStudentIds, newHomeworkNotification, isFutureWeek, isDeferredForWeek,
} from '../src/utils/homeworkNotify.js'
import { sendToSubscriptions } from '../src/utils/pushDispatch.js'
import { mondayOf } from '../src/utils/homeworkWeek.js'
import { todayKST } from '../src/utils/datetime.js'

// Vercel 정기 실행은 CRON_SECRET 환경변수를 Authorization 헤더에 담아 보낸다.
// 값이 설정되지 않았으면 아무도 통과시키지 않는다 — 누구나 학생 전체에게 알림을 쏘면 안 된다.
export function isAuthorizedCron(headers, secret) {
  if (!secret) return false
  return headers.authorization === `Bearer ${secret}`
}

// 세트 하나를 그 세트를 받는 학생들에게 보낸다.
// students는 정기 발송에서 세트마다 다시 읽지 않도록 밖에서 받는다.
async function sendForSet(admin, set, students) {
  const studentIds = homeworkStudentIds(set, students)
  if (studentIds.length === 0) return { sent: 0, removed: 0, reason: '받을 학생 없음' }

  // 학생 명부(students)와 로그인 계정(profiles)은 다른 표다.
  // 알림은 계정 단위로 가므로 명부 id를 계정 id로 바꿔야 한다.
  const { data: profiles } = await admin
    .from('profiles').select('id').eq('role', 'student').in('student_id', studentIds)

  const profileIds = (profiles ?? []).map((p) => p.id)
  if (profileIds.length === 0) return { sent: 0, removed: 0, reason: '계정 없음' }

  const { data: subs } = await admin
    .from('push_subscriptions').select('endpoint, p256dh, auth').in('profile_id', profileIds)

  const payload = JSON.stringify({ ...newHomeworkNotification(set), url: '/homework' })
  const { sent, dead } = await sendToSubscriptions(webpush, subs ?? [], payload)

  if (dead.length > 0) {
    await admin.from('push_subscriptions').delete().in('endpoint', dead)
  }
  return { sent, removed: dead.length }
}

// 월요일 아침 정기 발송 — 지난주에 미리 만들어 둔 이번 주 세트를 지금 알린다.
async function sendDeferred(admin, res) {
  const monday = mondayOf(todayKST())
  // 이번 주 세트 중 이번 주 월요일 0시(한국) 전에 만든 것.
  // 같은 조건을 isDeferredForWeek로 한 번 더 거른다 — 조회 조건이 틀려도 엉뚱한 세트가 안 나가게.
  const { data: rows, error } = await admin
    .from('homework_sets')
    .select('id, category, target, class_id, title, week_start, created_at')
    .eq('week_start', monday)
    .lt('created_at', `${monday}T00:00:00+09:00`)
  if (error) return res.status(500).json({ error: error.message })

  const sets = (rows ?? []).filter((s) => isDeferredForWeek(s, monday))
  if (sets.length === 0) return res.status(200).json({ monday, sets: 0, sent: 0 })

  const { data: students } = await admin
    .from('students').select('id, class_id, grade, jeongsi_level')

  let sent = 0
  let removed = 0
  for (const set of sets) {
    const r = await sendForSet(admin, set, students ?? [])
    sent += r.sent
    removed += r.removed
  }
  return res.status(200).json({ monday, sets: sets.length, sent, removed })
}


export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl    = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publicKey      = process.env.VAPID_PUBLIC_KEY
  const privateKey     = process.env.VAPID_PRIVATE_KEY
  const contact        = process.env.VAPID_CONTACT

  if (!supabaseUrl || !serviceRoleKey || !publicKey || !privateKey || !contact) {
    return res.status(500).json({ error: '서버 환경변수가 설정되지 않았습니다.' })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  webpush.setVapidDetails(contact, publicKey, privateKey)

  // ── 월요일 아침 정기 발송 ──
  if (req.method === 'GET') {
    if (!isAuthorizedCron(req.headers, process.env.CRON_SECRET)) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    return sendDeferred(admin, res)
  }

  // ── 교사가 과제를 저장한 직후 ──
  const setId = req.body?.setId
  if (!setId) return res.status(400).json({ error: '과제 정보가 없습니다.' })

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
    .select('id, category, target, class_id, title, week_start')
    .eq('id', setId).single()
  if (!set) return res.status(404).json({ error: '과제를 찾을 수 없습니다.' })

  // 다음 주 과제 — 지금은 보내지 않는다. 그 주 월요일 아침 정기 발송이 보낸다.
  if (isFutureWeek(set.week_start)) {
    return res.status(200).json({ sent: 0, removed: 0, deferredTo: set.week_start })
  }

  const { data: students } = await admin
    .from('students').select('id, class_id, grade, jeongsi_level')

  return res.status(200).json(await sendForSet(admin, set, students ?? []))
}
