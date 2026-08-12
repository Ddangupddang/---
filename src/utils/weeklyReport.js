// src/utils/weeklyReport.js
// 주간 학생 리포트 계산. DB·UI 의존성이 없는 순수 함수만 둔다.
//
// 교사가 한 학생의 한 주를 보려면 출결·테스트·과제 화면 세 곳을 열어야 했다.
// 그 합치는 일을 여기서 한다.

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
