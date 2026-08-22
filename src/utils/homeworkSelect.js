// src/utils/homeworkSelect.js
// 학생↔과제 매칭과 요일 제출 상태 판정.
import { isLateSubmission } from './homework'

// 세트가 이 학생에게 보이는지: 내신은 반, 정시는 정시레벨로 매칭.
// 반별로 바꾸기 전에 만든 내신 세트는 class_id가 비어 있고 target에 학년이 들어 있다.
// 그런 세트는 예전처럼 학년으로 맞춰 지난 과제 기록이 학생 화면에 그대로 남게 한다.
export function matchesStudent(set, student) {
  if (set.category === 'naesin') {
    if (set.classId != null) {
      return student.classId != null && set.classId === student.classId
    }
    return set.target === student.grade
  }
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
