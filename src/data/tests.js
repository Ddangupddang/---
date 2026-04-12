// src/data/tests.js
// 주간 테스트 Mock 데이터
// status: 'ready'(준비중) | 'active'(진행중) | 'closed'(종료)
// questions[].type: 'mc'(객관식) | 'sa'(주관식)
export const tests = [
  {
    id: 1,
    title: '4월 2주차 독서 테스트',
    classId: 1,
    teacherId: 2,
    date: '2026-04-12',
    timeLimit: 30,
    status: 'closed',
    startedAt: '2026-04-12T14:00:00',
    questions: [
      { id: 1, type: 'mc', content: '1번', choices: ['①', '②', '③', '④', '⑤'], answer: '③', points: 10 },
      { id: 2, type: 'mc', content: '2번', choices: ['①', '②', '③', '④', '⑤'], answer: '①', points: 10 },
      { id: 3, type: 'sa', content: '3번 (서술형)', choices: null, answer: null, points: 20 },
    ],
  },
  {
    id: 2,
    title: '4월 2주차 문학 테스트',
    classId: 2,
    teacherId: 2,
    date: '2026-04-12',
    timeLimit: 25,
    status: 'ready',
    startedAt: null,
    questions: [
      { id: 1, type: 'mc', content: '1번', choices: ['①', '②', '③', '④', '⑤'], answer: '②', points: 15 },
      { id: 2, type: 'mc', content: '2번', choices: ['①', '②', '③', '④', '⑤'], answer: '④', points: 15 },
      { id: 3, type: 'sa', content: '서술형 1번', choices: null, answer: null, points: 30 },
    ],
  },
  {
    id: 3,
    title: '4월 1주차 어휘 테스트',
    classId: 3,
    teacherId: 3,
    date: '2026-04-07',
    timeLimit: 20,
    status: 'closed',
    startedAt: '2026-04-07T15:00:00',
    questions: [
      { id: 1, type: 'mc', content: '1번', choices: ['①', '②', '③', '④', '⑤'], answer: '⑤', points: 20 },
      { id: 2, type: 'mc', content: '2번', choices: ['①', '②', '③', '④', '⑤'], answer: '②', points: 20 },
    ],
  },
]
