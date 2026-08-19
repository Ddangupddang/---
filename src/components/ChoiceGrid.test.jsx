// src/components/ChoiceGrid.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('키보드 숫자키로 포커스된 칸의 값을 토글한다', () => {
    const onChange = vi.fn()
    render(<ChoiceGrid count={3} values={{}} mode="input" onChange={onChange} />)
    const grid = screen.getByTestId('choice-grid')
    grid.focus()
    fireEvent.keyDown(grid, { key: '3' })
    // 다중선택을 키보드로 넣을 수 있어야 해서 숫자키는 제자리에 머문다 —
    // 다음 칸으로는 Enter나 화살표로 옮긴다
    expect(onChange).toHaveBeenCalledWith(1, '③')
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
    // 색이 아니라 "선택됨/정오답"이라는 의미를 단언한다 — 색은 디자인 토큰이 바뀌면 함께 바뀐다
    expect(screen.getByTestId('cell-1-③')).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('cell-1-③')).toHaveAttribute('data-result', 'correct')
    expect(screen.getByTestId('cell-2-①')).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('cell-2-①')).toHaveAttribute('data-result', 'wrong')
    // 2번의 실제 정답 ④ 는 고르지 않았지만 정답이므로 테두리로 표시된다
    expect(screen.getByTestId('cell-2-④')).toHaveAttribute('data-selected', 'false')
    expect(screen.getByTestId('cell-2-④')).toHaveAttribute('data-result', 'answer')
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

describe('ChoiceGrid (다중선택)', () => {
  it('같은 선지를 두 번 누르면 꺼진다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ChoiceGrid count={1} values={{ 1: '②' }} mode="input" onChange={onChange} />)

    await user.click(screen.getByTestId('cell-1-②'))
    // 이미 켜져 있던 선지를 누르면 빈 문자열이 돼야 한다
    expect(onChange).toHaveBeenCalledWith(1, '')
  })

  it('다른 선지를 누르면 교체가 아니라 추가된다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ChoiceGrid count={1} values={{ 1: '③' }} mode="input" onChange={onChange} />)

    await user.click(screen.getByTestId('cell-1-①'))
    // 선지 순서로 정렬돼 돌아온다
    expect(onChange).toHaveBeenCalledWith(1, '①③')
  })

  it('여러 개 켜진 값이 모두 선택 표시된다', () => {
    render(<ChoiceGrid count={1} values={{ 1: '①③' }} mode="input" onChange={() => {}} />)
    expect(screen.getByTestId('cell-1-①')).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('cell-1-②')).toHaveAttribute('data-selected', 'false')
    expect(screen.getByTestId('cell-1-③')).toHaveAttribute('data-selected', 'true')
  })

  it('숫자키는 제자리에서 토글한다 — 다음 문항으로 넘어가지 않는다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ChoiceGrid count={2} values={{}} mode="input" onChange={onChange} />)

    const grid = screen.getByTestId('choice-grid')
    grid.focus()
    await user.keyboard('1')
    await user.keyboard('3')

    // 둘 다 1번 문항에 들어가야 한다 (자동 이동했다면 두 번째가 2번 문항으로 갔을 것)
    expect(onChange).toHaveBeenNthCalledWith(1, 1, '①')
    expect(onChange).toHaveBeenNthCalledWith(2, 1, '③')
  })

  it('Enter를 누르면 다음 문항으로 이동한다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ChoiceGrid count={2} values={{}} mode="input" onChange={onChange} />)

    const grid = screen.getByTestId('choice-grid')
    grid.focus()
    await user.keyboard('1')
    await user.keyboard('{Enter}')
    await user.keyboard('2')

    expect(onChange).toHaveBeenNthCalledWith(1, 1, '①')
    expect(onChange).toHaveBeenNthCalledWith(2, 2, '②')
  })

  it('결과 모드에서 다중 정답의 네 상태를 바르게 표시한다', () => {
    // 정답 ①③ / 학생 답 ①④ → ①맞음, ③놓침, ④틀림, ②아무것도 아님
    render(
      <ChoiceGrid count={1} values={{ 1: '①④' }} mode="result"
        answerKey={{ 1: '①③' }} onChange={() => {}} />
    )
    expect(screen.getByTestId('cell-1-①')).toHaveAttribute('data-result', 'correct')
    expect(screen.getByTestId('cell-1-③')).toHaveAttribute('data-result', 'answer')
    expect(screen.getByTestId('cell-1-④')).toHaveAttribute('data-result', 'wrong')
    expect(screen.getByTestId('cell-1-②')).toHaveAttribute('data-result', 'none')
  })
})
