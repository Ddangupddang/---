// src/components/ui/DataTable.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DataTable from './DataTable'

const COLUMNS = [
  { key: 'name',  label: '이름' },
  { key: 'score', label: '점수', align: 'right' },
]
const ROWS = [
  { id: 1, name: '김민서', score: 88, bad: false },
  { id: 2, name: '최예진', score: 55, bad: true },
]

function renderTable(overrides = {}) {
  const props = {
    columns: COLUMNS,
    rows: ROWS,
    rowKey: (r) => r.id,
    renderCell: (r, c) => (c.key === 'name' ? r.name : `${r.score}점`),
    isAlert: (r) => r.bad,
    empty: '등록된 학생이 없습니다.',
    ...overrides,
  }
  render(<DataTable {...props} />)
  return props
}

describe('DataTable', () => {
  it('헤더와 셀을 그린다', () => {
    renderTable()
    expect(screen.getByText('이름')).toBeInTheDocument()
    expect(screen.getByText('점수')).toBeInTheDocument()
    expect(screen.getByText('김민서')).toBeInTheDocument()
    expect(screen.getByText('88점')).toBeInTheDocument()
  })

  it('경고 행에 표시를 남긴다 — 문제 학생이 멀리서도 보여야 한다', () => {
    renderTable()
    expect(screen.getByTestId('row-2')).toHaveAttribute('data-alert', 'true')
    expect(screen.getByTestId('row-1')).toHaveAttribute('data-alert', 'false')
  })

  it('행을 누르면 그 행으로 onRowClick이 불린다', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    renderTable({ onRowClick })

    await user.click(screen.getByText('최예진'))
    expect(onRowClick).toHaveBeenCalledWith(ROWS[1])
  })

  it('onRowClick이 없으면 눌러도 아무 일이 없다', async () => {
    const user = userEvent.setup()
    renderTable({ onRowClick: undefined })
    await user.click(screen.getByText('최예진'))
    // 예외 없이 지나가면 통과
    expect(screen.getByText('최예진')).toBeInTheDocument()
  })

  it('행이 없으면 안내 문구만 보여준다', () => {
    renderTable({ rows: [] })
    expect(screen.getByText('등록된 학생이 없습니다.')).toBeInTheDocument()
    expect(screen.queryByText('이름')).not.toBeInTheDocument()
  })
})
