// src/utils/homeworkStats.js
// 교사용 문항별 집계. 학생 개인 점수보다 "반 전체가 틀린 문항"이
// 다음 수업에서 무엇을 다시 다룰지 정하는 데 쓰인다.

// questions: [{ number, answer }] / submissions: [{ answers: [{ number, answer }] }]
export function questionStats(questions, submissions) {
  return questions.map((q) => {
    let correct = 0
    let blank = 0
    const wrongPicks = new Map()   // 오답 선지 → 고른 인원

    for (const sub of submissions) {
      const picked = (sub.answers ?? []).find((a) => a.number === q.number)?.answer
      if (picked == null || picked === '') { blank++; continue }
      if (picked === q.answer) { correct++; continue }
      wrongPicks.set(picked, (wrongPicks.get(picked) ?? 0) + 1)
    }

    const wrong = [...wrongPicks.values()].reduce((sum, n) => sum + n, 0)
    const answered = correct + wrong

    // 오답이 어느 선지에 몰렸는지 — 국어에서는 무엇을 헷갈렸는지의 단서가 된다.
    // 같은 수면 먼저 나온 선지를 쓴다(Map은 넣은 순서를 지킨다).
    let topWrong = null
    for (const [choice, count] of wrongPicks) {
      if (!topWrong || count > topWrong.count) topWrong = { choice, count }
    }

    return {
      number: q.number,
      answer: q.answer,
      correct,
      wrong,
      blank,
      // 답을 낸 학생만 분모로 삼는다 — 문항이 어려웠는지를 보려는 것이므로
      // 출제 후 문항을 늘려 생긴 무응답이 난이도를 왜곡하면 안 된다.
      wrongRate: answered === 0 ? null : Math.round((wrong / answered) * 100),
      topWrong,
    }
  })
}
