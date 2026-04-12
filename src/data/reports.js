// src/data/reports.js
// 진도 리포트 Mock 데이터
// classId: classes.js의 id
// studentChecks: 학생별 과제 수행 여부 (studentId: students.js의 id)
// createdBy: users.js의 id (교사)
export const reports = [
  {
    id: 1,
    classId: 1,
    date: '2026-04-12',
    subject: '독서',
    content: '현대소설 단원 3과 완료. 인물의 심리 묘사와 서술자 시점 분석 중심으로 수업 진행. 다음 시간 4과 예정.',
    homework: '3과 지문 복습 + 어휘 20개 암기 (교재 p.38 어휘 목록)',
    studentChecks: [
      { studentId: 1, done: true },
      { studentId: 2, done: false },
      { studentId: 3, done: true },
    ],
    createdBy: 2,
  },
  {
    id: 2,
    classId: 1,
    date: '2026-04-07',
    subject: '독서',
    content: '현대소설 단원 2과 완료. 외적 준거 적용 문제 유형 집중 학습.',
    homework: '2과 복습 문제 풀기 (교재 p.30~35)',
    studentChecks: [
      { studentId: 1, done: true },
      { studentId: 2, done: true },
      { studentId: 3, done: false },
    ],
    createdBy: 2,
  },
  {
    id: 3,
    classId: 2,
    date: '2026-04-12',
    subject: '문학',
    content: '고전시가 단원 마무리. 시조와 가사의 형식적 특징 정리.',
    homework: '고전시가 핵심 작품 5편 암기',
    studentChecks: [
      { studentId: 4, done: true },
      { studentId: 5, done: true },
    ],
    createdBy: 2,
  },
]
