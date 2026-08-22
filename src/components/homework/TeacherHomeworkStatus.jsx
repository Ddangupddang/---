// src/components/homework/TeacherHomeworkStatus.jsx
// 교사: 한 종류(내신/정시)의 그룹·주차별 요일 제출 현황.
import { useState } from 'react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { visibleStudents, visibleClasses } from '../../utils/classAccess'
import { homeworkGroups, setInGroup, studentInGroup } from '../../utils/homeworkGroup'
import DaySubmissionList from './DaySubmissionList'
import DayQuestionStats from './DayQuestionStats'
import {
  WEEKDAY_LABELS,
} from '../../constants/homework'

// 로그인 정보는 useAuth() 하나에서만 받는다 — 담당 반 범위와 제출 취소 권한이
// 서로 다른 경로로 신원을 읽으면 나중에 어긋날 여지가 생긴다.
export default function TeacherHomeworkStatus({ category }) {
  const { user } = useAuth()
  const {
    students: allStudents, classes = [],
    homeworkSets, homeworkDays, homeworkQuestions = [], homeworkSubmissions,
    deleteHomeworkSubmission,
  } = useData()
  // 과제 세트는 학년·레벨 단위라 학원 공용이지만, 제출 현황은 담당 반 학생만 본다
  const students = visibleStudents(allStudents, classes, user)
  // 내신은 반, 정시는 레벨로 묶는다
  const groups = homeworkGroups(category, visibleClasses(classes, user))

  const [groupKey, setGroupKey] = useState('')
  // 반 목록은 Supabase 로드 뒤에 채워진다 — 첫 렌더의 빈 값을 붙잡고 있으면 표가 빈 채로 열린다
  const group = groups.find((g) => g.key === groupKey) ?? groups[0] ?? null
  const [openDayId, setOpenDayId] = useState(null) // 펼쳐서 보고 있는 요일
  const [dayView, setDayView] = useState('students') // students | questions

  // 이 종류·그룹의 세트(주차 최신순)
  const sets = homeworkSets
    .filter((s) => s.category === category && setInGroup(s, group))
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))

  // 이 그룹에 속한 학생 (내신=반, 정시=정시레벨)
  const groupStudents = students.filter((s) => studentInGroup(s, group))

  return (
    <div>
      {/* 그룹 탭 */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {groups.map((g) => (
          <button key={g.key} onClick={() => setGroupKey(g.key)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
              group?.key === g.key ? 'bg-ink text-white' : 'bg-surface-alt text-ink-soft'
            }`}>{g.label}</button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="text-center text-ink-faint py-10">담당 반이 없습니다. 관리자에게 반 배정을 요청하세요.</p>
      ) : sets.length === 0 ? (
        <p className="text-center text-ink-faint py-10">등록된 과제가 없습니다.</p>
      ) : sets.map((set) => {
        const days = homeworkDays.filter((d) => d.setId === set.id).sort((a, b) => a.weekday - b.weekday)
        // 제출 취소 권한 — 세트 수정·삭제와 같은 규칙(관리자 또는 그 과제를 낸 교사)
        const canManage = user.role === 'admin' || set.teacherId === user.id
        return (
          <div key={set.id} className="mb-6">
            <p className="font-semibold text-ink mb-2">{set.title} <span className="text-xs text-ink-faint">({set.weekStart} 주)</span></p>
            <div className="flex flex-col gap-2">
              {days.map((day) => {
                const subs = homeworkSubmissions.filter((s) => s.dayId === day.id)
                const isOpen = openDayId === day.id
                return (
                  <div key={day.id} className="bg-surface border border-line rounded p-3">
                    <button
                      onClick={() => { setOpenDayId(isOpen ? null : day.id); setDayView('students') }}
                      className="w-full flex justify-between items-center text-left"
                    >
                      <span className="text-sm font-medium text-ink">{WEEKDAY_LABELS[day.weekday]}요일 · {day.date}</span>
                      <span className="text-sm font-bold text-ink">
                        {subs.length}/{groupStudents.length} 제출
                        <span className="ml-2 text-xs font-normal text-ink-faint">{isOpen ? '▴' : '▾'}</span>
                      </span>
                    </button>
                    {isOpen && (() => {
                      const dayQuestions = homeworkQuestions
                        .filter((q) => q.dayId === day.id)
                        .sort((a, b) => a.number - b.number)
                      return (
                        <>
                          {/* 학생별(누가 냈나) / 문항별(무엇을 틀렸나) */}
                          <div className="flex gap-2 mt-3">
                            {[['students', '학생별'], ['questions', '문항별']].map(([key, label]) => (
                              <button key={key} onClick={() => setDayView(key)}
                                className={`px-3 py-1 rounded-full text-xs ${
                                  dayView === key ? 'bg-ink text-white' : 'bg-surface-alt text-ink-soft'
                                }`}>{label}</button>
                            ))}
                          </div>
                          {dayView === 'students' ? (
                            <DaySubmissionList
                              students={groupStudents}
                              questions={dayQuestions}
                              submissions={subs}
                              onCancel={canManage
                                ? (studentId) => deleteHomeworkSubmission({ dayId: day.id, studentId })
                                : null}
                            />
                          ) : (
                            <DayQuestionStats questions={dayQuestions} submissions={subs} />
                          )}
                        </>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
