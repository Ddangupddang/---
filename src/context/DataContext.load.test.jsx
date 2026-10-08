// src/context/DataContext.load.test.jsx
// 데이터를 "언제" 불러오는지 확인한다.
// 앱을 열 때 한 번만 불러오면, 로그인 화면에서 연 기기는 로그인 뒤에도 빈 목록이 남는다
// (2026-10-08 이재빈 학생: DB는 테스트 5건을 주는데 앱에는 하나도 안 떴다).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { AuthContext } from './AuthContext'

// 어떤 질의든 빈 결과로 끝나는 가짜 질의 사슬 — .select().order()... 를 몇 번 이어도 된다
const { fromSpy } = vi.hoisted(() => {
  const chain = () => new Proxy(() => {}, {
    get(_, key) {
      if (key === 'then') return (resolve) => resolve({ data: [], error: null })
      return () => chain()
    },
    apply() { return chain() },
  })
  return { fromSpy: vi.fn(() => chain()) }
})

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: fromSpy,
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    storage: { from: () => ({}) },
  },
}))

const { DataProvider } = await import('./DataContext')

function renderAs(user) {
  return render(
    <AuthContext.Provider value={{ user }}>
      <DataProvider><div /></DataProvider>
    </AuthContext.Provider>
  )
}

describe('DataProvider — 불러오는 시점', () => {
  beforeEach(() => fromSpy.mockClear())

  it('로그인 전에는 불러오지 않는다 — 불러와도 DB가 0건을 줄 뿐이다', async () => {
    renderAs(null)
    await new Promise((r) => setTimeout(r, 20))
    expect(fromSpy).not.toHaveBeenCalled()
  })

  it('로그인 화면에서 열린 뒤 로그인하면 그때 불러온다', async () => {
    const view = renderAs(null)
    view.rerender(
      <AuthContext.Provider value={{ user: { id: 'uid-student', role: 'student' } }}>
        <DataProvider><div /></DataProvider>
      </AuthContext.Provider>
    )
    await waitFor(() => expect(fromSpy).toHaveBeenCalledWith('tests_visible'))
  })
})
