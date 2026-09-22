// src/components/homework/PendingHomeworkList.jsx
// 교사: 이번 주 기한이 지난 과제를 안 낸 학생을 한 목록으로.
//
// 제출 현황은 내신/정시 → 반 → 주차 → 요일로 잘게 나뉘어 있다. 그건 "이 요일을
// 누가 냈나"를 볼 때 맞는 모양인데, 대시보드에서 알고 싶은 건 "오늘 몇 명을
// 불러야 하나"다. 그래서 여기서는 칸막이를 없애고, 대시보드가 센 것과 똑같은
// 사람들을 그대로 보여준다 — 숫자와 명단이 어긋나지 않는다.
//
// 학생마다 접어 둔다. 한 학생이 사흘을 빠뜨리면 네 줄이 되어 15명이면
// 화면 몇 장이 된다. 접힌 한 줄에 이름·반·요일 칩을 두어, 펼치지 않고도
// "누구를 불러야 하나"가 보이게 했다. 열어주기 버튼만 펼쳐야 나온다.
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { visibleStudents } from '../../utils/classAccess'
import { pendingHomeworkStudents } from '../../utils/homeworkPending'
import { todayKST } from '../../utils/datetime'
import { WEEKDAY_LABELS, CATEGORY_LABELS } from '../../constants/homework'
import CollapsibleSection from '../ui/CollapsibleSection'

// 요일 칩의 상태 두 가지. 목록에는 기한이 지난 과제만 올라온다.
//   late     — 열어주지도 않았다. 불러야 할 학생이다.
//   reopened — 열어줬는데 아직 안 냈다.
// 색만으로 가르지 않게 칩 위에 설명(title)도 단다.
const CHIP = {
  late:     { label: '기한 지남', className: 'bg-danger-soft text-danger border-danger-soft' },
  reopened: { label: '열어줌',    className: 'bg-surface text-navy border-navy' },
}

// 같은 요일에 과제가 여럿이면(내신+정시) 칩은 하나만 — 더 급한 상태를 따른다.
// 칩이 "월 월 화 화"로 늘어서면 폰 한 줄을 넘기고, 읽기에도 겹친다.
const URGENCY = { late: 1, reopened: 0 }
function chipsByWeekday(days) {
  const byWeekday = new Map()
  for (const { day, state } of days) {
    const prev = byWeekday.get(day.weekday)
    if (!prev || URGENCY[state] > URGENCY[prev]) byWeekday.set(day.weekday, state)
  }
  // days가 날짜순이라 Map도 요일 순서대로 쌓인다
  return [...byWeekday].map(([weekday, state]) => ({ weekday, state }))
}

function DayChip({ state, children, title }) {
  return (
    <span
      data-chip={state}
      title={title}
      className={`inline-block whitespace-nowrap px-1.5 py-[2px] rounded-sm border text-xs font-bold ${CHIP[state].className}`}
    >
      {children}
    </span>
  )
}

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

  // 요일마다 칩 상태를 미리 붙여 둔다 — 접힌 줄과 펼친 줄이 같은 값을 쓴다
  const withState = rows.map(({ student, days }) => ({
    student,
    days: days.map(({ day, set }) => {
      const isOpen = reopened.has(`${day.id}:${student.id}`)
      return { day, set, isOpen, state: isOpen ? 'reopened' : 'late' }
    }),
  }))
  // 기한 지난 요일이 하나라도 있는 학생을 위로. 그 안에서는 원래 순서를 지킨다.
  // (sort는 같은 값끼리 순서를 바꾸지 않는다)
  const urgent = (r) => r.days.some((d) => d.state === 'late')
  withState.sort((a, b) => Number(urgent(b)) - Number(urgent(a)))
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
        이번 주 기한이 지난 과제를 안 낸 학생이 없습니다.
      </p>
    )
  }

  return (
    <div>
      <p className="text-sm text-ink-mute mb-3">
        기한이 지난 과제를 안 낸 학생 <span className="font-semibold text-ink">{rows.length}</span>명입니다.
        아직 낼 수 있는 과제(다음날까지)는 세지 않습니다.
      </p>

      {/* 칩 색이 무엇을 뜻하는지 — 처음 보는 교사도 읽을 수 있게 */}
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-mute mb-3">
        {Object.entries(CHIP).map(([state, { label }]) => (
          <span key={state} className="flex items-center gap-1">
            <DayChip state={state}>요일</DayChip>{label}
          </span>
        ))}
      </p>

      {error && (
        <p className="text-sm text-danger bg-danger-soft border border-line rounded px-3 py-2 mb-3">
          {error}
        </p>
      )}

      <div>
        {withState.map(({ student, days }) => (
          <CollapsibleSection
            key={student.id}
            title={
              // 폰에서 이름이 한 글자씩 세로로 쪼개지지 않게 두 줄로 나눈다.
              //   1줄: 이름(절대 안 줄임) + 반 이름(길면 … 으로 자름)
              //   2줄: 요일 칩 + 건수(넘치면 다음 줄로)
              <span className="block min-w-0">
                <span className="flex items-baseline gap-2 min-w-0">
                  <span className="shrink-0 whitespace-nowrap">{student.name}</span>
                  <span className="truncate text-xs font-normal text-ink-faint">{classNameOf(student.classId)}</span>
                </span>
                <span className="flex flex-wrap items-center gap-1 mt-1.5">
                  {chipsByWeekday(days).map(({ weekday, state }) => (
                    <DayChip key={weekday} state={state} title={`${WEEKDAY_LABELS[weekday]}요일 ${CHIP[state].label}`}>
                      {WEEKDAY_LABELS[weekday]}
                    </DayChip>
                  ))}
                  <span className="ml-1 text-xs font-normal text-ink-mute whitespace-nowrap">{days.length}건</span>
                </span>
              </span>
            }
          >
            <div className="flex flex-col gap-1.5">
              {days.map(({ day, set, isOpen }) => {
                const key = `${day.id}:${student.id}`
                // 목록에는 기한이 지난 것만 온다 — 모두 열어주기 대상이다.
                // 열어준 것은 셈에서 빼지 않는다. 열어줬어도 아직 안 낸 건 안 낸 것이다.
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
          </CollapsibleSection>
        ))}
      </div>
    </div>
  )
}
