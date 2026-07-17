// 학생 계정 아이디 = 이름 + 전화 뒤 4자리. 전화는 본인 우선, 없으면 학부모.

// 전화번호에서 숫자만 뽑아 뒤 4자리
export function last4(phone) {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')
  return digits.length >= 4 ? digits.slice(-4) : ''
}

// 본인 전화 우선, 없으면 학부모 전화의 뒤 4자리
export function studentLast4(student) {
  return last4(student.phone) || last4(student.parentPhone)
}

// taken에 없을 때까지 -2, -3 … 접미사 부여
export function uniqueUsername(base, taken) {
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

// 계정 없는 학생 목록 → 생성 계획.
// existingUsernames: 이미 존재하는 아이디(중복 방지용). 현재는 [] 전달(교차 충돌은 API가 최종 검증).
export function planStudentAccounts(students, existingUsernames) {
  const taken = new Set(existingUsernames)
  return students.map((s) => {
    const l4 = studentLast4(s)
    if (!l4) {
      return { studentId: s.id, name: s.name, classId: s.classId, username: null, skip: true, reason: '전화번호 없음' }
    }
    const username = uniqueUsername(`${s.name}${l4}`, taken)
    taken.add(username)
    return { studentId: s.id, name: s.name, classId: s.classId, username, skip: false, reason: '' }
  })
}
