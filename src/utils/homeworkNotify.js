// src/utils/homeworkNotify.js
// 과제 알림을 "누구에게, 무슨 문구로" 보낼지 정하는 순수 함수.
// DB·네트워크에 손대지 않아 테스트할 수 있다 (api/notify-qna.js와 같은 방식).
//
// 인자는 전부 DB 행 모양(snake_case)이다 — api가 웹훅 payload나 조회 결과를
// 변환 없이 그대로 넘긴다.
// api/에서 이 파일을 부른다. Vercel의 함수는 Node ESM으로 도는데 Node는
// 확장자 없는 상대 경로를 못 찾는다(Vite는 찾아준다). 그래서 여기서 시작해
// 딸려 들어가는 파일까지 .js를 붙여 둔다 — 빼면 배포한 뒤에야 터진다.
import { matchesStudent } from './homeworkSelect.js'
import { CATEGORY_LABELS, WEEKDAY_LABELS } from '../constants/homework.js'

// 누가 이 과제를 받는지 정하는 규칙(반/정시레벨/예전 학년)은 학생 화면과 같아야 한다.
// 규칙을 여기 다시 쓰면 언젠가 어긋나므로 homeworkSelect의 판정을 그대로 쓰고,
// 행 모양만 맞춰 준다.
const asSet     = (r) => ({ category: r.category, classId: r.class_id ?? null, target: r.target ?? null })
const asStudent = (r) => ({ classId: r.class_id ?? null, grade: r.grade ?? null, jeongsiLevel: r.jeongsi_level ?? null })

// 이 세트를 받는 학생들의 students.id
export function homeworkStudentIds(setRow, studentRows = []) {
  if (!setRow) return []
  const set = asSet(setRow)
  return studentRows.filter((s) => matchesStudent(set, asStudent(s))).map((s) => s.id)
}

// 잠금화면에 그대로 뜨는 내용이다. 문항이나 정답은 절대 넣지 않는다.
export function newHomeworkNotification(setRow) {
  return {
    title: '새 과제',
    body: `${CATEGORY_LABELS[setRow?.category] ?? '과제'} · ${setRow?.title ?? ''}`.trim(),
  }
}

// 교사에게 가는 제출 알림. 점수는 넣지 않는다 —
// 잠금화면에 다른 사람이 볼 수 있고, 어차피 앱에서 봐야 한다.
export function submissionNotification(studentRow, dayRow) {
  const wd = WEEKDAY_LABELS[dayRow?.weekday]
  return {
    title: '과제 제출',
    body: `${studentRow?.name ?? '학생'}${wd ? ` · ${wd}요일 과제` : ''}`,
  }
}

// 제출 알림을 받을 사람 = 그 과제를 낸 교사.
// 출제자를 못 찾으면 관리자에게 넘긴다 — 알림을 버리면 아무도 모른 채 묻힌다.
export function submissionTargets(setRow, admins = []) {
  if (setRow?.teacher_id) return [setRow.teacher_id]
  return admins.map((a) => a.id)
}
