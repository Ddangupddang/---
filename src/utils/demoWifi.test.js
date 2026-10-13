import { describe, it, expect } from 'vitest'
import { isDemoWifi } from './demoWifi'

const DEMO = 'https://zlvubufzbdhwvdtpomlz.supabase.co'
const PROD = 'https://pbihnyojlwibiuahtyzx.supabase.co'

describe('isDemoWifi', () => {
  it('데모 DB + 켬 → 켜진다', () => {
    expect(isDemoWifi({ VITE_DEMO_WIFI: 'on', VITE_SUPABASE_URL: DEMO })).toBe(true)
  })

  it('운영 DB 면 켜 둬도 꺼진다 — 학원에서 아무나 출석되면 안 된다', () => {
    expect(isDemoWifi({ VITE_DEMO_WIFI: 'on', VITE_SUPABASE_URL: PROD })).toBe(false)
  })

  it('켜지 않았으면 데모 DB 여도 꺼진다', () => {
    expect(isDemoWifi({ VITE_SUPABASE_URL: DEMO })).toBe(false)
    expect(isDemoWifi({ VITE_DEMO_WIFI: 'true', VITE_SUPABASE_URL: DEMO })).toBe(false)
  })
})
