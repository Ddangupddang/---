// src/components/homework/HomeworkReport.jsx
// 교사: 한 달 동안의 학년/레벨별 과제 수행 리포트.
// 요일별 제출 현황은 "오늘 누가 안 냈나"를 보는 화면이고,
// 이 화면은 "이 학생이 요즘 성실한가"를 보는 화면이다 (학부모 상담용).
import { useState } from 'react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { visibleStudents } from '../../utils/classAccess'
import { homeworkPeriodReport } from '../../utils/homeworkReport'
import Card from '../ui/Card'
import Alert from '../ui/Alert'
import {
  HW_CATEGORY, GRADES, GRADE_LABELS,
  JEONGSI_LEVELS, JEONGSI_LEVEL_LABELS,
} from '../../constants/homework'

export default function HomeworkReport({ category }) {
  const { user } = useAuth()
  const {
    students: allStudents = [], classes = [], homeworkSets = [], homeworkDays = [],
    homeworkQuestions = [], homeworkSubmissions = [],
  } = useData()
  // 리포트도 담당 반 학생만 — 세트는 공용이어도 학생 명단은 담당 범위를 따른다
  const students = visibleStudents(allStudents, classes, user)

  const isNaesin = category === HW_CATEGORY.NAESIN
  const targets = isNaesin ? GRADES : JEONGSI_LEVELS
  const targetLabels = isNaesin ? GRADE_LABELS : JEONGSI_LEVEL_LABELS

  const [target, setTarget] = useState(targets[0])
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))

  const { totalDays, rows } = homeworkPeriodReport({
    students, sets: homeworkSets, days: homeworkDays,
    questions: homeworkQuestions, submissions: homeworkSubmissions,
    category, target, month,
  })

  const lowCount = rows.filter((r) => r.lowSubmission).length

  return (
    <div>
      {/* 그룹 탭 */}
      <div className="flex gap-2 mb-3 overflow-x-auto">
        {targets.map((t) => (
          <button key={t} onClick={() => setTarget(t)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
              target === t ? 'bg-ink text-white' : 'bg-surface-alt text-ink-soft'
            }`}>{targetLabels[t]}</button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="border border-line rounded px-3 py-2 text-sm" />
        <span className="text-sm text-ink-mute">과제 {totalDays}회</span>
      </div>

      {totalDays === 0 ? (
        <p className="text-center text-ink-faint py-10">이 달에 출제된 과제가 없습니다.</p>
      ) : rows.length === 0 ? (
        <p className="text-center text-ink-faint py-10">이 그룹에 학생이 없습니다.</p>
      ) : (
        <>
          {lowCount > 0 && (
            <Alert tone="danger" className="mb-3">
              제출률 70% 미만 {lowCount}명 — 상담이 필요할 수 있습니다.
            </Alert>
          )}

          <Card className="overflow-hidden">
            <div className="flex items-center px-4 py-2 border-b border-line text-xs text-ink-faint">
              <span className="flex-1">이름</span>
              <span className="w-20 text-right">제출</span>
              <span className="w-16 text-right">정답률</span>
            </div>
            {rows.map((r) => (
              <div key={r.student.id} data-testid={`report-row-${r.student.id}`}
                className="flex items-center px-4 py-2.5 border-b border-line-soft last:border-0">
                <span className="flex-1 text-sm text-ink">
                  {r.student.name}
                  {r.lowSubmission && <span className="ml-2 text-xs text-danger">주의</span>}
                </span>
                <span className={`w-20 text-right text-sm ${
                  r.lowSubmission ? 'text-danger font-semibold' : 'text-ink-soft'
                }`}>
                  {r.submitted}/{r.total}
                </span>
                <span className="w-16 text-right text-sm text-ink-mute">
                  {r.correctRate == null ? '—' : `${r.correctRate}%`}
                </span>
              </div>
            ))}
          </Card>

          <p className="text-xs text-ink-faint mt-3">
            정답률은 제출한 회차의 문항만으로 계산합니다. 안 낸 회차는 제출률에 반영됩니다.
          </p>
        </>
      )}
    </div>
  )
}
