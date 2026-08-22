// src/utils/studentSearch.js
// 학생 목록 걸러내기 — 반 필터와 검색어를 함께 적용한다.

// 전화번호는 사람마다 010-1234-5678, 01012345678처럼 적는 방식이 달라
// 숫자만 남겨 비교한다.
const digitsOf = (v) => (v ?? '').replace(/\D/g, '')

export function filterStudents(students = [], { classId = null, search = '' } = {}) {
  const query = search.trim()
  const queryDigits = digitsOf(query)

  return students.filter((s) => {
    if (classId && s.classId !== classId) return false
    if (!query) return true

    if ((s.name ?? '').includes(query)) return true

    // 한 자리만 친 경우까지 번호로 찾으면 거의 전부가 걸려 검색이 무의미해진다
    if (queryDigits.length >= 2) {
      return [s.phone, s.parentPhone].some((p) => digitsOf(p).includes(queryDigits))
    }
    return false
  })
}
