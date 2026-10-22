import { describe, it, expect, vi } from 'vitest'
import {
  clinicEvent, clinicStaffTargets, clinicNotification, handleClinicWebhook,
} from './clinicNotify'

const row = (over = {}) => ({ id: 1, student_id: 7, status: 'pending', ...over })

describe('clinicEvent', () => {
  it('새 신청이면 requested', () => {
    expect(clinicEvent({ type: 'INSERT', record: row() })).toBe('requested')
  })
  it('대기 → 수락·거절이면 그 상태', () => {
    expect(clinicEvent({ type: 'UPDATE', record: row({ status: 'accepted' }), old_record: row() })).toBe('accepted')
    expect(clinicEvent({ type: 'UPDATE', record: row({ status: 'rejected' }), old_record: row() })).toBe('rejected')
  })
  it('이미 처리된 신청을 다시 고친 것은 보내지 않는다', () => {
    expect(clinicEvent({
      type: 'UPDATE', record: row({ status: 'accepted' }), old_record: row({ status: 'accepted' }),
    })).toBeNull()
  })
  it('old_record가 없으면 대기였다고 본다', () => {
    expect(clinicEvent({ type: 'UPDATE', record: row({ status: 'accepted' }) })).toBe('accepted')
  })
  it('지우기·빈 payload는 보내지 않는다', () => {
    expect(clinicEvent({ type: 'DELETE', record: null, old_record: row() })).toBeNull()
    expect(clinicEvent(undefined)).toBeNull()
  })
})

describe('clinicStaffTargets', () => {
  it('담당 교사 + 관리자, 겹치면 한 번만', () => {
    expect(clinicStaffTargets('t1', [{ id: 'a1' }, { id: 't1' }])).toEqual(['t1', 'a1'])
  })
  it('담당 교사가 없어도 관리자에게는 간다', () => {
    expect(clinicStaffTargets(null, [{ id: 'a1' }])).toEqual(['a1'])
  })
})

describe('clinicNotification', () => {
  it('교사 알림에 신청 내용은 넣지 않는다', () => {
    const n = clinicNotification('requested', { name: '홍길동' }, row({ content: '비문학 어려워요' }))
    expect(n.body).toContain('홍길동')
    expect(n.body).not.toContain('비문학')
  })
  it('확정 알림에는 일정이 들어간다', () => {
    expect(clinicNotification('accepted', null, row({ schedule_text: '10/25(토) 3시' })).body)
      .toBe('10/25(토) 3시')
  })
  it('거절 알림에 이유는 넣지 않는다', () => {
    expect(clinicNotification('rejected', null, row({ reject_reason: '자리 없음' })).body)
      .not.toContain('자리 없음')
  })
})

// 표마다 정해진 답을 돌려주는 가짜 Supabase
function fakeAdmin(tables) {
  const deleted = []
  const from = (name) => {
    const q = {
      select: () => q, eq: () => q, in: () => q,
      maybeSingle: () => Promise.resolve({ data: tables[name] }),
      then: (ok) => Promise.resolve({ data: tables[name] }).then(ok),
      delete: () => ({ in: (_c, v) => { deleted.push(...v); return Promise.resolve({}) } }),
    }
    return q
  }
  return { from, deleted }
}

describe('handleClinicWebhook', () => {
  it('새 신청이면 담당 교사·관리자 기기로 보낸다', async () => {
    const admin = fakeAdmin({
      students: { id: 7, name: '홍길동', class_id: 10 },
      profiles: [{ id: 'a1' }],
      classes: { teacher_id: 't1' },
      push_subscriptions: [{ endpoint: 'e1', p256dh: 'p', auth: 'a' }],
    })
    const webpush = { sendNotification: vi.fn().mockResolvedValue({}) }
    const res = await handleClinicWebhook({ admin, webpush, body: { type: 'INSERT', record: row() } })
    expect(res.sent).toBe(1)
    const payload = JSON.parse(webpush.sendNotification.mock.calls[0][1])
    expect(payload).toMatchObject({ title: '클리닉 신청', url: '/clinic' })
  })

  it('보낼 일이 아니면 아무것도 안 한다', async () => {
    const webpush = { sendNotification: vi.fn() }
    const res = await handleClinicWebhook({ admin: fakeAdmin({}), webpush, body: { type: 'DELETE' } })
    expect(res.sent).toBe(0)
    expect(webpush.sendNotification).not.toHaveBeenCalled()
  })
})
