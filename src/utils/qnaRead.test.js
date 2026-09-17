// src/utils/qnaRead.test.js
import { describe, it, expect } from 'vitest'
import { qnaReadState, isMessageRead } from './qnaRead'

const Q = { id: 5, studentId: 100 }

const teacher = (at) => ({ qnaId: 5, authorRole: 'teacher', createdAt: at })
const student = (at) => ({ qnaId: 5, authorRole: 'student', createdAt: at })
const read    = (at, studentId = 100, qnaId = 5) => ({ qnaId, studentId, readAt: at })

describe('qnaReadState', () => {
  it('교사 답변이 없으면 표시할 것이 없다', () => {
    expect(qnaReadState(Q, [student('2026-09-17T01:00:00Z')], [])).toBe('none')
  })

  it('읽은 기록이 없으면 안 읽음', () => {
    expect(qnaReadState(Q, [teacher('2026-09-17T01:00:00Z')], [])).toBe('unread')
  })

  it('답변보다 나중에 읽었으면 읽음', () => {
    const state = qnaReadState(Q, [teacher('2026-09-17T01:00:00Z')], [read('2026-09-17T02:00:00Z')])
    expect(state).toBe('read')
  })

  it('답변보다 먼저 읽었으면 안 읽음', () => {
    const state = qnaReadState(Q, [teacher('2026-09-17T03:00:00Z')], [read('2026-09-17T02:00:00Z')])
    expect(state).toBe('unread')
  })

  it('읽은 뒤에 교사가 또 답하면 다시 안 읽음이 된다', () => {
    const messages = [teacher('2026-09-17T01:00:00Z'), teacher('2026-09-17T05:00:00Z')]
    expect(qnaReadState(Q, messages, [read('2026-09-17T02:00:00Z')])).toBe('unread')
  })

  it('다른 질문의 읽은 기록은 세지 않는다', () => {
    const state = qnaReadState(Q, [teacher('2026-09-17T01:00:00Z')], [read('2026-09-17T09:00:00Z', 100, 999)])
    expect(state).toBe('unread')
  })

  it('다른 학생의 읽은 기록은 세지 않는다', () => {
    const state = qnaReadState(Q, [teacher('2026-09-17T01:00:00Z')], [read('2026-09-17T09:00:00Z', 777)])
    expect(state).toBe('unread')
  })

  it('다른 질문의 교사 답변에 끌려가지 않는다', () => {
    const messages = [{ qnaId: 999, authorRole: 'teacher', createdAt: '2026-09-17T09:00:00Z' }]
    expect(qnaReadState(Q, messages, [])).toBe('none')
  })

  it('시간대 표기가 달라도 시각으로 비교한다', () => {
    // 같은 순간을 +09:00과 Z로 적은 것 — 글자로 비교하면 뒤집힌다
    const state = qnaReadState(Q, [teacher('2026-09-17T10:00:00+09:00')], [read('2026-09-17T02:00:00Z')])
    expect(state).toBe('read')
  })
})

describe('isMessageRead', () => {
  it('그 글보다 나중에 읽었으면 읽음', () => {
    expect(isMessageRead(teacher('2026-09-17T01:00:00Z'), Q, [read('2026-09-17T02:00:00Z')])).toBe(true)
  })

  it('그 글보다 먼저 읽었으면 안 읽음', () => {
    expect(isMessageRead(teacher('2026-09-17T03:00:00Z'), Q, [read('2026-09-17T02:00:00Z')])).toBe(false)
  })

  it('읽은 기록이 없으면 안 읽음', () => {
    expect(isMessageRead(teacher('2026-09-17T03:00:00Z'), Q, [])).toBe(false)
  })
})
