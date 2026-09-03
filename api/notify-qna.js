// api/notify-qna.js
// 새 질문이 올라오면 담당 교사 폰으로 알림을 보낸다.
//
// 판단 로직은 순수 함수로 빼서 테스트한다 (api/check-wifi.js와 같은 방식).
// 나중에 채널을 카카오 알림톡으로 바꿔도 이 부분은 그대로 쓴다.
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
