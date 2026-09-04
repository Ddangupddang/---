// api/notify-qna-message.js
// Q&A 대화에 학생이 글을 올리면 담당 교사 폰으로 알림을 보낸다.
//
// 첫 질문은 api/notify-qna.js가 맡는다(qna 표의 INSERT). 이 파일은
// 그 뒤에 오가는 글(qna_messages 표의 INSERT)을 맡는다.
// 표가 다르니 Supabase 웹훅도 두 개다.
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import {
  notifyTargets, isDeadSubscription, endpointsToRemove, isAuthorizedWebhook,
} from './notify-qna.js'

// 교사가 쓴 글에는 보내지 않는다 — 받을 학생 구독이 없다.
// (알림 켜기는 교사·관리자 화면에만 있다)
export function shouldNotifyMessage(record) {
  if (!record?.qna_id) return false
  return record.author_role === 'student'
}

// 잠금화면에 그대로 뜨는 내용이다. 글 본문은 넣지 않는다.
export function messageNotification(student) {
  return {
    title: '새 질문',
    body: `${student?.name ?? '학생'} · 추가 질문`,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!isAuthorizedWebhook(req.headers, process.env.QNA_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const record = req.body?.record
  if (!shouldNotifyMessage(record)) {
    return res.status(200).json({ sent: 0, removed: 0, reason: '보낼 대상 아님' })
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

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 글에는 qna_id만 있다. 누구의 질문인지는 부모를 봐야 안다.
  const { data: question } = await admin
    .from('qna').select('student_id').eq('id', record.qna_id).single()

  if (!question) return res.status(200).json({ sent: 0, removed: 0, reason: '질문 없음' })

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
  const payload = JSON.stringify({ ...messageNotification(student), url: '/qna' })

  // 한 기기가 실패해도 나머지는 계속 보낸다
  const results = await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
      return { endpoint: s.endpoint }
    } catch (e) {
      if (!isDeadSubscription(e.statusCode)) {
        console.error('추가 질문 알림 발송 실패:', s.endpoint, e.statusCode, e.body)
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
