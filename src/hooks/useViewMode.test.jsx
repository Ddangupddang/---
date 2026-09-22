// src/hooks/useViewMode.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useViewMode } from './useViewMode'

// 훅이 주소를 어떻게 바꾸는지 보려고 현재 주소를 화면에 그린다
function Probe() {
  const { mode, id, go } = useViewMode('list')
  const loc = useLocation()
  const navigate = useNavigate()
  return (
    <div>
      <button onClick={() => navigate(-1)}>뒤로</button>
      <p data-testid="mode">{mode}</p>
      <p data-testid="id">{String(id)}</p>
      <p data-testid="url">{loc.pathname + loc.search}</p>
      <button onClick={() => go('status')}>현황</button>
      <button onClick={() => go('detail', 100)}>상세</button>
      <button onClick={() => go('list')}>목록</button>
      <button onClick={() => go('list', null, { replace: true })}>목록(기록없이)</button>
    </div>
  )
}

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path="/homework" element={<Probe />} /></Routes>
    </MemoryRouter>
  )

describe('useViewMode', () => {
  it('주소에 view가 없으면 기본 화면이다', () => {
    renderAt('/homework')
    expect(screen.getByTestId('mode')).toHaveTextContent('list')
    expect(screen.getByTestId('id')).toHaveTextContent('null')
  })

  it('주소의 view를 읽는다', () => {
    renderAt('/homework?view=status')
    expect(screen.getByTestId('mode')).toHaveTextContent('status')
  })

  it('화면을 옮기면 주소에 남는다 — 이게 없어서 뒤로가기가 엉뚱한 데로 갔다', () => {
    renderAt('/homework')
    fireEvent.click(screen.getByText('현황'))
    expect(screen.getByTestId('url')).toHaveTextContent('/homework?view=status')
  })

  it('상세로 갈 때 어느 항목인지도 남긴다', () => {
    renderAt('/homework')
    fireEvent.click(screen.getByText('상세'))
    expect(screen.getByTestId('url')).toHaveTextContent('/homework?view=detail&id=100')
    expect(screen.getByTestId('id')).toHaveTextContent('100')
  })

  it('기본 화면으로 돌아가면 주소에서 지운다', () => {
    renderAt('/homework?view=detail&id=100')
    fireEvent.click(screen.getByText('목록'))
    expect(screen.getByTestId('url')).toHaveTextContent('/homework')
    expect(screen.getByTestId('url')).not.toHaveTextContent('view=')
    expect(screen.getByTestId('url')).not.toHaveTextContent('id=')
  })

  it('id가 숫자가 아니면 없는 것으로 친다', () => {
    renderAt('/homework?view=detail&id=abc')
    expect(screen.getByTestId('id')).toHaveTextContent('null')
  })

  it('id가 비어 있어도 없는 것으로 친다', () => {
    renderAt('/homework?view=detail&id=')
    expect(screen.getByTestId('id')).toHaveTextContent('null')
  })

  it('주소의 다른 값은 건드리지 않는다', () => {
    renderAt('/homework?category=jeongsi')
    fireEvent.click(screen.getByText('현황'))
    expect(screen.getByTestId('url')).toHaveTextContent('category=jeongsi')
    expect(screen.getByTestId('url')).toHaveTextContent('view=status')
  })

  // 이 훅을 만든 이유가 바로 이것이다.
  // 전에는 과제 화면 안에서 제출 현황으로 들어간 뒤 뒤로가기를 누르면
  // 과제 목록이 아니라 그 전에 있던 다른 페이지로 튕겼다.
  it('뒤로가기가 화면 단위로 동작한다', () => {
    renderAt('/homework')
    fireEvent.click(screen.getByText('현황'))
    expect(screen.getByTestId('mode')).toHaveTextContent('status')

    fireEvent.click(screen.getByText('뒤로'))
    expect(screen.getByTestId('mode')).toHaveTextContent('list')
  })

  it('두 단계 들어가면 한 단계씩 되돌아온다', () => {
    renderAt('/homework')
    fireEvent.click(screen.getByText('현황'))
    fireEvent.click(screen.getByText('상세'))
    expect(screen.getByTestId('mode')).toHaveTextContent('detail')

    fireEvent.click(screen.getByText('뒤로'))
    expect(screen.getByTestId('mode')).toHaveTextContent('status')
  })

  // replace로 옮기면 되돌아갈 기록을 남기지 않는다.
  // 저장을 마치고 목록으로 나올 때 쓴다 — 기록을 남기면 뒤로가기가
  // 방금 저장한 작성 화면을 다시 연다.
  it('기록 없이 옮기면 뒤로가기가 그 화면을 다시 열지 않는다', () => {
    renderAt('/homework')
    fireEvent.click(screen.getByText('현황'))
    fireEvent.click(screen.getByText('목록(기록없이)'))
    expect(screen.getByTestId('mode')).toHaveTextContent('list')

    // 현황(기록 하나)만 지나 처음으로 돌아간다 — 목록이 또 쌓이지 않았다
    fireEvent.click(screen.getByText('뒤로'))
    expect(screen.getByTestId('mode')).toHaveTextContent('list')
  })
})
