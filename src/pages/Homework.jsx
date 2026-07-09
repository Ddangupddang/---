// src/pages/Homework.jsx
// 과제 — 교사: 출제·제출현황 / 학생: 응시·결과확인
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import Layout from '../components/Layout'
import ChoiceGrid from '../components/ChoiceGrid'
import { gradeHomework, isLateSubmission } from '../utils/homework'

export default function Homework() {
  const { user } = useAuth()
  const {
    classes, students,
    homework, homeworkSubmissions,
    addHomework, deleteHomework, upsertHomeworkSubmission,
  } = useData()

  const [view,          setView]          = useState('list')
  const [selectedHw,    setSelectedHw]    = useState(null)
  const [selectedSub,   setSelectedSub]   = useState(null)
  const [filterClassId, setFilterClassId] = useState('all')

  // selectedHw가 가리키는 과제가 갱신되면 최신 버전으로 동기화
  useEffect(() => {
    if (selectedHw) {
      const updated = homework.find((h) => h.id === selectedHw.id)
      // 목록(homework)이 갱신될 때 선택된 항목을 최신 버전으로 동기화
      if (updated) setSelectedHw(updated)
    }
    // selectedHw는 의존성에서 제외 — 목록(homework) 변경 시에만 동기화하려는 의도
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homework])

  const isStaff = user.role === 'teacher' || user.role === 'admin'

  // 반별 학생
  function classStudents(classId) {
    return students.filter((s) => s.classId === classId)
  }
  // 특정 과제·학생의 제출
  function submissionOf(homeworkId, studentId) {
    return homeworkSubmissions.find((s) => s.homeworkId === homeworkId && s.studentId === studentId)
  }
  // 목록 필터 (학생은 본인 반만)
  const visibleHomework = homework.filter((h) => {
    if (user.role === 'student') return h.classId === user.classId
    return filterClassId === 'all' || h.classId === Number(filterClassId)
  })

  // ────────── list 뷰 ──────────
  if (view === 'list') {
    return (
      <Layout>
        <div>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold text-[#2B2B2B]">과제</h1>
            {isStaff && (
              <button
                onClick={() => setView('create')}
                className="px-4 py-2 bg-[#2B2B2B] text-white rounded-lg text-sm"
              >
                + 과제 만들기
              </button>
            )}
          </div>

          {/* 반 필터 (교사/관리자만) */}
          {isStaff && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              <button
                onClick={() => setFilterClassId('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filterClassId === 'all' ? 'bg-[#2B2B2B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              {classes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFilterClassId(String(c.id))}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    filterClassId === String(c.id) ? 'bg-[#2B2B2B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {visibleHomework.length === 0 ? (
            <p className="text-center text-gray-400 py-12">과제가 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {visibleHomework.map((hw) => {
                const cls = classes.find((c) => c.id === hw.classId)
                if (isStaff) {
                  const total    = classStudents(hw.classId).length
                  const subCount = homeworkSubmissions.filter((s) => s.homeworkId === hw.id).length
                  const canDelete = user.role === 'admin' || hw.teacherId === user.id
                  return (
                    <div key={hw.id} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div onClick={() => { setSelectedHw(hw); setView('submissions') }} className="cursor-pointer">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs bg-[#5B8FD4]/15 text-[#5B8FD4] px-2 py-0.5 rounded-full font-medium">
                                {cls?.name}
                              </span>
                              <span className="text-xs text-gray-400">마감 {hw.dueDate}</span>
                            </div>
                            <p className="font-semibold text-[#2B2B2B]">{hw.title}</p>
                            <p className="text-xs text-gray-400 mt-1">{hw.questions.length}문항</p>
                          </div>
                          <div className="text-right ml-3 shrink-0">
                            <p className="text-sm font-bold text-[#2B2B2B]">{subCount}/{total}</p>
                            <p className="text-xs text-gray-400">제출</p>
                          </div>
                        </div>
                      </div>
                      {canDelete && (
                        <div className="flex justify-end mt-1">
                          <button
                            onClick={() => { if (confirm(`"${hw.title}" 과제를 삭제하시겠습니까?`)) deleteHomework(hw.id) }}
                            className="text-xs text-gray-300 hover:text-[#C0392B] transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  )
                }
                // ── 학생 카드 ──
                const mySub = submissionOf(hw.id, user.studentId)
                let badge
                if (!mySub) {
                  badge = { label: '미제출', color: 'bg-gray-100 text-gray-500' }
                } else if (isLateSubmission(mySub.submittedAt, hw.dueDate)) {
                  badge = { label: '지각제출', color: 'bg-[#C0392B]/10 text-[#C0392B]' }
                } else {
                  badge = { label: '제출완료', color: 'bg-green-100 text-green-700' }
                }
                return (
                  <div
                    key={hw.id}
                    onClick={() => {
                      setSelectedHw(hw)
                      setView(mySub ? 'result' : 'take')
                    }}
                    className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs text-gray-400">마감 {hw.dueDate}</span>
                        </div>
                        <p className="font-semibold text-[#2B2B2B]">{hw.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{hw.questions.length}문항</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Layout>
    )
  }

  // ────────── create 뷰 ──────────
  if (view === 'create') {
    if (!isStaff) { setView('list'); return null }
    return (
      <Layout>
        <CreateView
          classes={classes}
          user={user}
          onSubmit={async (newHw) => { await addHomework(newHw); setView('list') }}
          onCancel={() => setView('list')}
        />
      </Layout>
    )
  }

  // ────────── submissions 뷰 (교사: 제출 현황) ──────────
  if (view === 'submissions') {
    if (!isStaff) { setView('list'); return null }
    const studs = classStudents(selectedHw.classId)
    const subsByStudentId = Object.fromEntries(
      homeworkSubmissions
        .filter((s) => s.homeworkId === selectedHw.id)
        .map((s) => [s.studentId, s])
    )
    const submitted    = studs.filter((s) => subsByStudentId[s.id])
    const notSubmitted = studs.filter((s) => !subsByStudentId[s.id])
    return (
      <Layout>
        <div>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700">← 목록</button>
            <h1 className="text-xl font-bold text-[#2B2B2B]">{selectedHw.title}</h1>
          </div>

          <h2 className="text-base font-semibold text-gray-700 mb-3">
            제출 ({submitted.length}/{studs.length})
          </h2>
          {submitted.length === 0 ? (
            <p className="text-center text-gray-400 py-6">제출한 학생이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2 mb-6">
              {submitted.map((s) => {
                const sub  = subsByStudentId[s.id]
                const late = isLateSubmission(sub.submittedAt, selectedHw.dueDate)
                const { correctCount, total } = gradeHomework(selectedHw.questions, sub.answers)
                return (
                  <div
                    key={s.id}
                    onClick={() => { setSelectedSub(sub); setSelectedHw(selectedHw); setView('detail') }}
                    className="bg-white rounded-xl p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#2B2B2B]">{s.name}</span>
                      {late && (
                        <span className="text-xs bg-[#C0392B] text-white px-2 py-0.5 rounded-full">지각</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{correctCount}/{total} 정답</span>
                  </div>
                )
              })}
            </div>
          )}

          <h2 className="text-base font-semibold text-gray-700 mb-3">
            미제출 ({notSubmitted.length}/{studs.length})
          </h2>
          {notSubmitted.length === 0 ? (
            <p className="text-center text-gray-400 py-6">모든 학생이 제출했습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {notSubmitted.map((s) => (
                <div key={s.id} className="bg-gray-50 rounded-xl p-3 text-sm text-gray-500">{s.name}</div>
              ))}
            </div>
          )}
        </div>
      </Layout>
    )
  }

  // ────────── detail 뷰 (교사: 학생 답안 열람) ──────────
  if (view === 'detail') {
    if (!isStaff) { setView('list'); return null }
    const student = students.find((s) => s.id === selectedSub.studentId)
    const valueMap   = Object.fromEntries(selectedSub.answers.map((a) => [a.number, a.answer]))
    const answerKey  = Object.fromEntries(selectedHw.questions.map((q) => [q.number, q.answer]))
    const { correctCount, total } = gradeHomework(selectedHw.questions, selectedSub.answers)
    return (
      <Layout>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => setView('submissions')} className="text-sm text-gray-500 hover:text-gray-700">← 제출 현황</button>
          </div>
          <h1 className="text-xl font-bold text-[#2B2B2B] mb-1">{student?.name} — 답안</h1>
          <p className="text-sm text-gray-500 mb-4">{selectedHw.title} · {correctCount}/{total} 정답</p>
          <ChoiceGrid
            count={selectedHw.questions.length}
            mode="result"
            values={valueMap}
            answerKey={answerKey}
            onChange={() => {}}
          />
        </div>
      </Layout>
    )
  }

  // ────────── take 뷰 (학생: 응시/수정) ──────────
  if (view === 'take') {
    if (user.role !== 'student') { setView('list'); return null }
    const existing = submissionOf(selectedHw.id, user.studentId)
    // 마감 후 + 이미 제출한 경우: 수정 불가 → 결과 화면으로 (스펙: "마감 후 + 제출완료 → 잠김")
    const pastDue = new Date().toISOString().slice(0, 10) > selectedHw.dueDate
    if (existing && pastDue) { setView('result'); return null }
    return (
      <Layout>
        <TakeView
          homework={selectedHw}
          existing={existing}
          onSubmit={async (answers) => {
            await upsertHomeworkSubmission({
              homeworkId: selectedHw.id,
              studentId:  user.studentId,
              answers,
            })
            setView('result')
          }}
          onBack={() => setView('list')}
        />
      </Layout>
    )
  }

  // ────────── result 뷰 (학생: 결과 확인) ──────────
  if (view === 'result') {
    if (user.role !== 'student') { setView('list'); return null }
    const mySub = submissionOf(selectedHw.id, user.studentId)
    if (!mySub) { setView('take'); return null }
    const valueMap  = Object.fromEntries(mySub.answers.map((a) => [a.number, a.answer]))
    const answerKey = Object.fromEntries(selectedHw.questions.map((q) => [q.number, q.answer]))
    const { correctCount, total } = gradeHomework(selectedHw.questions, mySub.answers)
    const beforeDue = new Date().toISOString().slice(0, 10) <= selectedHw.dueDate
    return (
      <Layout>
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-700">← 목록</button>
            <h1 className="text-xl font-bold text-[#2B2B2B]">{selectedHw.title} — 결과</h1>
          </div>

          <div className="bg-[#2B2B2B] text-white rounded-2xl p-6 text-center mb-4">
            <p className="text-sm text-white/60 mb-1">정답</p>
            <p className="text-4xl font-bold">{correctCount}<span className="text-2xl text-white/50"> / {total}</span></p>
          </div>

          {beforeDue && (
            <button
              onClick={() => setView('take')}
              className="w-full py-2.5 mb-4 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
            >
              답 수정하기 (마감 전까지 가능)
            </button>
          )}

          <ChoiceGrid
            count={selectedHw.questions.length}
            mode="result"
            values={valueMap}
            answerKey={answerKey}
            onChange={() => {}}
          />
        </div>
      </Layout>
    )
  }

  return null
}

// ────────── TakeView — 학생 응시/수정 ──────────
function TakeView({ homework, existing, onSubmit, onBack }) {
  // 기존 제출이 있으면 그 답을 초기값으로 (마감 전 수정)
  const [answers, setAnswers] = useState(() =>
    existing ? Object.fromEntries(existing.answers.map((a) => [a.number, a.answer])) : {}
  )
  const [submitting, setSubmitting] = useState(false)

  const count       = homework.questions.length
  const answeredNum = Object.keys(answers).length
  const allAnswered = answeredNum === count
  const isLate      = new Date().toISOString().slice(0, 10) > homework.dueDate

  async function handleSubmit() {
    if (!allAnswered || submitting) return
    setSubmitting(true)
    const payload = homework.questions.map((q) => ({
      number: q.number,
      answer: answers[q.number],
    }))
    try {
      await onSubmit(payload)
    } finally {
      // 제출 성공 시 부모가 result 뷰로 전환해 이 컴포넌트가 언마운트되므로
      // 아래 setState는 무시된다. 실패 시에는 버튼을 다시 활성화해 재시도 가능하게 한다.
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">← 목록</button>
      </div>
      <h1 className="text-xl font-bold text-[#2B2B2B] mb-1">{homework.title}</h1>
      <p className="text-sm text-gray-500 mb-1">{count}문항 · 마감 {homework.dueDate}</p>
      {isLate && (
        <p className="text-xs text-[#C0392B] mb-4">마감일이 지났습니다. 지금 제출하면 지각 제출로 표시됩니다.</p>
      )}

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">답안 입력</span>
          <span className="text-xs text-gray-400">{answeredNum}/{count} 입력됨</span>
        </div>
        <ChoiceGrid
          count={count}
          values={answers}
          mode="input"
          onChange={(number, choice) => setAnswers((prev) => ({ ...prev, [number]: choice }))}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!allAnswered || submitting}
        className="w-full py-3 bg-[#2B2B2B] text-white rounded-xl font-medium disabled:opacity-40"
      >
        {submitting ? '제출 중...' : existing ? '다시 제출하기' : '제출하기'}
      </button>
    </div>
  )
}

// ────────── CreateView — 과제 출제 ──────────
function CreateView({ classes, user, onSubmit, onCancel }) {
  const [title,     setTitle]     = useState('')
  const [classId,   setClassId]   = useState(String(classes[0]?.id ?? ''))
  const [dueDate,   setDueDate]   = useState(new Date().toISOString().slice(0, 10))
  const [count,     setCount]     = useState(0)
  const [answers,   setAnswers]   = useState({}) // { [number]: '③' }
  const [saving,    setSaving]    = useState(false)

  function handleCountChange(val) {
    const n = Math.max(0, Math.min(300, Number(val) || 0))
    setCount(n)
    // 문항 수가 줄면 초과분 정답 제거
    setAnswers((prev) => {
      const next = {}
      for (let i = 1; i <= n; i++) if (prev[i]) next[i] = prev[i]
      return next
    })
  }

  const allAnswered = count > 0 && Object.keys(answers).length === count

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !allAnswered || saving) return
    setSaving(true)
    const questions = Array.from({ length: count }, (_, i) => ({
      number: i + 1,
      answer: answers[i + 1],
    }))
    await onSubmit({
      title:     title.trim(),
      classId:   Number(classId),
      teacherId: user.id,
      dueDate,
      questions,
    })
    setSaving(false)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">← 목록</button>
        <h1 className="text-xl font-bold text-[#2B2B2B]">과제 만들기</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 4월 2주차 독서 과제"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
            required
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">대상 반</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
            >
              {classes.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">마감일</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">문항 수</label>
          <input
            type="number"
            min="0"
            max="300"
            value={count || ''}
            onChange={(e) => handleCountChange(e.target.value)}
            placeholder="예: 100"
            className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
          />
        </div>

        {count > 0 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">정답 입력</label>
              <span className="text-xs text-gray-400">
                {Object.keys(answers).length}/{count} 입력됨 · 키보드 1~5로 빠르게 입력
              </span>
            </div>
            <ChoiceGrid
              count={count}
              values={answers}
              mode="input"
              onChange={(number, choice) => setAnswers((prev) => ({ ...prev, [number]: choice }))}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={!title.trim() || !allAnswered || saving}
          className="w-full py-3 bg-[#2B2B2B] text-white rounded-xl font-medium disabled:opacity-40"
        >
          {saving ? '저장 중...' : '과제 저장'}
        </button>
      </form>
    </div>
  )
}
