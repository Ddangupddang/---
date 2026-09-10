// src/utils/homeworkCopy.js
// 이미 낸 과제를 다른 반에 그대로 내보내기(복제)에 필요한 판정.
//
// 복제는 두 가지 함정을 만든다. 둘 다 여기서 미리 막는다.
//   1) 한 반에 그 주 과제는 하나뿐이다(DB 제약). 저장을 눌러야 알면 늦다.
//   2) 복제본은 원본과 같은 해설 파일 주소를 가리킨다. 한쪽에서 파일을
//      빼면 스토리지에서 지워져 다른 쪽 링크까지 깨진다.
import { setInGroup } from './homeworkGroup'

// 복제 화면에서 처음 고를 대상.
// 복제는 "다른 반에도 낸다"는 뜻이므로 원본과 다른 반을 먼저 보여준다.
// 고를 수 있는 반이 원본뿐이면 원본 그대로 둔다(주를 바꿔 내면 된다).
export function defaultCopyGroupKey(groups = [], sourceSet = null) {
  if (groups.length === 0) return ''
  const other = groups.find((g) => !setInGroup(sourceSet, g))
  return (other ?? groups[0]).key
}

// 이 대상·이 주에 이미 세트가 있는가. 있으면 그 세트를 돌려준다.
// exceptId는 수정 중인 자기 자신 — 자기와 부딪혔다고 막으면 안 된다.
export function findConflictingSet(sets = [], { category, group, weekStart, exceptId = null }) {
  if (!group) return null
  return sets.find((s) =>
    s.id !== exceptId
    && s.category === category
    && s.weekStart === weekStart
    && setInGroup(s, group)
  ) ?? null
}

// 스토리지에서 정말 지워도 되는 해설 파일만 골라낸다.
// 다른 요일(복제본 포함)이 아직 그 주소를 쓰고 있으면 남긴다 —
// 파일을 지우면 그쪽 화면의 링크가 소리 없이 깨진다.
export function urlsSafeToDelete(urls = [], allDays = [], ownDayIds = []) {
  const own = new Set(ownDayIds)
  const stillUsed = new Set(
    allDays
      .filter((d) => !own.has(d.id))
      .map((d) => d.daySolutionFileUrl)
      .filter(Boolean)
  )
  return [...new Set(urls)].filter((url) => url && !stillUsed.has(url))
}
