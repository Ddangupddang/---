// api/notify-qna.test.js
import { describe, it, expect } from 'vitest'
import {
  notifyTargets, qnaNotification, isDeadSubscription,
  isAuthorizedWebhook, endpointsToRemove,
} from './notify-qna.js'

// 인자는 전부 DB 행 모양(snake_case)이다 — 웹훅 payload를 변환 없이 그대로 넘긴다
const STUDENTS = [
  { id: 1, name: '홍길동', class_id: 10 },
  { id: 2, name: '김철수', class_id: 20 },
  { id: 3, name: '이영희', class_id: null },   // 반 미배정
]
const CLASSES = [
  { id: 10, teacher_id: 't1' },
  { id: 20, teacher_id: null },                // 담당 교사 없음
]
const ADMINS = [{ id: 'a1' }, { id: 'a2' }]

describe('notifyTargets', () => {
  it('담당 교사에게만 보낸다', () => {
    expect(notifyTargets({ student_id: 1 }, STUDENTS, CLASSES, ADMINS)).toEqual(['t1'])
  })

  it('반이 배정되지 않은 학생의 질문은 관리자 전원에게 간다', () => {
    expect(notifyTargets({ student_id: 3 }, STUDENTS, CLASSES, ADMINS)).toEqual(['a1', 'a2'])
  })

  it('반에 담당 교사가 없으면 관리자 전원에게 간다', () => {
    expect(notifyTargets({ student_id: 2 }, STUDENTS, CLASSES, ADMINS)).toEqual(['a1', 'a2'])
  })

  it('명부에 없는 학생이어도 알림이 사라지지 않는다', () => {
    // 계정과 명부가 어긋난 적이 있다. 그때 질문이 조용히 묻히면 안 된다.
    expect(notifyTargets({ student_id: 999 }, STUDENTS, CLASSES, ADMINS)).toEqual(['a1', 'a2'])
  })

  it('관리자가 없으면 빈 배열을 준다', () => {
    expect(notifyTargets({ student_id: 3 }, STUDENTS, CLASSES, [])).toEqual([])
  })
})

describe('qnaNotification', () => {
  it('이름과 말머리까지만 담는다', () => {
    const got = qnaNotification(STUDENTS[0], { category: 'naesin', content: '3번 문제 답이 왜 이렇게 되나요' })
    expect(got.title).toBe('새 질문')
    expect(got.body).toBe('홍길동 · 내신과제')
  })

  it('질문 내용은 넣지 않는다', () => {
    // 알림은 잠금화면에 그대로 뜬다. 카페·지하철에서 옆 사람이 읽으면 안 된다.
    const got = qnaNotification(STUDENTS[0], { category: 'test', content: '비밀스러운질문내용' })
    expect(JSON.stringify(got)).not.toContain('비밀스러운질문내용')
  })

  it('학생을 못 찾아도 문구를 만든다', () => {
    expect(qnaNotification(undefined, { category: 'etc' }).body).toBe('학생 · 기타')
  })
})

describe('isDeadSubscription', () => {
  it('404와 410은 죽은 구독이다', () => {
    expect(isDeadSubscription(404)).toBe(true)
    expect(isDeadSubscription(410)).toBe(true)
  })

  it('일시적인 실패는 죽은 구독이 아니다', () => {
    // 500은 잠시 후 되살아난다. 지우면 교사가 다시 켜야 한다.
    expect(isDeadSubscription(500)).toBe(false)
    expect(isDeadSubscription(429)).toBe(false)
    expect(isDeadSubscription(undefined)).toBe(false)
  })
})

describe('isAuthorizedWebhook', () => {
  it('비밀값이 맞으면 통과시킨다', () => {
    expect(isAuthorizedWebhook({ 'x-webhook-secret': 'S3CRET' }, 'S3CRET')).toBe(true)
  })

  it('비밀값이 틀리거나 없으면 막는다', () => {
    expect(isAuthorizedWebhook({ 'x-webhook-secret': 'nope' }, 'S3CRET')).toBe(false)
    expect(isAuthorizedWebhook({}, 'S3CRET')).toBe(false)
  })

  it('서버에 비밀값을 설정하지 않았으면 아무도 통과시키지 않는다', () => {
    // 설정 전에는 누구나 알림을 쏘는 것보다 아무도 못 쏘는 편이 안전하다
    expect(isAuthorizedWebhook({ 'x-webhook-secret': 'anything' }, undefined)).toBe(false)
    expect(isAuthorizedWebhook({ 'x-webhook-secret': '' }, '')).toBe(false)
  })
})

describe('endpointsToRemove', () => {
  it('죽은 구독만 골라낸다', () => {
    expect(endpointsToRemove([
      { endpoint: 'https://a', statusCode: 410 },
      { endpoint: 'https://b' },                   // 성공
      { endpoint: 'https://c', statusCode: 500 },  // 잠시 실패 — 살려둔다
      { endpoint: 'https://d', statusCode: 404 },
    ])).toEqual(['https://a', 'https://d'])
  })

  it('전부 성공하면 지울 게 없다', () => {
    expect(endpointsToRemove([{ endpoint: 'https://a' }])).toEqual([])
    expect(endpointsToRemove([])).toEqual([])
  })
})
