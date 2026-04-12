// src/data/submissions.js
// 학생 제출 답안 및 채점 결과 Mock 데이터
// scores 배열이 비어있으면 미채점 상태
export const submissions = [
  {
    id: 1,
    testId: 1,
    studentId: 1,
    submittedAt: '2026-04-12T14:22:00',
    answers: [
      { questionId: 1, answer: '③' },
      { questionId: 2, answer: '②' },
      { questionId: 3, answer: '현대시의 주요 특징은 이미지와 리듬의 결합입니다.' },
    ],
    scores: [
      { questionId: 1, score: 10 },
      { questionId: 2, score: 0 },
      { questionId: 3, score: 15 },
    ],
  },
  {
    id: 2,
    testId: 1,
    studentId: 2,
    submittedAt: '2026-04-12T14:28:00',
    answers: [
      { questionId: 1, answer: '③' },
      { questionId: 2, answer: '①' },
      { questionId: 3, answer: '이미지와 감정 표현을 통해 독자에게 전달합니다.' },
    ],
    scores: [
      { questionId: 1, score: 10 },
      { questionId: 2, score: 10 },
      { questionId: 3, score: 18 },
    ],
  },
  {
    id: 3,
    testId: 1,
    studentId: 3,
    submittedAt: '2026-04-12T14:29:55',
    answers: [
      { questionId: 1, answer: '①' },
      { questionId: 2, answer: '①' },
      { questionId: 3, answer: '' },
    ],
    scores: [],
  },
]
