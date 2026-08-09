// src/utils/homeworkSelect.js
// 학생↔과제 매칭과 요일 제출 상태 판정.
import { isLateSubmission } from './homework'

// 세트가 이 학생에게 보이는지: 내신은 학년, 정시는 정시레벨로 매칭
export function matchesStudent(set, student) {
  if (set.category === 'naesin') return set.target === student.grade
  if (set.category === 'jeongsi') {
    return student.jeongsiLevel != null && set.target === student.jeongsiLevel
  }
  return false
}

// 요일 제출 상태: 미제출/정상제출/지각제출
// eslint-disable-next-line no-unused-vars
export function dayStatus(day, submission, todayStr) {
  if (!submission) return 'none'
  return isLateSubmission(submission.submittedAt, day.date) ? 'late' : 'done'
}
