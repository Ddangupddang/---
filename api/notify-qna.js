// api/notify-qna.js
// 새 질문이 올라오면 담당 교사 폰으로 알림을 보낸다.
//
// 판단 로직은 순수 함수로 빼서 테스트한다 (api/check-wifi.js와 같은 방식).
// 나중에 채널을 카카오 알림톡으로 바꿔도 이 부분은 그대로 쓴다.
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { qnaCategoryLabel } from '../src/constants/qna.js'

// 이 질문의 알림을 받을 사람들의 profile id.
// 인자는 전부 DB 행 모양(snake_case)이다 — 웹훅 payload를 변환 없이 그대로 받는다.
export function notifyTargets(question, students = [], classes = [], admins = []) {
  const adminIds = admins.map((a) => a.id)

  // 받을 교사를 못 찾으면 관리자에게 넘긴다.
  // 계정과 명부가 어긋나 학생을 못 찾는 경우가 실제로 있었다.
  // 그때 알림을 버리면 질문이 아무에게도 안 보인 채로 묻힌다.
  const student = students.find((s) => s.id === question.student_id)
  if (!student) return adminIds

  const klass = classes.find((c) => c.id === student.class_id)
  if (!klass?.teacher_id) return adminIds

  return [klass.teacher_id]
}

// 잠금화면에 그대로 뜨는 내용이다. 질문 본문은 넣지 않는다.
export function qnaNotification(student, question) {
  return {
    title: '새 질문',
    body: `${student?.name ?? '학생'} · ${qnaCategoryLabel(question.category)}`,
  }
}

// 브라우저가 구독을 버린 상태. 이 구독은 지워야 한다.
// 500·429처럼 잠시 실패한 것까지 지우면 교사가 알림을 다시 켜야 한다.
export function isDeadSubscription(statusCode) {
  return statusCode === 404 || statusCode === 410
}

// 이 주소를 아는 사람이 아무나 알림을 쏘지 못하게 막는다.
// 비밀값을 설정하지 않았으면 아무도 통과시키지 않는다 —
// 설정 전에는 누구나 쏘는 것보다 아무도 못 쏘는 편이 안전하다.
export function isAuthorizedWebhook(headers, secret) {
  if (!secret) return false
  return headers['x-webhook-secret'] === secret
}

// 발송 결과에서 지워야 할 구독만 골라낸다.
// 죽은 구독을 남겨두면 "보냈다"는 기록만 쌓이고 아무도 못 받는 상태가 조용히 이어진다.
export function endpointsToRemove(results = []) {
  return results.filter((r) => isDeadSubscription(r.statusCode)).map((r) => r.endpoint)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!isAuthorizedWebhook(req.headers, process.env.QNA_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl    = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publicKey      = process.env.VAPID_PUBLIC_KEY
  const privateKey     = process.env.VAPID_PRIVATE_KEY
  // 푸시 서비스가 문제 생겼을 때 연락할 곳. 실제로 받는 주소를 넣어야 한다.
  const contact        = process.env.VAPID_CONTACT

  if (!supabaseUrl || !serviceRoleKey || !publicKey || !privateKey || !contact) {
    return res.status(500).json({ error: '서버 환경변수가 설정되지 않았습니다.' })
  }

  webpush.setVapidDetails(contact, publicKey, privateKey)

  const question = req.body?.record
  if (!question?.student_id) return res.status(400).json({ error: '질문 정보가 없습니다.' })

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const [studentsRes, classesRes, adminsRes] = await Promise.all([
    admin.from('students').select('id, name, class_id'),
    admin.from('classes').select('id, teacher_id'),
    admin.from('profiles').select('id').eq('role', 'admin'),
  ])

  const students = studentsRes.data ?? []
  const targets  = notifyTargets(question, students, classesRes.data ?? [], adminsRes.data ?? [])
  if (targets.length === 0) {
    return res.status(200).json({ sent: 0, removed: 0, reason: '받을 사람 없음' })
  }

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('profile_id', targets)

  const student = students.find((s) => s.id === question.student_id)
  const payload = JSON.stringify({ ...qnaNotification(student, question), url: '/qna' })

  // 한 기기가 실패해도 나머지는 계속 보낸다.
  // 교사 한 명의 폰이 죽었다고 다른 교사가 못 받으면 안 된다.
  const results = await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
      return { endpoint: s.endpoint }
    } catch (e) {
      // 죽은 구독은 조용히 정리하고, 그 밖의 실패는 원인을 남긴다
      if (!isDeadSubscription(e.statusCode)) {
        console.error('알림 발송 실패:', s.endpoint, e.statusCode, e.body)
      }
      return { endpoint: s.endpoint, statusCode: e.statusCode }
    }
  }))

  const dead = endpointsToRemove(results)
  const sent = results.filter((r) => !r.statusCode).length

  if (dead.length > 0) {
    await admin.from('push_subscriptions').delete().in('endpoint', dead)
  }

  return res.status(200).json({ sent, removed: dead.length })
}
