// api/notify-qna-message.test.js
import { describe, it, expect } from 'vitest'
import { messageAudience, messageNotification, answerNotification } from './notify-qna-message.js'

describe('messageAudience', () => {
  it('학생이 쓴 글은 담당 교사에게 간다', () => {
    expect(messageAudience({ author_role: 'student', qna_id: 1 })).toBe('teacher')
  })

  it('교사가 쓴 글은 질문한 학생에게 간다', () => {
    expect(messageAudience({ author_role: 'teacher', qna_id: 1 })).toBe('student')
  })

  it('질문 정보가 없으면 아무에게도 안 보낸다', () => {
    expect(messageAudience({ author_role: 'student' })).toBeNull()
    expect(messageAudience(null)).toBeNull()
  })

  it('모르는 역할이면 안 보낸다', () => {
    expect(messageAudience({ author_role: 'admin', qna_id: 1 })).toBeNull()
  })
})

describe('messageNotification (교사에게)', () => {
  it('이름과 "추가 질문"까지만 담는다', () => {
    const got = messageNotification({ id: 1, name: '홍길동' })
    expect(got.title).toBe('새 질문')
    expect(got.body).toBe('홍길동 · 추가 질문')
  })

  it('학생을 못 찾아도 문구를 만든다', () => {
    expect(messageNotification(undefined).body).toBe('학생 · 추가 질문')
  })
})

describe('answerNotification (학생에게)', () => {
  it('말머리까지만 담는다', () => {
    const got = answerNotification({ category: 'naesin' })
    expect(got.title).toBe('새 답변')
    expect(got.body).toBe('선생님 답변 · 내신과제')
  })

  it('답변 내용은 넣지 않는다', () => {
    // 학생 폰 잠금화면에 그대로 뜬다
    const got = answerNotification({ category: 'test', answer: '비밀스러운답변내용' })
    expect(JSON.stringify(got)).not.toContain('비밀스러운답변내용')
  })

  it('말머리를 모르면 기본값으로 채운다', () => {
    expect(answerNotification({}).body).toBe('선생님 답변 · 테스트')
  })
})
