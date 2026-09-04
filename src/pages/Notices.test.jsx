// src/pages/Notices.test.jsx
// 등록 실패를 화면에 알린다. 조용히 목록으로 돌아가면 올라간 줄 알고 지나간다.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Notices from './Notices'

const state = {}
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: state.user }) }))
vi.mock('../context/DataContext', () => ({ useData: () => state.data }))
vi.mock('../components/Layout', () => ({ default: ({ children }) => <div>{children}</div> }))

beforeEach(() => {
  state.user = { id: 't1', role: 'teacher' }
  state.data = {
    classes:       [{ id: 10, name: 'A반', teacherId: 't1' }],
    notices:       [],
    staffProfiles: [{ id: 't1', name: '최원용', role: 'teacher' }],
    addNotice:     vi.fn().mockResolvedValue({ notice: { id: 1 } }),
    deleteNotice:  vi.fn().mockResolvedValue({}),
  }
})

// 작성 화면을 열고 최소 입력을 채운다
async function fillForm(user) {
  render(<Notices />)
  await user.click(screen.getByRole('button', { name: '+ 공지 작성' }))
  await user.type(screen.getByPlaceholderText('공지 제목을 입력하세요'), '휴원 안내')
  await user.type(screen.getByPlaceholderText('공지 내용을 입력하세요'), '다음 주 화요일 휴원합니다')
  // 대상 반은 기본이 전체 선택이라 따로 고르지 않는다
}

describe('공지 작성', () => {
  it('등록에 성공하면 목록으로 돌아간다', async () => {
    const user = userEvent.setup()
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: '공지 저장' }))

    expect(state.data.addNotice).toHaveBeenCalledWith({
      title:          '휴원 안내',
      content:        '다음 주 화요일 휴원합니다',
      authorId:       't1',
      targetClassIds: [10],
      kakaoSent:      false,
    })
    expect(await screen.findByRole('button', { name: '+ 공지 작성' })).toBeInTheDocument()
  })

  it('등록에 실패하면 목록으로 넘어가지 않고 사유를 보여준다', async () => {
    const user = userEvent.setup()
    // 조용히 목록으로 돌아가면 올라간 줄 알고 지나간다.
    // 공지는 실제로 이 이유(작성자 칸 타입 불일치)로 한 건도 저장되지 않았다.
    state.data.addNotice = vi.fn().mockResolvedValue({
      error: 'invalid input syntax for type integer',
    })
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: '공지 저장' }))

    expect(await screen.findByTestId('notice-error')).toHaveTextContent('integer')
    // 작성 화면에 그대로 머문다 — 쓴 내용도 살아 있다
    expect(screen.getByPlaceholderText('공지 제목을 입력하세요')).toHaveValue('휴원 안내')
  })
})
