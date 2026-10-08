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

// 제출 알림을 받을 사람 = 출제자 + 그 학생 반 담당 교사 + 관리자 전원 (Q&A 알림과 같은 규칙).
//
// 예전에는 출제자 한 명에게만 갔다. 원장님은 관리자·민상용 두 계정을 한 폰에서 쓰는데,
// 웹 푸시 주소는 기기당 하나라 폰이 쥔 주소가 출제자(관리자) 계정 것이 아니면
// 과제 제출 알림만 끊겼다 — Q&A는 담당 교사에게도 가서 계속 왔다(2026-10-08).
// 출제자·담당 교사를 몰라도 관리자에게는 간다. 알림을 버리면 아무도 모른 채 묻힌다.
export function submissionTargets(setRow, admins = [], classTeacherId = null) {
  // 한 사람이 출제자·담당 교사·관리자를 겸하면 여러 번 담기므로 한 번만 남긴다
  return [...new Set([
    ...(setRow?.teacher_id ? [setRow.teacher_id] : []),
    ...(classTeacherId ? [classTeacherId] : []),
    ...admins.map((a) => a.id),
  ])]
}
