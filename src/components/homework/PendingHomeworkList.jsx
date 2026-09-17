// src/components/homework/PendingHomeworkList.jsx
// 교사: 이번 주 마감이 지난 과제를 안 낸 학생을 한 목록으로.
//
// 제출 현황은 내신/정시 → 반 → 주차 → 요일로 잘게 나뉘어 있다. 그건 "이 요일을
// 누가 냈나"를 볼 때 맞는 모양인데, 대시보드에서 알고 싶은 건 "오늘 몇 명을
// 불러야 하나"다. 그래서 여기서는 칸막이를 없애고, 대시보드가 센 것과 똑같은
// 사람들을 그대로 보여준다 — 숫자와 명단이 어긋나지 않는다.
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { visibleStudents } from '../../utils/classAccess'
import { pendingHomeworkStudents } from '../../utils/homeworkPending'
import { canSubmitOn } from '../../utils/homeworkSelect'
import { todayKST } from '../../utils/datetime'
import { WEEKDAY_LABELS, CATEGORY_LABELS } from '../../constants/homework'

export default function PendingHomeworkList() {
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
  const rows = pendingHomeworkStudents({
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

  if (rows.length === 0) {
    return (
      <p className="text-center text-ink-faint py-12">
        이번 주 마감이 지난 과제를 안 낸 학생이 없습니다.
      </p>
    )
  }

  return (
    <div>
      <p className="text-sm text-ink-mute mb-3">
        마감이 지난 과제를 안 낸 학생 <span className="font-semibold text-ink">{rows.length}</span>명입니다.
        아직 마감 전인 과제는 세지 않습니다.
      </p>

      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-line rounded px-3 py-2 mb-3">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {rows.map(({ student, days }) => (
          <div key={student.id} className="bg-surface border border-line rounded p-3">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-semibold text-ink">{student.name}</span>
              <span className="text-xs text-ink-faint">{classNameOf(student.classId)}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {days.map(({ day, set }) => {
                const key    = `${day.id}:${student.id}`
                const isOpen = reopened.has(key)
                // 기한 자체가 지났는가 — 열어주기가 필요한 상황인지 본다.
                // 열어준 것은 셈에서 빼지 않는다. 열어줬어도 아직 안 낸 건 안 낸 것이다.
                const closed = !canSubmitOn(day, today)
                return (
                  <div key={day.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-ink-soft">
                      {CATEGORY_LABELS[set.category]} · {WEEKDAY_LABELS[day.weekday]}요일 · {day.date}
                    </span>
                    {closed ? (
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
                    ) : (
                      <span className="text-xs text-ink-faint whitespace-nowrap">아직 낼 수 있음</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
