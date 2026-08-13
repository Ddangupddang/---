// src/components/ui/Button.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from './Button'

describe('Button', () => {
  it('내용을 보여주고 클릭이 전달된다', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>저장</Button>)

    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('disabled면 클릭이 전달되지 않는다', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick} disabled>저장</Button>)

    const btn = screen.getByRole('button', { name: '저장' })
    expect(btn).toBeDisabled()
    await user.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('variant를 속성으로 노출한다 — 색이 아니라 종류를 검증한다', () => {
    render(<><Button variant="accent">제출</Button><Button variant="ghost">취소</Button></>)
    expect(screen.getByRole('button', { name: '제출' })).toHaveAttribute('data-variant', 'accent')
    expect(screen.getByRole('button', { name: '취소' })).toHaveAttribute('data-variant', 'ghost')
  })

  it('variant를 안 주면 primary다', () => {
    render(<Button>저장</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'primary')
  })

  it('기본 type은 button이다 — 폼 안에서 의도치 않게 제출되면 안 된다', () => {
    render(<Button>저장</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})
