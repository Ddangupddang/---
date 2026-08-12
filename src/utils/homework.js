// src/utils/homework.js
// 과제 채점·지각 판정 순수 함수 (DB·UI 의존성 없음)

// 학생 답안을 정답표와 비교해 문항별 정답 여부와 정답 개수를 계산한다.
// questions: [{ number, answer }]  /  answers: [{ number, answer }]
export function gradeHomework(questions, answers) {
  const answerMap = Object.fromEntries((answers ?? []).map((a) => [a.number, a.answer]))
  const results = questions.map((q) => {
    const studentAnswer = answerMap[q.number] ?? null
    return {
      number: q.number,
      correct: studentAnswer === q.answer,
      studentAnswer,
    }
  })
  return {
    results,
    correctCount: results.filter((r) => r.correct).length,
    total: questions.length,
  }
}

// 해설 파일 공개 URL에서 사람이 읽을 파일명만 뽑는다.
// 업로드할 때 이름 앞에 `<타임스탬프>_`를 붙이므로 그 부분은 떼어낸다.
export function solutionFileName(url) {
  if (!url) return ''
  const last = decodeURIComponent(String(url).split('?')[0].split('/').pop() || '')
  return last.replace(/^\d+_/, '')
}

// 제출 시각(ISO 문자열)이 마감일(YYYY-MM-DD)보다 늦으면 지각 제출이다.
export function isLateSubmission(submittedAt, dueDate) {
  if (!submittedAt || !dueDate) return false
  return submittedAt.slice(0, 10) > dueDate
}
