import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Pagination from './Pagination'

// 번호 버튼만 골라낸다 (이전·다음은 빼고)
function numbers() {
  return screen.getAllByRole('button')
    .map((b) => b.textContent)
    .filter((t) => /^\d+$/.test(t))
}

describe('Pagination', () => {
  it('한 쪽뿐이면 그리지 않는다', () => {
    const { container } = render(<Pagination page={1} total={1} onChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('쪽이 많아도 번호는 다섯 개만 그린다', () => {
    // 폰에서 번호가 화면 밖으로 밀리던 것을 막는다
    render(<Pagination page={8} total={15} onChange={() => {}} />)
    expect(numbers()).toEqual(['6', '7', '8', '9', '10'])
  })

  it('끝쪽으로 가면 창이 따라 옮겨진다', () => {
    render(<Pagination page={15} total={15} onChange={() => {}} />)
    expect(numbers()).toEqual(['11', '12', '13', '14', '15'])
  })

  it('지금 쪽을 알려준다', () => {
    render(<Pagination page={8} total={15} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: '8' })).toHaveAttribute('aria-current', 'page')
  })

  it('번호를 누르면 그 쪽으로 간다', () => {
    const onChange = vi.fn()
    render(<Pagination page={8} total={15} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '10' }))
    expect(onChange).toHaveBeenCalledWith(10)
  })

  it('이전·다음으로 한 쪽씩 옮긴다', () => {
    const onChange = vi.fn()
    render(<Pagination page={8} total={15} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '이전 쪽' }))
    expect(onChange).toHaveBeenCalledWith(7)
    fireEvent.click(screen.getByRole('button', { name: '다음 쪽' }))
    expect(onChange).toHaveBeenCalledWith(9)
  })

  it('첫 쪽에서는 이전이, 끝 쪽에서는 다음이 눌리지 않는다', () => {
    const { rerender } = render(<Pagination page={1} total={15} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: '이전 쪽' })).toBeDisabled()
    rerender(<Pagination page={15} total={15} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: '다음 쪽' })).toBeDisabled()
  })

  it('몇 쪽 중 몇 쪽인지 적는다', () => {
    // 번호를 다섯 개만 그리면 전체가 몇 쪽인지 알 수 없다
    render(<Pagination page={8} total={15} onChange={() => {}} />)
    expect(screen.getByText('15쪽 중 8쪽')).toBeInTheDocument()
  })
})
