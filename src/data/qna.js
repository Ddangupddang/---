// src/data/qna.js
// Q&A 질문/답변 Mock 데이터
// category: 말머리 (constants/qna.js)
// studentId: students.js의 id
// answeredBy: users.js의 id (교사/관리자)
export const qnaQuestions = [
  {
    id: 1,
    category: 'test',
    studentId: 1,
    content: '1번 문제에서 왜 ③번이 정답인가요? 저는 ②번인 줄 알았어요.',
    createdAt: '2026-04-12T15:30:00',
    answer: '지문 2단락 첫 번째 문장을 보면 "전환의 계기"라는 표현이 있는데, 이것이 ③번 선택지의 핵심 근거입니다. ②번은 내용은 맞지만 지문에서 직접 언급되지 않은 추론이라 오답입니다.',
    answeredAt: '2026-04-12T16:10:00',
    answeredBy: 2,
  },
  {
    id: 2,
    category: 'test',
    studentId: 2,
    content: '서술형 3번 채점 기준이 어떻게 되나요? 부분점수가 있나요?',
    createdAt: '2026-04-12T16:00:00',
    answer: null,
    answeredAt: null,
    answeredBy: null,
  },
  {
    id: 3,
    category: 'etc',
    studentId: 1,
    content: '이번 테스트 전체 평균이 어떻게 되나요?',
    createdAt: '2026-04-12T17:00:00',
    answer: null,
    answeredAt: null,
    answeredBy: null,
  },
]
