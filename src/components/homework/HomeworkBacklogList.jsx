// src/components/homework/HomeworkBacklogList.jsx
// 교사: 주를 넘겨서도 안 낸 과제를 주차별로.
//
// 목표는 "그 주 학생 전원이 과제를 다 하는 것"이다. 그래서 학생이 아니라
// 주가 주인공이다 — 주마다 완료율과 남은 학생을 보여주고, 100%가 되면
// "완료"로 닫힌다. 어느 주가 아직 안 끝났는지가 한 눈에 보여야 한다.
//
// 이번 주는 여기 없다. 미제출 보기가 맡고 있고, 두 곳에 같은 학생이
// 나오면 어디를 봐야 할지 헷갈린다.
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { visibleStudents } from '../../utils/classAccess'
import { backlogWeeks } from '../../utils/homeworkBacklog'
import { todayKST } from '../../utils/datetime'
import { WEEKDAY_LABELS, CATEGORY_LABELS } from '../../constants/homework'
import CollapsibleSection from '../ui/CollapsibleSection'

// 완료율 막대. 숫자만 있으면 주끼리 견주기 어렵다.
// 색은 쓰지 않는다 — 몇 %든 "아직 안 끝난 주"라는 뜻은 같다.
function RateBar({ rate }) {
  return (
    <span className="inline-block w-16 h-1.5 bg-surface-alt rounded-sm overflow-hidden align-middle">
      <span className="block h-full bg-navy" style={{ width: `${rate}%` }} />
    </span>
  )
}

export default function HomeworkBacklogList() {
  const { user } = useAuth()
  const {
    students: allStudents, classes = [],
    homeworkSets = [], homeworkDays = [], homeworkSubmissions = [],
    homeworkReopens = [], openHomeworkDay, closeHomeworkDay,
  } = useData()

  // 누르는 동안 같은 버튼이 두 번 눌리지 않게 잡아 둔다
  const [busy,  setBusy]  = useState(null)
  const [error, setError] = useState('')

  const today = todayKST()
  // 담당 반 판단은 classAccess 한 곳에서만 한다
  const students = visibleStudents(allStudents, classes, user)
  const weeks = backlogWeeks({
    students, sets: homeworkSets, days: homeworkDays,
    submissions: homeworkSubmissions, today,
  })

  const reopened  = new Set(homeworkReopens.map((r) => `${r.dayId}:${r.studentId}`))
  const classNameOf = (id) => classes.find((c) => c.id === id)?.name ?? '반 없음'

  // 되돌릴 수 있는 동작이라 확인을 받지 않는다 — 잘못 눌러도 "닫기"로 되돌린다.
  async function toggleOpen(day, student, isOpen) {
    const key = `${day.id}:${student.id}`
    setBusy(key)
    setError('')
    const ok = isOpen
      ? await closeHomeworkDay({ dayId: day.id, studentId: student.id })
      : await openHomeworkDay({ dayId: day.id, studentId: student.id, openedBy: user.id })
    setBusy(null)
    if (!ok) {
      setError(`${student.name} 학생의 ${WEEKDAY_LABELS[day.weekday]}요일을 바꾸지 못했습니다. 잠시 뒤 다시 해보세요.`)
    }
  }

  if (weeks.length === 0) {
    return (
      <p className="text-center text-ink-faint py-12">
        지난 주까지 밀린 과제가 없습니다.
      </p>
    )
  }

  const 남은주 = weeks.filter((w) => w.students.length > 0).length

  return (
    <div>
      <p className="text-sm text-ink-mute mb-3">
        아직 안 끝난 주가 <span className="font-semibold text-ink">{남은주}</span>개입니다.
        전원이 다 내면 그 주는 완료로 닫힙니다.
      </p>

      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-line rounded px-3 py-2 mb-3">
          {error}
        </p>
      )}

      <div>
        {weeks.map((week) => (
          <CollapsibleSection
            key={week.weekStart}
            title={
              <span className="block min-w-0">
                <span className="truncate">{week.weekStart} 주</span>
                <span className="flex items-center gap-2 mt-1.5 text-xs font-normal text-ink-mute">
                  <RateBar rate={week.rate} />
                  {week.students.length === 0
                    ? <span className="text-navy font-semibold">완료</span>
                    : <>
                        <span className="tabular-nums">{week.rate}%</span>
                        <span>남은 {week.students.length}명</span>
                      </>}
                </span>
              </span>
            }
          >
            {week.students.length === 0 ? (
              <p className="text-sm text-ink-faint">이 주는 전원이 다 냈습니다.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {week.students.map(({ student, days }) => (
                  <div key={student.id}>
                    <p className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-semibold text-ink">{student.name}</span>
                      <span className="text-xs text-ink-faint">{classNameOf(student.classId)}</span>
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {days.map(({ day, set }) => {
                        const key    = `${day.id}:${student.id}`
                        const isOpen = reopened.has(key)
                        return (
                          <div key={day.id} className="flex items-center justify-between gap-2">
                            <span className="text-sm text-ink-soft">
                              {CATEGORY_LABELS[set.category]} · {WEEKDAY_LABELS[day.weekday]}요일 · {day.date}
                            </span>
                            <button
                              onClick={() => toggleOpen(day, student, isOpen)}
                              disabled={busy === key}
                              className={`text-xs px-3 py-1 rounded whitespace-nowrap disabled:opacity-50 ${
                                isOpen
                                  ? 'text-ink-faint hover:text-ink-soft bg-surface-alt'
                                  : 'bg-navy text-white hover:opacity-90'
                              }`}
                            >
                              {isOpen ? '닫기' : '열어주기'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        ))}
      </div>
    </div>
  )
}
