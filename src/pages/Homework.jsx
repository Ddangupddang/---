// src/pages/Homework.jsx
// 과제 — 상단 내신/정시 탭. 학생: 제출/결과, 교사: 목록/출제/현황.
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import Layout from '../components/Layout'
import StudentHomeworkView from '../components/homework/StudentHomeworkView'
import TeacherHomeworkCreate from '../components/homework/TeacherHomeworkCreate'
import TeacherHomeworkStatus from '../components/homework/TeacherHomeworkStatus'
import { HW_CATEGORY, CATEGORY_LABELS } from '../constants/homework'

export default function Homework() {
  const { user } = useAuth()
  const { homeworkSets, deleteHomeworkSet } = useData()
  const isStaff = user.role === 'teacher' || user.role === 'admin'

  const [category, setCategory] = useState(HW_CATEGORY.NAESIN)
  const [mode, setMode] = useState('list') // list | form | status
  const [editSet, setEditSet] = useState(null) // null이면 새로 출제, 세트가 있으면 수정

  function openList() { setEditSet(null); setMode('list') }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-[#2B2B2B]">과제</h1>
        {isStaff && mode === 'list' && (
          <div className="flex gap-2">
            <button onClick={() => setMode('status')} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">제출 현황</button>
            <button onClick={() => { setEditSet(null); setMode('form') }} className="px-4 py-2 bg-[#2B2B2B] text-white rounded-lg text-sm">+ 주간 과제</button>
          </div>
        )}
      </div>

      {/* 내신/정시 탭 */}
      <div className="flex gap-2 mb-6">
        {Object.values(HW_CATEGORY).map((c) => (
          <button key={c} onClick={() => { setCategory(c); openList() }}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              category === c ? 'bg-[#5B8FD4] text-white' : 'bg-gray-100 text-gray-600'
            }`}>{CATEGORY_LABELS[c]}</button>
        ))}
      </div>

      {/* 학생 */}
      {!isStaff && <StudentHomeworkView category={category} />}

      {/* 교사 */}
      {isStaff && mode === 'form' && (
        <TeacherHomeworkCreate
          key={editSet?.id ?? 'new'}
          category={category} editSet={editSet} onDone={openList}
        />
      )}
      {isStaff && mode === 'status' && (
        <>
          <button onClick={openList} className="text-sm text-gray-500 mb-4">← 목록</button>
          <TeacherHomeworkStatus category={category} />
        </>
      )}
      {isStaff && mode === 'list' && (
        <TeacherSetList
          category={category} sets={homeworkSets}
          onEdit={(s) => { setEditSet(s); setMode('form') }}
          onDelete={deleteHomeworkSet}
          userRole={user.role} userId={user.id}
        />
      )}
    </Layout>
  )
}

// 교사 목록: 이 종류의 세트들 (주차 최신순) + 수정/삭제
function TeacherSetList({ category, sets, onEdit, onDelete, userRole, userId }) {
  const mine = sets
    .filter((s) => s.category === category)
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))
  if (mine.length === 0) return <p className="text-center text-gray-400 py-12">등록된 {CATEGORY_LABELS[category]}가 없습니다.</p>
  return (
    <div className="flex flex-col gap-3">
      {mine.map((s) => {
        // 수정과 삭제 권한은 같다 — 관리자이거나 직접 출제한 교사
        const canManage = userRole === 'admin' || s.teacherId === userId
        return (
          <div key={s.id} className="bg-white rounded-xl p-4 shadow-sm flex justify-between items-center">
            <div>
              <p className="font-semibold text-[#2B2B2B]">{s.title}</p>
              <p className="text-xs text-gray-400 mt-1">{s.weekStart} 주 · target {s.target}</p>
            </div>
            {canManage && (
              <div className="flex items-center gap-3">
                <button onClick={() => onEdit(s)}
                  className="text-xs text-gray-500 hover:text-[#5B8FD4]">수정</button>
                <button onClick={() => { if (confirm(`"${s.title}" 세트를 삭제하시겠습니까?`)) onDelete(s.id) }}
                  className="text-xs text-gray-300 hover:text-[#C0392B]">삭제</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
