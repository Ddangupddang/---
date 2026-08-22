// src/utils/homeworkReport.js
// 과제 리포트: 한 달 동안 한 그룹(내신 반 / 정시 레벨)의 학생별 누적 수행.
// 요일 단위 제출 현황만으로는 "이 학생이 요즘 성실한가"를 알 수 없어,
// 학부모 상담과 학생 관리를 위해 기간 단위로 모아 본다.
import { gradeHomework } from './homework'
import { setInGroup, studentInGroup } from './homeworkGroup'
import { LOW_SUBMISSION } from '../constants/homework'

export function homeworkPeriodReport({
  students, sets, days, questions, submissions, category, group, month,
}) {
  // 담당 반이 없는 교사는 고를 그룹 자체가 없다
  if (!group) return { totalDays: 0, rows: [] }

  const setIds = new Set(
    sets.filter((s) => s.category === category && setInGroup(s, group)).map((s) => s.id)
  )
  const periodDays = days.filter((d) => setIds.has(d.setId) && d.date.startsWith(month))
  const totalDays = periodDays.length

  const groupStudents = students.filter((s) => studentInGroup(s, group))

  const rows = groupStudents.map((student) => {
    let submitted = 0
    let correct = 0
    let attempted = 0

    for (const day of periodDays) {
      const sub = submissions.find((s) => s.dayId === day.id && s.studentId === student.id)
      if (!sub) continue
      submitted++
      const dayQuestions = questions.filter((q) => q.dayId === day.id)
      const graded = gradeHomework(dayQuestions, sub.answers)
      correct += graded.correctCount
      attempted += graded.total
    }

    const submitRate = totalDays === 0 ? null : Math.round((submitted / totalDays) * 100)
    return {
      student,
      submitted,
      total: totalDays,
      submitRate,
      // 낸 회차의 문항만 분모로 삼는다 — 안 낸 회차까지 넣으면
      // 성실도와 실력이 뒤섞여 어느 쪽이 문제인지 알 수 없다
      correctRate: attempted === 0 ? null : Math.round((correct / attempted) * 100),
      lowSubmission: submitRate != null && submitRate < LOW_SUBMISSION,
    }
  })

  // 성실한 순으로 보여주고, 같으면 정답률, 그다음 이름으로 가른다
  rows.sort((a, b) =>
    (b.submitRate ?? 0) - (a.submitRate ?? 0) ||
    (b.correctRate ?? -1) - (a.correctRate ?? -1) ||
    a.student.name.localeCompare(b.student.name, 'ko')
  )

  return { totalDays, rows }
}
