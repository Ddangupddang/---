// src/components/homework/TeacherHomeworkStatus.jsx
// 교사: 한 종류(내신/정시)의 그룹·주차별 요일 제출 현황.
import { useState } from 'react'
import { useData } from '../../context/DataContext'
import DaySubmissionList from './DaySubmissionList'
import DayQuestionStats from './DayQuestionStats'
import {
  HW_CATEGORY, GRADES, GRADE_LABELS,
  JEONGSI_LEVELS, JEONGSI_LEVEL_LABELS, WEEKDAY_LABELS,
} from '../../constants/homework'

export default function TeacherHomeworkStatus({ category }) {
  const { students, homeworkSets, homeworkDays, homeworkQuestions = [], homeworkSubmissions } = useData()
  const isNaesin = category === HW_CATEGORY.NAESIN
  const targets = isNaesin ? GRADES : JEONGSI_LEVELS
  const targetLabels = isNaesin ? GRADE_LABELS : JEONGSI_LEVEL_LABELS

  const [target, setTarget] = useState(targets[0])
  const [openDayId, setOpenDayId] = useState(null) // 펼쳐서 보고 있는 요일
  const [dayView, setDayView] = useState('students') // students | questions

  // 이 종류·그룹의 세트(주차 최신순)
  const sets = homeworkSets
    .filter((s) => s.category === category && s.target === target)
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))

  // 이 그룹에 속한 학생 (내신=학년, 정시=정시레벨)
  const groupStudents = students.filter((s) =>
    isNaesin ? s.grade === target : s.jeongsiLevel === target
  )

  return (
    <div>
      {/* 그룹 탭 */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {targets.map((t) => (
          <button key={t} onClick={() => setTarget(t)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
              target === t ? 'bg-ink text-white' : 'bg-surface-alt text-ink-soft'
            }`}>{targetLabels[t]}</button>
        ))}
      </div>

      {sets.length === 0 ? (
        <p className="text-center text-ink-faint py-10">등록된 과제가 없습니다.</p>
      ) : sets.map((set) => {
        const days = homeworkDays.filter((d) => d.setId === set.id).sort((a, b) => a.weekday - b.weekday)
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
