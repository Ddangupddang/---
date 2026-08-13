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
    // 색이 아니라 "선택됨"이라는 의미를 단언한다 — 색은 디자인 토큰이 바뀌면 함께 바뀐다
    expect(screen.getByTestId('cell-1-②')).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('cell-1-①')).toHaveAttribute('data-selected', 'false')
  })
})

describe('ChoiceGrid — result 모드', () => {
  it('맞게 고른 선지와 틀리게 고른 선지를 구분해 표시한다', () => {
    render(
      <ChoiceGrid
        count={2}
        mode="result"
        values={{ 1: '③', 2: '①' }}
        answerKey={{ 1: '③', 2: '④' }}
        onChange={() => {}}
      />
    )
    // 색이 아니라 "선택됨/오답임"이라는 의미를 단언한다 — 색은 디자인 토큰이 바뀌면 함께 바뀐다
    expect(screen.getByTestId('cell-1-③')).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('cell-1-③')).toHaveAttribute('data-wrong', 'false')
    expect(screen.getByTestId('cell-2-①')).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('cell-2-①')).toHaveAttribute('data-wrong', 'true')
    // 2번의 실제 정답 ④ 는 고르지 않았으므로 선택도 오답도 아니다 (테두리로만 표시)
    expect(screen.getByTestId('cell-2-④')).toHaveAttribute('data-selected', 'false')
    expect(screen.getByTestId('cell-2-④')).toHaveAttribute('data-wrong', 'false')
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

describe('ChoiceGrid — 열 배치', () => {
  // 학생 화면은 max-w-sm(384px) 박스 안에 들어간다. 뷰포트 기준 breakpoint(sm:/lg:)를 쓰면
  // 창만 넓고 실제 공간은 좁을 때 3열로 펼쳐져 칸끼리 겹친다. 그래서 열 수는
  // 실제 컨테이너 너비에 맞춰 자동으로 정해져야 한다.
  // (jsdom은 레이아웃을 계산하지 않으므로 겹침 자체는 잴 수 없다 — 배치 방식만 고정한다.)
  it('뷰포트 기준 열 수 대신 컨테이너 너비에 맞춘 자동 열을 쓴다', () => {
    render(<ChoiceGrid count={5} values={{}} mode="input" onChange={() => {}} />)
    const grid = screen.getByTestId('choice-grid')
    expect(grid.className).not.toMatch(/(sm|md|lg|xl):grid-cols/)
    expect(grid.className).toMatch(/auto-fill/)
  })
})
