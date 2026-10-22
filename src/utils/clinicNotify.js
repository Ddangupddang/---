// src/utils/clinicNotify.js
// 보강 클리닉 알림을 "언제 · 누구에게 · 무슨 문구로" 보낼지 정한다.
//
// api/notify-qna-message.js가 이 파일을 부른다. 클리닉용 api 파일을 따로 만들지
// 않은 이유: api/ 안의 .js 하나가 서버리스 함수 하나인데 무료 요금제 상한이
// 12개이고 이미 11개다. 마지막 한 자리를 남겨 두려고 같은 웹훅 주소에서
// 표 이름으로 갈라 받는다.
//
// api/에서 불리므로 import에 .js를 붙인다(Node ESM은 확장자 없는 경로를 못 찾는다).
import { sendToSubscriptions } from './pushDispatch.js'

// 웹훅 payload를 보고 어떤 알림인지 고른다.
//   새 신청            → 'requested' (교사·관리자에게)
//   대기 → 수락/거절   → 'accepted' / 'rejected' (학생에게)
//   그 밖의 고치기·지우기 → null (보내지 않는다)
export function clinicEvent(body) {
  const record = body?.record
  if (!record?.student_id) return null

  if (body.type === 'INSERT') {
    return record.status === 'pending' ? 'requested' : null
  }

  if (body.type === 'UPDATE') {
    // 이미 처리된 신청을 다시 고친 것이면 보내지 않는다 — 학생 폰에 같은 알림이 두 번 뜬다.
    // old_record가 오지 않는 설정이면 대기 상태였다고 본다.
    const before = body.old_record?.status ?? 'pending'
    if (before !== 'pending') return null
    if (record.status === 'accepted' || record.status === 'rejected') return record.status
  }

  return null
}

// 신청 알림을 받을 사람 = 그 학생 반 담당 교사 + 관리자 전원 (Q&A 알림과 같은 규칙).
// 담당 교사를 못 찾아도 관리자에게는 간다.
export function clinicStaffTargets(classTeacherId = null, admins = []) {
  return [...new Set([
    ...(classTeacherId ? [classTeacherId] : []),
    ...admins.map((a) => a.id),
  ])]
}

// 잠금화면에 그대로 뜨는 내용이다.
// 신청 내용과 거절 이유는 넣지 않는다 — 옆 사람에게 보인다.
// 확정 일정은 넣는다. 학생이 앱을 열지 않아도 언제 오는지 알 수 있어야 한다.
export function clinicNotification(event, studentRow, record) {
  if (event === 'requested') {
    return { title: '클리닉 신청', body: `${studentRow?.name ?? '학생'} · 보강 클리닉` }
  }
  if (event === 'accepted') {
    return { title: '클리닉 확정', body: record?.schedule_text ?? '일정을 확인해 주세요' }
  }
  if (event === 'rejected') {
    return { title: '클리닉 신청 답변', body: '선생님이 답을 남겼어요' }
  }
  return null
}

// 웹훅 하나를 처리한다. DB와 발송 도구는 부르는 쪽(api)이 만들어 넘긴다.
export async function handleClinicWebhook({ admin, webpush, body }) {
  const event = clinicEvent(body)
  if (!event) return { sent: 0, removed: 0, reason: '보낼 대상 아님' }

  const record = body.record
  let targets = []
  let studentRow = null

  if (event === 'requested') {
    const [studentRes, adminsRes] = await Promise.all([
      admin.from('students').select('id, name, class_id').eq('id', record.student_id).maybeSingle(),
      admin.from('profiles').select('id').eq('role', 'admin'),
    ])
    studentRow = studentRes.data
    const classId = studentRow?.class_id
    const { data: klass } = classId
      ? await admin.from('classes').select('teacher_id').eq('id', classId).maybeSingle()
      : { data: null }
    targets = clinicStaffTargets(klass?.teacher_id ?? null, adminsRes.data ?? [])
  } else {
    // 신청한 학생의 계정
    const { data: owners } = await admin
      .from('profiles').select('id').eq('role', 'student').eq('student_id', record.student_id)
    targets = (owners ?? []).map((p) => p.id)
  }

  if (targets.length === 0) return { sent: 0, removed: 0, reason: '받을 사람 없음' }

  const { data: subs } = await admin
    .from('push_subscriptions').select('endpoint, p256dh, auth').in('profile_id', targets)

  const payload = JSON.stringify({
    ...clinicNotification(event, studentRow, record),
    url: '/clinic',
  })
  const { sent, dead } = await sendToSubscriptions(webpush, subs ?? [], payload)

  if (dead.length > 0) {
    await admin.from('push_subscriptions').delete().in('endpoint', dead)
  }

  return { sent, removed: dead.length }
}
