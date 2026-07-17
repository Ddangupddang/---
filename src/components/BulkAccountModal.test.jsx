import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import BulkAccountModal from './BulkAccountModal'

// supabase는 미리보기 단계에서 호출되지 않지만, import 시점 오류 방지를 위해 모킹
vi.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } } }))

const getClassName = (id) => (id === 1 ? '수능국어A반' : '기타반')

describe('BulkAccountModal — 미리보기', () => {
  it('전화 있는 학생의 생성될 아이디를 보여준다', () => {
    render(
      <BulkAccountModal
        students={[{ id: 1, name: '홍길동', classId: 1, phone: '010-1234-5678', parentPhone: '' }]}
        getClassName={getClassName} onClose={() => {}} onDone={() => {}} />
    )
    expect(screen.getByText('홍길동5678')).toBeInTheDocument()
  })

  it('전화 없는 학생은 건너뜀으로 표시', () => {
    render(
      <BulkAccountModal
        students={[{ id: 2, name: '김철수', classId: 1, phone: '', parentPhone: '' }]}
        getClassName={getClassName} onClose={() => {}} onDone={() => {}} />
    )
    expect(screen.getByText('전화번호 없음')).toBeInTheDocument()
  })
})
