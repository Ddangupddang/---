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
import { qnaCategoryLabel } from '../src/constants/qna.js'

// 이 글의 알림을 누가 받아야 하는가.
// 학생이 물으면 교사가, 교사가 답하면 학생이 받는다.
export function messageAudience(record) {
  if (!record?.qna_id) return null
  if (record.author_role === 'student') return 'teacher'
  if (record.author_role === 'teacher') return 'student'
  return null
}

// 잠금화면에 그대로 뜨는 내용이다. 글 본문은 넣지 않는다.
export function messageNotification(student) {
  return {
    title: '새 질문',
    body: `${student?.name ?? '학생'} · 추가 질문`,
  }
}

// 학생에게 가는 알림. 마찬가지로 답변 내용은 넣지 않는다 —
// 학생 폰 잠금화면도 옆 사람에게 보인다.
export function answerNotification(question) {
  return {
    title: '새 답변',
    body: `선생님 답변 · ${qnaCategoryLabel(question?.category)}`,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!isAuthorizedWebhook(req.headers, process.env.QNA_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const record   = req.body?.record
  const audience = messageAudience(record)
  if (!audience) {
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
    .from('qna').select('student_id, category').eq('id', record.qna_id).single()

  if (!question) return res.status(200).json({ sent: 0, removed: 0, reason: '질문 없음' })

  let targets = []
  let payload = ''

  if (audience === 'teacher') {
    const [studentsRes, classesRes, adminsRes] = await Promise.all([
      admin.from('students').select('id, name, class_id'),
      admin.from('classes').select('id, teacher_id'),
      admin.from('profiles').select('id').eq('role', 'admin'),
    ])
    const students = studentsRes.data ?? []
    targets = notifyTargets(question, students, classesRes.data ?? [], adminsRes.data ?? [])
    const student = students.find((s) => s.id === question.student_id)
    payload = JSON.stringify({ ...messageNotification(student), url: '/qna' })
  } else {
    // 질문을 쓴 학생의 계정을 찾는다. 학생 한 명에 계정이 하나지만
    // 배열로 받아 그대로 넘긴다 — 아래 발송 코드가 같은 모양을 쓴다.
    const { data: owners } = await admin
      .from('profiles').select('id').eq('role', 'student').eq('student_id', question.student_id)
    targets = (owners ?? []).map((p) => p.id)
    payload = JSON.stringify({ ...answerNotification(question), url: '/qna' })
  }

  if (targets.length === 0) {
    return res.status(200).json({ sent: 0, removed: 0, reason: '받을 사람 없음' })
  }

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('profile_id', targets)

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
        console.error('Q&A 알림 발송 실패:', s.endpoint, e.statusCode, e.body)
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
