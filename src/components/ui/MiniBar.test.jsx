// src/components/ui/MiniBar.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MiniBar from './MiniBar'

describe('MiniBar', () => {
  it('비율을 퍼센트 폭으로 그린다', () => {
    render(<MiniBar value={3} max={5} />)
    expect(screen.getByTestId('minibar-fill')).toHaveStyle({ width: '60%' })
  })

  it('max가 0이면 아무것도 그리지 않는다 — 0으로 나눌 수 없다', () => {
    const { container } = render(<MiniBar value={0} max={0} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('value가 max보다 커도 100%를 넘지 않는다', () => {
    render(<MiniBar value={7} max={5} />)
    expect(screen.getByTestId('minibar-fill')).toHaveStyle({ width: '100%' })
  })

  it('tone을 속성으로 노출한다', () => {
    render(<MiniBar value={1} max={5} tone="danger" />)
    expect(screen.getByTestId('minibar-fill')).toHaveAttribute('data-tone', 'danger')
  })
})
