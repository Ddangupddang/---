// api/notify-homework.test.js
import { describe, it, expect } from 'vitest'
import { isAuthorizedCron } from './notify-homework.js'

describe('isAuthorizedCron — 월요일 정기 발송 입구', () => {
  it('Vercel이 보낸 비밀값이 맞으면 통과', () => {
    expect(isAuthorizedCron({ authorization: 'Bearer s3cret' }, 's3cret')).toBe(true)
  })
  it('값이 다르거나 없으면 막는다', () => {
    expect(isAuthorizedCron({ authorization: 'Bearer nope' }, 's3cret')).toBe(false)
    expect(isAuthorizedCron({}, 's3cret')).toBe(false)
  })
  it('서버에 CRON_SECRET이 없으면 아무도 통과시키지 않는다', () => {
    expect(isAuthorizedCron({ authorization: 'Bearer undefined' }, undefined)).toBe(false)
    expect(isAuthorizedCron({ authorization: 'Bearer ' }, '')).toBe(false)
  })
})
