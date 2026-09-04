// api/notify-qna-message.test.js
import { describe, it, expect } from 'vitest'
import { shouldNotifyMessage, messageNotification } from './notify-qna-message.js'

describe('shouldNotifyMessage', () => {
  it('학생이 쓴 글이면 보낸다', () => {
    expect(shouldNotifyMessage({ author_role: 'student', qna_id: 1 })).toBe(true)
  })

  it('교사가 쓴 글에는 보내지 않는다', () => {
    // 받을 학생 구독이 없다. 알림 켜기는 교사·관리자에게만 있다.
    expect(shouldNotifyMessage({ author_role: 'teacher', qna_id: 1 })).toBe(false)
  })

  it('질문 정보가 없으면 보내지 않는다', () => {
    expect(shouldNotifyMessage({ author_role: 'student' })).toBe(false)
    expect(shouldNotifyMessage(null)).toBe(false)
  })
})

describe('messageNotification', () => {
  it('이름과 "추가 질문"까지만 담는다', () => {
    const got = messageNotification({ id: 1, name: '홍길동' })
    expect(got.title).toBe('새 질문')
    expect(got.body).toBe('홍길동 · 추가 질문')
  })

  it('학생을 못 찾아도 문구를 만든다', () => {
    expect(messageNotification(undefined).body).toBe('학생 · 추가 질문')
  })
})
