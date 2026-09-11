// src/utils/homeworkSelect.js
// 학생↔과제 매칭과 요일 제출 상태 판정.
import { isLateSubmission } from './homework.js'
import { addDays } from './homeworkWeek.js'

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

// 제출을 받아주는 마지막 날 — 마감 다음날까지다.
// "월요일 과제는 화요일까지"가 학원이 정한 규칙이다. 하루의 말미를 주되
// 그 뒤로는 닫아, 밀린 과제를 몰아서 내는 일을 막는다.
export function submitDeadlineOf(day) {
  return addDays(day.date, 1)
}

// 오늘 이 요일 과제를 낼 수 있나.
// reopened는 교사가 따로 열어준 경우다 — 기한과 무관하게 낼 수 있다.
export function canSubmitOn(day, todayStr, reopened = false) {
  if (reopened) return true
  return todayStr <= submitDeadlineOf(day)
}

// 요일 제출 상태: 미제출/정상제출/지각제출/마감(더는 못 냄)
export function dayStatus(day, submission, todayStr, reopened = false) {
  if (!submission) {
    // 아직 낼 수 있으면 '미제출', 기한까지 지났으면 '마감'이다.
    // 둘을 같은 뱃지로 보여주면 학생은 아직 낼 수 있는 줄 안다.
    return canSubmitOn(day, todayStr, reopened) ? 'none' : 'closed'
  }
  return isLateSubmission(submission.submittedAt, day.date) ? 'late' : 'done'
}
