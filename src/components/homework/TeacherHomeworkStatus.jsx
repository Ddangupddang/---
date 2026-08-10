// src/components/homework/TeacherHomeworkStatus.jsx
// 교사: 한 종류(내신/정시)의 그룹·주차별 요일 제출 현황.
import { useState } from 'react'
import { useData } from '../../context/DataContext'
import {
  HW_CATEGORY, GRADES, GRADE_LABELS,
  JEONGSI_LEVELS, JEONGSI_LEVEL_LABELS, WEEKDAY_LABELS,
} from '../../constants/homework'

export default function TeacherHomeworkStatus({ category }) {
  const { students, homeworkSets, homeworkDays, homeworkSubmissions } = useData()
  const isNaesin = category === HW_CATEGORY.NAESIN
  const targets = isNaesin ? GRADES : JEONGSI_LEVELS
  const targetLabels = isNaesin ? GRADE_LABELS : JEONGSI_LEVEL_LABELS

  const [target, setTarget] = useState(targets[0])

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
              target === t ? 'bg-[#2B2B2B] text-white' : 'bg-gray-100 text-gray-600'
            }`}>{targetLabels[t]}</button>
        ))}
      </div>

      {sets.length === 0 ? (
        <p className="text-center text-gray-400 py-10">등록된 과제가 없습니다.</p>
      ) : sets.map((set) => {
        const days = homeworkDays.filter((d) => d.setId === set.id).sort((a, b) => a.weekday - b.weekday)
        return (
          <div key={set.id} className="mb-6">
            <p className="font-semibold text-[#2B2B2B] mb-2">{set.title} <span className="text-xs text-gray-400">({set.weekStart} 주)</span></p>
            <div className="flex flex-col gap-2">
              {days.map((day) => {
                const subs = homeworkSubmissions.filter((s) => s.dayId === day.id)
                return (
                  <div key={day.id} className="bg-white rounded-xl p-3 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-[#2B2B2B]">{WEEKDAY_LABELS[day.weekday]}요일 · {day.date}</span>
                      <span className="text-sm font-bold text-[#2B2B2B]">{subs.length}/{groupStudents.length} 제출</span>
                    </div>
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
