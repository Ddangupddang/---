// src/components/ChoiceGrid.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import ChoiceGrid from './ChoiceGrid'

describe('ChoiceGrid — input 모드', () => {
  it('count만큼 문항 행을 렌더링한다', () => {
    render(<ChoiceGrid count={3} values={{}} mode="input" onChange={() => {}} />)
    expect(screen.getByText('1번')).toBeInTheDocument()
    expect(screen.getByText('2번')).toBeInTheDocument()
    expect(screen.getByText('3번')).toBeInTheDocument()
  })

  it('선지 클릭 시 onChange(number, choice)를 호출한다', () => {
    const onChange = vi.fn()
    render(<ChoiceGrid count={2} values={{}} mode="input" onChange={onChange} />)
    // 1번 문항의 ③ 버튼 클릭
    const cell = screen.getByTestId('cell-1')
    fireEvent.click(within(cell).getByText('③'))
    expect(onChange).toHaveBeenCalledWith(1, '③')
  })

  it('키보드 숫자키로 포커스된 칸의 값을 설정하고 다음 칸으로 이동한다', () => {
    const onChange = vi.fn()
    render(<ChoiceGrid count={3} values={{}} mode="input" onChange={onChange} />)
    const grid = screen.getByTestId('choice-grid')
    grid.focus()
    fireEvent.keyDown(grid, { key: '3' })
    expect(onChange).toHaveBeenCalledWith(1, '③')
    fireEvent.keyDown(grid, { key: '1' })
    expect(onChange).toHaveBeenCalledWith(2, '①')
  })

  it('values에 담긴 선택값이 강조 표시된다', () => {
    render(<ChoiceGrid count={1} values={{ 1: '②' }} mode="input" onChange={() => {}} />)
    const selected = screen.getByTestId('cell-1-②')
    expect(selected.className).toMatch(/bg-\[#2B2B2B\]/)
  })
})

describe('ChoiceGrid — result 모드', () => {
  it('정답은 초록, 학생 오답은 빨강으로 표시한다', () => {
    render(
      <ChoiceGrid
        count={2}
        mode="result"
        values={{ 1: '③', 2: '①' }}
        answerKey={{ 1: '③', 2: '④' }}
        onChange={() => {}}
      />
    )
    expect(screen.getByTestId('cell-1-③').className).toMatch(/bg-green/)
    expect(screen.getByTestId('cell-2-①').className).toMatch(/bg-red|C0392B/)
    // 2번의 실제 정답 ④ 는 초록 테두리로 표시
    expect(screen.getByTestId('cell-2-④').className).toMatch(/green/)
  })

  it('result 모드에서는 클릭해도 onChange가 호출되지 않는다', () => {
    const onChange = vi.fn()
    render(
      <ChoiceGrid count={1} mode="result" values={{ 1: '③' }} answerKey={{ 1: '③' }} onChange={onChange} />
    )
    fireEvent.click(screen.getByTestId('cell-1-①'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
