// src/components/homework/TeacherHomeworkStatus.test.jsx
// 교사 과제 현황 화면 테스트 — 그룹(학년/정시레벨) 탭 전환과 요일별 제출 집계.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TeacherHomeworkStatus from './TeacherHomeworkStatus'

const WEEK = '2026-08-10'

const state = {}
vi.mock('../../context/DataContext', () => ({ useData: () => state.data }))

beforeEach(() => {
  state.data = {
    students: [
      { id: 1, name: '고2-A', grade: 5, jeongsiLevel: 2 },
      { id: 2, name: '고2-B', grade: 5, jeongsiLevel: null },
      { id: 3, name: '중1-C', grade: 1, jeongsiLevel: null },
    ],
    homeworkSets: [
      { id: 11, category: 'naesin',  target: 5, weekStart: WEEK,        title: '고2 8월 2주차' },
      { id: 12, category: 'naesin',  target: 5, weekStart: '2026-08-03', title: '고2 8월 1주차' },
      { id: 13, category: 'jeongsi', target: 2, weekStart: WEEK,        title: '정시2 8월 2주차' },
    ],
    homeworkDays: [
      { id: 110, setId: 11, weekday: 1, date: '2026-08-10', questionCount: 2 },
      { id: 111, setId: 11, weekday: 2, date: '2026-08-11', questionCount: 3 },
      { id: 120, setId: 12, weekday: 1, date: '2026-08-03', questionCount: 2 },
      { id: 130, setId: 13, weekday: 1, date: '2026-08-10', questionCount: 5 },
    ],
    // 월요일은 고2 2명 중 1명만 제출
    homeworkSubmissions: [
      { id: 900, dayId: 110, studentId: 1, answers: [], submittedAt: '2026-08-10T10:00:00Z' },
    ],
  }
})

describe('TeacherHomeworkStatus (내신)', () => {
  it('과제가 없는 그룹에는 안내 문구를 보여준다', () => {
    // 기본 선택 그룹은 중1 — 중1 대상 세트는 없다
    render(<TeacherHomeworkStatus category="naesin" />)
    expect(screen.getByText('등록된 과제가 없습니다.')).toBeInTheDocument()
  })

  it('고2 탭을 누르면 해당 학년 세트와 요일별 제출 집계가 보인다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkStatus category="naesin" />)

    await user.click(screen.getByRole('button', { name: '고2' }))

    expect(screen.getByText('고2 8월 2주차')).toBeInTheDocument()
    // 고2 학생 2명 중 월요일은 1명 제출, 화요일은 0명 제출
    // (같은 학년의 다른 주차 세트에도 '0/2 제출'이 있으므로 요일 행 단위로 검증)
    expect(screen.getByText('월요일 · 2026-08-10').parentElement).toHaveTextContent('1/2 제출')
    expect(screen.getByText('화요일 · 2026-08-11').parentElement).toHaveTextContent('0/2 제출')
  })

  it('세트는 최신 주차가 위로 정렬된다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkStatus category="naesin" />)
    await user.click(screen.getByRole('button', { name: '고2' }))

    const titles = screen.getAllByText(/8월 \d주차/).map((el) => el.textContent)
    expect(titles[0]).toContain('8월 2주차')
    expect(titles[1]).toContain('8월 1주차')
  })

  it('다른 학년 세트는 섞여 나오지 않는다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkStatus category="naesin" />)
    await user.click(screen.getByRole('button', { name: '고2' }))
    expect(screen.queryByText('정시2 8월 2주차')).not.toBeInTheDocument()
  })
})

describe('TeacherHomeworkStatus (정시)', () => {
  it('정시 레벨 탭 기준으로 그룹 인원을 센다', async () => {
    const user = userEvent.setup()
    render(<TeacherHomeworkStatus category="jeongsi" />)

    await user.click(screen.getByRole('button', { name: '2레벨' }))

    expect(screen.getByText('정시2 8월 2주차')).toBeInTheDocument()
    // 정시 2레벨 학생은 1명(고2-A), 아직 제출 없음
    expect(screen.getByText('0/1 제출')).toBeInTheDocument()
  })
})
