// src/utils/homeworkList.js
// 교사·관리자의 과제 목록에 무엇이 어떤 순서로 보이는가.
//
// 규칙을 화면 안에 인라인으로 두면 고칠 때 빠뜨린다. 여기 모아서 테스트로 덮는다.
import { HW_CATEGORY } from '../constants/homework'

export function visibleSets(sets = [], category, classes = [], userRole) {
  const mine = sets.filter((s) => {
    if (s.category !== category) return false
    // 정시는 레벨 단위 학원 공용이라 담당 반과 무관하다
    if (category === HW_CATEGORY.JEONGSI) return true

    // 내신은 담당 반 것만. 다만 그 반이 지워졌으면 아무에게도 안 보이게 되어
    // 지울 수도 없는 과제가 남는다. 그런 것은 관리자가 정리할 수 있어야 한다.
    if (s.classId != null) {
      return classes.some((c) => c.id === s.classId) || userRole === 'admin'
    }

    // 반별로 바꾸기 전의 학년 단위 세트. 정리할 수 있게 관리자에게만 남긴다.
    return userRole === 'admin'
  })

  // 주차 내림차순, 같은 주차면 최근에 만든 것(id가 큰 것)이 위로.
  //
  // 예전 비교 함수는 0을 돌려주지 않아 같은 주차끼리 순서가 정해지지 않았다.
  // 그래서 방금 만든 과제가 목록 어디에 나타날지 알 수 없었고,
  // 맨 위에 없으면 "저장이 안 됐다"로 보였다.
  return [...mine].sort((a, b) =>
    a.weekStart !== b.weekStart
      ? String(b.weekStart).localeCompare(String(a.weekStart))
      : b.id - a.id
  )
}
