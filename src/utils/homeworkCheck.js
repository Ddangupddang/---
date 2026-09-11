// src/utils/homeworkCheck.js
// 제출 전 "확인"의 결과를 만든다.
//
// 채점 자체는 gradeHomework가 이미 한다. 여기서는 그 결과에서
// 학생에게 보여줄 것만 남긴다 — 틀린 번호까지. 정답은 버린다.
// 정답을 화면까지 내려보내면 개발자 도구로 들여다볼 수 있다.
import { gradeHomework } from './homework.js'

// 확인 화면이 필요로 하는 것 전부
export function checkSummary(questions, answers) {
  const { results, correctCount, total } = gradeHomework(questions, answers)
  return {
    correctCount,
    total,
    wrongNumbers: results.filter((r) => !r.correct).map((r) => r.number),
  }
}
