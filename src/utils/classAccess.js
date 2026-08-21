// src/utils/classAccess.js
// 역할에 따라 어떤 반과 학생이 보이는지 정하는 곳.
//
// 규칙을 화면마다 따로 적어두면 규칙이 바뀔 때 빠뜨리는 화면이 생긴다.
// 권한 판단은 전부 이 파일을 거치게 한다.
//
//   관리자 — 전체
//   교사   — 담당 반(classes.teacherId === user.id)
//   학생   — 본인 반(user.classId)

// 보이는 반 목록
export function visibleClasses(classes = [], user) {
  if (!user) return []
  if (user.role === 'admin') return classes
  if (user.role === 'student') return classes.filter((c) => c.id === user.classId)
  return classes.filter((c) => c.teacherId === user.id)
}

// 보이는 반의 id 배열 — 다른 자료(영상·테스트·리포트 등)를 거를 때 쓴다
export function visibleClassIds(classes = [], user) {
  return visibleClasses(classes, user).map((c) => c.id)
}

// 이 반의 자료(영상·테스트·리포트 등)를 볼 수 있는가.
// 관리자는 반이 지정되지 않은 자료까지 전부 본다.
export function canSeeClass(classes = [], user, classId) {
  if (!user) return false
  if (user.role === 'admin') return true
  if (classId === null || classId === undefined) return false
  return visibleClassIds(classes, user).includes(classId)
}

// 보이는 반에 속한 학생 목록.
// 반이 없는(삭제됐거나 아직 배정 안 된) 학생은 관리자에게만 보인다.
export function visibleStudents(students = [], classes = [], user) {
  if (!user) return []
  if (user.role === 'admin') return students
  const ids = visibleClassIds(classes, user)
  return students.filter((s) => ids.includes(s.classId))
}

// 담당 반이 하나도 없는 교사인가 — 빈 화면에 안내를 띄울지 판단할 때 쓴다
export function hasNoAssignedClass(classes = [], user) {
  return user?.role === 'teacher' && visibleClasses(classes, user).length === 0
}
