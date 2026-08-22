// src/utils/homeworkGroup.js
// 과제를 누구에게 낼지 묶는 단위 = "그룹".
//   내신 — 반 (반마다 진도가 달라 과제도 반별로 나간다)
//   정시 — 레벨 (반과 무관하게 수준으로 묶는다)
//
// 출제·제출 현황·리포트 세 화면이 같은 목록을 그려야 해서 여기 모아둔다.
import {
  HW_CATEGORY, JEONGSI_LEVELS, JEONGSI_LEVEL_LABELS, GRADE_LABELS,
} from '../constants/homework'

// 화면에 그릴 그룹 목록. 내신은 넘겨받은 반 목록을 그대로 쓴다
// (교사에게는 담당 반만 넘어온다).
export function homeworkGroups(category, classes = []) {
  if (category === HW_CATEGORY.NAESIN) {
    return classes.map((c) => ({
      key: `class-${c.id}`, label: c.name, classId: c.id, target: null,
    }))
  }
  return JEONGSI_LEVELS.map((t) => ({
    key: `level-${t}`, label: JEONGSI_LEVEL_LABELS[t], classId: null, target: t,
  }))
}

// 이 세트가 그 그룹의 것인가.
// 반별로 바꾸기 전에 만든 내신 세트는 class_id가 비어 있고 target에 학년이 들어 있다.
// 그런 세트는 어느 반 그룹에도 속하지 않는다 — 학생 화면에서는 계속 보이지만
// 교사의 반 탭에는 나타나지 않는다.
export function setInGroup(set, group) {
  if (!set || !group) return false
  if (group.classId != null) return set.classId === group.classId
  return set.classId == null && set.target === group.target
}

// 이 학생이 그 그룹에 속하는가
export function studentInGroup(student, group) {
  if (!student || !group) return false
  if (group.classId != null) return student.classId === group.classId
  return student.jeongsiLevel != null && student.jeongsiLevel === group.target
}

// 목록에서 세트 옆에 붙일 대상 이름. 반 이름을 찾을 수 있으면 반 이름,
// 예전 학년 세트면 학년, 정시면 레벨.
export function setTargetLabel(set, classes = []) {
  if (!set) return ''
  if (set.classId != null) {
    return classes.find((c) => c.id === set.classId)?.name ?? '삭제된 반'
  }
  if (set.category === HW_CATEGORY.NAESIN) return GRADE_LABELS[set.target] ?? ''
  return JEONGSI_LEVEL_LABELS[set.target] ?? ''
}
