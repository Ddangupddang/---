// src/pages/Videos.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import Videos from './Videos'

// DataContext(useData)를 Mock 데이터로 대체 — 실제 Supabase 연결 없이 UI 로직만 검증
vi.mock('../context/DataContext', async () => {
  const { classes }  = await import('../data/classes')
  const { students } = await import('../data/students')
  const { videos }   = await import('../data/videos')
  return {
    useData: () => ({
      classes, students, videos,
      videoComments: [],
      addVideo: () => {},
      deleteVideo: () => {},
      addVideoComment: () => {},
      replyVideoComment: () => {},
    }),
  }
})

// 시청 기록 읽기 — 실제 Supabase 대신 횟수만 센다
const fetchProgress = vi.fn().mockResolvedValue([])
vi.mock('../utils/videoProgressApi', () => ({ fetchProgressForVideos: (...a) => fetchProgress(...a) }))

function renderWithAuth(user) {
  return render(
    <AuthContext.Provider value={{ user, login: () => {}, logout: () => {} }}>
      <MemoryRouter>
        <Videos />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('Videos — 교사 역할', () => {
  const teacher = { id: 2, name: '김선생', role: 'teacher' }

  it('"영상 등록" 버튼이 표시', () => {
    renderWithAuth(teacher)
    expect(screen.getByText('+ 영상 등록')).toBeInTheDocument()
  })

  it('전체 영상 카드가 표시 (Mock 데이터 3개)', () => {
    renderWithAuth(teacher)
    expect(screen.getByText('1강. 화법과 작문 기초')).toBeInTheDocument()
    expect(screen.getByText('2강. 독서 비문학 전략')).toBeInTheDocument()
    expect(screen.getByText('1강. 현대시 분석 기초')).toBeInTheDocument()
  })

  it('"영상 등록" 클릭 시 등록 폼이 열림', () => {
    renderWithAuth(teacher)
    fireEvent.click(screen.getByText('+ 영상 등록'))
    expect(screen.getByText('영상 등록')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('https://youtu.be/...')).toBeInTheDocument()
  })

  it('영상 카드 클릭 시 플레이어 화면으로 전환', () => {
    renderWithAuth(teacher)
    fireEvent.click(screen.getByText('1강. 화법과 작문 기초'))
    expect(screen.getByText('← 목록으로')).toBeInTheDocument()
  })
})

describe('Videos — 학생 역할', () => {
  // classId: 1인 학생 (수능국어A반)
  const student = { id: 3, name: '홍길동', role: 'student', classId: 1 }

  it('"영상 등록" 버튼이 표시되지 않음', () => {
    renderWithAuth(student)
    expect(screen.queryByText('+ 영상 등록')).toBeNull()
  })

  it('본인 반(classId:1) 영상만 표시', () => {
    renderWithAuth(student)
    expect(screen.getByText('1강. 화법과 작문 기초')).toBeInTheDocument()
    // classId:2 영상은 표시 안 됨
    expect(screen.queryByText('1강. 현대시 분석 기초')).toBeNull()
  })
})

describe('Videos — 담당 반 제한', () => {
  it('담당이 아닌 반의 영상은 보이지 않는다', () => {
    // 수능국어C반(id 3)만 맡은 교사 — 그 반에는 등록된 영상이 없다
    renderWithAuth({ id: 3, name: '박선생', role: 'teacher' })
    expect(screen.queryByText('1강. 화법과 작문 기초')).toBeNull()
    expect(screen.getByText('등록된 영상이 없어요.')).toBeInTheDocument()
  })

  it('담당 반이 없는 교사에게는 이유를 알려준다', () => {
    renderWithAuth({ id: 99, name: '신입선생', role: 'teacher' })
    expect(screen.getByText('담당 반이 없습니다.')).toBeInTheDocument()
  })
})

describe('Videos — 시청 기록 읽기 횟수', () => {
  it('목록에서 한 번, 영상에 들어갈 때는 다시 받지 않고, 목록으로 돌아오면 새로 받는다', async () => {
    fetchProgress.mockClear()
    renderWithAuth({ id: 2, name: '김선생', role: 'teacher' })
    await screen.findByText('1강. 화법과 작문 기초')
    expect(fetchProgress).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('1강. 화법과 작문 기초'))
    await screen.findByText('← 목록으로')
    expect(fetchProgress).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('← 목록으로'))
    await screen.findByText('1강. 화법과 작문 기초')
    expect(fetchProgress).toHaveBeenCalledTimes(2)
  })
})
