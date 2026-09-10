import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GrowTextarea from './GrowTextarea'

describe('GrowTextarea', () => {
  it('minRows만큼 줄을 열고 시작한다', () => {
    render(<GrowTextarea value="" onChange={() => {}} minRows={6} maxRows={15} />)
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '6')
  })

  it('입력한 값이 그대로 전달된다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<GrowTextarea value="" onChange={onChange} placeholder="답장" />)
    await user.type(screen.getByPlaceholderText('답장'), '네')
    expect(onChange).toHaveBeenCalled()
  })

  it('높이를 직접 정해 준다 — 줄 수가 고정돼 있지 않다', () => {
    render(<GrowTextarea value={'가\n나\n다'} onChange={() => {}} minRows={6} maxRows={15} />)
    expect(screen.getByRole('textbox').style.height).not.toBe('')
  })
})
