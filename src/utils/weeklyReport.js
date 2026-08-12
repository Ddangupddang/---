// src/utils/weeklyReport.js
// 주간 학생 리포트 계산. DB·UI 의존성이 없는 순수 함수만 둔다.
//
// 교사가 한 학생의 한 주를 보려면 출결·테스트·과제 화면 세 곳을 열어야 했다.
// 그 합치는 일을 여기서 한다.

import { gradeHomework } from './homework'
import { matchesStudent } from './homeworkSelect'
import { weekDates } from './homeworkWeek'
import { HW_CATEGORY, LOW_SUBMISSION } from '../constants/homework'

// 한 학생의 그 주 출결 집계.
// 지각은 "왔다"이므로 출석률 분자에 넣되, 별도로 세어 표에서 감춰지지 않게 한다.
// 그 주 기록이 아예 없으면 null — 출석률 0%와 "기록 없음"은 다른 뜻이다.
export function weeklyAttendance(records, studentId, dates) {
  const inWeek = new Set(dates)
  const mine = records.filter((a) => a.studentId === studentId && inWeek.has(a.date))

  const present = mine.filter((a) => a.status === 'present').length
  const late    = mine.filter((a) => a.status === 'late').length
  const absent  = mine.filter((a) => a.status === 'absent').length
  const counted = present + late + absent
  if (counted === 0) return null

  return {
    present, late, absent, counted,
    rate: Math.round(((present + late) / counted) * 100),
  }
}

// 한 학생의 그 주 주간테스트 결과.
// 시험은 반(classId) 단위로 배정되므로 반과 날짜로 먼저 추린 뒤 학생 제출을 찾는다.
export function weeklyTests({ tests, testSubmissions, student, classId, dates }) {
  const inWeek = new Set(dates)
  const weekTests = tests
    .filter((t) => t.classId === classId && inWeek.has(t.date))
    .sort((a, b) => a.date.localeCompare(b.date))

  const rows = weekTests.map((test) => {
    const total = (test.questions ?? []).reduce((sum, q) => sum + (q.points ?? 0), 0)
    const sub = testSubmissions.find((s) => s.testId === test.id && s.studentId === student.id)

    if (!sub) return { test, score: null, total, state: 'absent' }
    // 주관식은 교사가 채점해야 점수가 생긴다. 채점 전을 0점으로 세면 억울한 점수가 된다.
    if ((sub.scores ?? []).length === 0) return { test, score: null, total, state: 'grading' }

    const score = sub.scores.reduce((sum, s) => sum + (s.score ?? 0), 0)
    return { test, score, total, state: 'graded' }
  })

  if (rows.length === 0) return { rows: [], summary: null }

  // 시험마다 만점이 다를 수 있어 원점수 평균은 뜻이 없다 → 백분율로 환산해 평균낸다
  const graded = rows.filter((r) => r.state === 'graded' && r.total > 0)
  const average = graded.length === 0
    ? null
    : Math.round(graded.reduce((sum, r) => sum + (r.score / r.total) * 100, 0) / graded.length)

  return { rows, summary: { average, count: rows.length } }
}

// 한 학생의 그 주 한 종류(내신/정시) 과제 수행.
// 과제는 반이 아니라 학년(내신)·정시레벨로 배정되므로 학생마다 자기 세트를 찾아야 한다.
// 배정된 세트가 없으면 null — "0% 제출"과 "낼 과제가 없었음"은 전혀 다른 뜻이다.
export function weeklyHomework({ sets, days, questions, submissions, student, category, weekStart }) {
  const mySetIds = new Set(
    sets
      .filter((s) => s.category === category && s.weekStart === weekStart && matchesStudent(s, student))
      .map((s) => s.id)
  )
  if (mySetIds.size === 0) return null

  const myDays = days.filter((d) => mySetIds.has(d.setId))
  if (myDays.length === 0) return null

  let submitted = 0
  let correct = 0
  let attempted = 0

  for (const day of myDays) {
    const sub = submissions.find((s) => s.dayId === day.id && s.studentId === student.id)
    if (!sub) continue
    submitted++
    const graded = gradeHomework(questions.filter((q) => q.dayId === day.id), sub.answers)
    correct += graded.correctCount
    attempted += graded.total
  }

  return {
    submitted,
    total: myDays.length,
    submitRate: Math.round((submitted / myDays.length) * 100),
    // 낸 회차의 문항만 분모로 삼는다 — 안 낸 회차까지 넣으면
    // 성실도와 실력이 뒤섞여 어느 쪽이 문제인지 알 수 없다
    correctRate: attempted === 0 ? null : Math.round((correct / attempted) * 100),
  }
}

// 한 반의 한 주 전체. 화면은 이 결과를 그리기만 한다.
export function weeklyClassReport({
  students, attendance, tests, testSubmissions,
  homeworkSets, homeworkDays, homeworkQuestions, homeworkSubmissions,
  classId, weekStart,
}) {
  const dates = weekDates(weekStart)
  const hw = {
    sets: homeworkSets, days: homeworkDays,
    questions: homeworkQuestions, submissions: homeworkSubmissions,
    weekStart,
  }

  const rows = students
    .filter((s) => s.classId === classId)
    .map((student) => {
      const att = weeklyAttendance(attendance, student.id, dates)
      const { rows: testRows, summary } = weeklyTests({
        tests, testSubmissions, student, classId, dates,
      })
      const naesin  = weeklyHomework({ ...hw, student, category: HW_CATEGORY.NAESIN })
      const jeongsi = weeklyHomework({ ...hw, student, category: HW_CATEGORY.JEONGSI })

      // 교사가 먼저 봐야 할 신호만 flag로 세운다
      const flags = []
      if (att && att.absent > 0) flags.push('absence')
      if (testRows.some((r) => r.state === 'absent')) flags.push('testAbsent')
      if ([naesin, jeongsi].some((h) => h && h.submitRate < LOW_SUBMISSION)) flags.push('lowHomework')

      return { student, attendance: att, tests: testRows, testSummary: summary, naesin, jeongsi, flags }
    })

  // 문제 있는 학생이 먼저 보여야 표를 훑는 의미가 있다
  rows.sort((a, b) =>
    b.flags.length - a.flags.length ||
    a.student.name.localeCompare(b.student.name, 'ko')
  )

  return { weekStart, dates, rows }
}
