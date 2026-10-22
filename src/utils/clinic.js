// src/utils/clinic.js
// 보강 클리닉 신청을 "누가 보나 · 지금 어떤 상태인가"로 가르는 순수 함수.
// 화면과 테스트가 같은 규칙을 쓰게 여기 모은다.
//
// DB 정책(docs/clinic-requests.sql)과 같은 규칙이다. 화면에서도 거르는 이유는
// 정책이 아직 적용되지 않은 DB에서도 남의 신청이 섞여 보이지 않게 하기 위해서다.

export const CLINIC_STATUS = {
  pending:  { label: '대기 중', tone: 'warn' },
  accepted: { label: '확정',    tone: 'navy' },
  rejected: { label: '거절',    tone: 'neutral' },
}

// 볼 수 있는 신청 — 관리자는 전부, 교사는 담당 반 학생 것, 학생은 본인 것
export function visibleClinicRequests(requests = [], students = [], classes = [], user) {
  if (!user) return []
  if (user.role === 'admin') return requests
  if (user.role === 'teacher') {
    const myClassIds = new Set(classes.filter((c) => c.teacherId === user.id).map((c) => c.id))
    const myStudentIds = new Set(
      students.filter((s) => myClassIds.has(s.classId)).map((s) => s.id)
    )
    return requests.filter((r) => myStudentIds.has(r.studentId))
  }
  return requests.filter((r) => r.studentId === user.studentId)
}

// 아직 처리되지 않은 신청이 있으면 그것. 학생은 한 번에 하나만 기다리게 한다 —
// 같은 신청을 여러 번 눌러 교사 폰에 알림이 줄줄이 가는 것을 막는다.
export function pendingRequestOf(requests = [], studentId) {
  return requests.find((r) => r.studentId === studentId && r.status === 'pending') ?? null
}

// 대기 중인 것을 먼저, 그 안에서는 최근 것을 위로
export function sortClinicRequests(requests = []) {
  return [...requests].sort((a, b) => {
    const ap = a.status === 'pending' ? 0 : 1
    const bp = b.status === 'pending' ? 0 : 1
    if (ap !== bp) return ap - bp
    return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
  })
}
