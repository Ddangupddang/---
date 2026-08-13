// src/components/ui/Badge.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Badge from './Badge'

describe('Badge', () => {
  it('내용을 보여주고 tone을 속성으로 노출한다', () => {
    render(<Badge tone="danger">지각제출</Badge>)
    const el = screen.getByText('지각제출')
    expect(el).toHaveAttribute('data-tone', 'danger')
  })

  it('tone을 안 주면 neutral이다', () => {
    render(<Badge>미제출</Badge>)
    expect(screen.getByText('미제출')).toHaveAttribute('data-tone', 'neutral')
  })

  it('네 가지 tone을 모두 그릴 수 있다', () => {
    render(
      <>
        <Badge tone="navy">제출완료</Badge>
        <Badge tone="danger">지각제출</Badge>
        <Badge tone="warn">채점중</Badge>
        <Badge tone="neutral">미제출</Badge>
      </>
    )
    expect(screen.getByText('제출완료')).toHaveAttribute('data-tone', 'navy')
    expect(screen.getByText('지각제출')).toHaveAttribute('data-tone', 'danger')
    expect(screen.getByText('채점중')).toHaveAttribute('data-tone', 'warn')
    expect(screen.getByText('미제출')).toHaveAttribute('data-tone', 'neutral')
  })
})
