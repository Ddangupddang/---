// src/data/users.js
// 로그인 테스트 계정 (실제 서비스에선 Supabase로 대체)
// studentId: students.js의 id와 연결 (학생 역할에만 존재)
export const users = [
  { id: 1, name: '관리자', username: 'admin',    password: '1234', role: 'admin' },
  { id: 2, name: '김선생', username: 'teacher1', password: '1234', role: 'teacher' },
  { id: 3, name: '이선생', username: 'teacher2', password: '1234', role: 'teacher' },
  { id: 4, name: '홍길동', username: 'student1', password: '1234', role: 'student', classId: 1, studentId: 1 },
  { id: 5, name: '김철수', username: 'student2', password: '1234', role: 'student', classId: 1, studentId: 2 },
  { id: 6, name: '이영희', username: 'student3', password: '1234', role: 'student', classId: 2, studentId: 4 },
]
