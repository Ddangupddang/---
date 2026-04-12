// src/data/notices.js
// 공지사항 Mock 데이터
// authorId: users.js의 id (교사/관리자)
// targetClassIds: classes.js의 id 배열 (비어있으면 전체)
// kakaoSent: 카카오톡 알림톡 전송 여부
export const notices = [
  {
    id: 1,
    title: '4월 2주차 진도 안내',
    content: '안녕하세요. 이번 주부터 화법과 작문 단원으로 넘어갑니다.\n\n수업 전까지 교재 p.45~60 예습 부탁드립니다.\n\n질문 있으시면 Q&A 게시판을 이용해 주세요.',
    authorId: 2,
    targetClassIds: [1, 2, 3],
    createdAt: '2026-04-10T09:00:00',
    kakaoSent: true,
  },
  {
    id: 2,
    title: '4월 14일(화) 휴원 안내',
    content: '4월 14일(화)은 교사 연수로 인해 휴원합니다.\n\n보강 일정은 추후 별도 안내 드리겠습니다.\n\n감사합니다.',
    authorId: 1,
    targetClassIds: [1, 2, 3],
    createdAt: '2026-04-11T10:00:00',
    kakaoSent: true,
  },
  {
    id: 3,
    title: '중등 1반 추가 자료 안내',
    content: '이번 주 수업에 사용할 추가 프린트물을 다음 수업 시간에 배부하겠습니다.\n\n미리 교재 예제 문제를 풀어오면 수업에 도움이 됩니다.',
    authorId: 2,
    targetClassIds: [1],
    createdAt: '2026-04-12T14:00:00',
    kakaoSent: false,
  },
]
