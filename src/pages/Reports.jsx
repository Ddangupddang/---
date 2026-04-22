// src/pages/Reports.jsx
// 진도 리포트 — 교사/관리자만 접근 가능
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import Layout from '../components/Layout'

export default function Reports() {
  const { user } = useAuth()
  const { classes, students, reports, staffProfiles, addReport, updateReportChecks, deleteReport } = useData()

  const [view,          setView]          = useState('list')
  const [selected,      setSelected]      = useState(null)
  const [filterClassId, setFilterClassId] = useState('all')

  // 학생은 이 페이지에 접근 불가
  if (user.role === 'student') {
    return (
      <Layout>
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">접근 권한이 없습니다.</p>
        </div>
      </Layout>
    )
  }

  // 반 필터링
  const filteredReports = reports
    .filter((r) => filterClassId === 'all' || r.classId === Number(filterClassId))
    .sort((a, b) => b.date.localeCompare(a.date))

  function classStudents(classId) {
    return students.filter((s) => s.classId === classId)
  }

  // ────────── list 뷰 ──────────
  if (view === 'list') {
    return (
      <Layout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-[#2B2B2B]">진도 리포트</h1>
          <button
            onClick={() => setView('create')}
            className="px-4 py-2 bg-[#2B2B2B] text-white rounded-lg text-sm"
          >
            + 리포트 작성
          </button>
        </div>

        {/* 반 탭 */}
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

        {/* 리포트 목록 */}
        {filteredReports.length === 0 ? (
          <p className="text-center text-gray-400 py-12">리포트가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredReports.map((r) => {
              const cls           = classes.find((c) => c.id === r.classId)
              const totalStudents = classStudents(r.classId).length
              const doneCount     = r.studentChecks.filter((sc) => sc.done).length
              const author        = staffProfiles.find((p) => p.id === r.createdBy)
              const canDelete     = user.role === 'admin' || r.createdBy === user.id

              return (
                <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div
                    onClick={() => { setSelected(r); setView('detail') }}
                    className="cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-[#5B8FD4]/15 text-[#5B8FD4] px-2 py-0.5 rounded-full font-medium">
                            {cls?.name}
                          </span>
                          <span className="text-xs text-gray-400">{r.subject}</span>
                        </div>
                        <p className="text-sm font-semibold text-[#2B2B2B] line-clamp-1">{r.content}</p>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className="text-sm font-bold text-[#2B2B2B]">{doneCount}/{totalStudents}</p>
                        <p className="text-xs text-gray-400">과제 완료</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div
                      onClick={() => { setSelected(r); setView('detail') }}
                      className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer"
                    >
                      <span>{r.date}</span>
                      <span>·</span>
                      <span>{author?.name ?? '알 수 없음'}</span>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => {
                          if (confirm('리포트를 삭제하시겠습니까?')) deleteReport(r.id)
                        }}
                        className="text-xs text-gray-300 hover:text-[#C0392B] transition-colors"
                      >
                        삭제
                      </button>
                    )}
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

  // ────────── detail 뷰 ──────────
  if (view === 'detail') {
    return (
      <Layout>
      <DetailView
        report={selected}
        onUpdateChecks={async (studentChecks) => {
          await updateReportChecks(selected.id, studentChecks)
          setSelected((prev) => ({ ...prev, studentChecks }))
        }}
        onBack={() => setView('list')}
        classStudents={classStudents}
        staffProfiles={staffProfiles}
      />
      </Layout>
    )
  }

  // ────────── create 뷰 ──────────
  if (view === 'create') {
    return (
      <Layout>
      <CreateView
        user={user}
        onSubmit={async (newReport) => {
          await addReport(newReport)
          setView('list')
        }}
        onCancel={() => setView('list')}
        classStudents={classStudents}
      />
      </Layout>
    )
  }

  return null
}

// ────────── DetailView 컴포넌트 ──────────
function DetailView({ report, onUpdateChecks, onBack, classStudents, staffProfiles }) {
  const { classes } = useData()
  const cls    = classes.find((c) => c.id === report.classId)
  const author = staffProfiles.find((p) => p.id === report.createdBy)
  const studs  = classStudents(report.classId)
  const [checks, setChecks] = useState(report.studentChecks)

  async function toggleCheck(studentId) {
    const updated = checks.map((sc) =>
      sc.studentId === studentId ? { ...sc, done: !sc.done } : sc
    )
    setChecks(updated)
    await onUpdateChecks(updated)
  }

  const doneCount = checks.filter((sc) => sc.done).length

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">
          ← 목록
        </button>
        <h1 className="text-xl font-bold text-[#2B2B2B]">진도 리포트</h1>
      </div>

      {/* 기본 정보 */}
      <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs bg-[#5B8FD4]/15 text-[#5B8FD4] px-2 py-0.5 rounded-full font-medium">
            {cls?.name}
          </span>
          <span className="text-xs text-gray-400">{report.subject}</span>
          <span className="text-xs text-gray-400">· {report.date}</span>
          <span className="text-xs text-gray-400">· {author?.name ?? '알 수 없음'}</span>
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">진도 내용</p>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{report.content}</p>
        </div>

        {report.homework && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">과제</p>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{report.homework}</p>
          </div>
        )}
      </div>

      {/* 과제 수행 체크 */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm font-semibold text-gray-700">과제 수행 현황</p>
          <span className="text-sm font-bold text-[#2B2B2B]">{doneCount} / {studs.length}명</span>
        </div>

        <div className="flex flex-col gap-2">
          {studs.map((s) => {
            const check = checks.find((sc) => sc.studentId === s.id)
            const done  = check?.done ?? false
            return (
              <div
                key={s.id}
                onClick={() => toggleCheck(s.id)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  done ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <span className="text-sm font-medium text-[#2B2B2B]">{s.name}</span>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {done ? '✓' : ''}
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">* 학생 이름을 클릭하면 체크/해제됩니다.</p>
      </div>
    </div>
  )
}

// ────────── CreateView 컴포넌트 ──────────
function CreateView({ user, onSubmit, onCancel, classStudents }) {
  const { classes } = useData()
  const [classId,    setClassId]    = useState(String(classes[0]?.id ?? ''))
  const [date,       setDate]       = useState(new Date().toISOString().slice(0, 10))
  const [subject,    setSubject]    = useState('')
  const [content,    setContent]    = useState('')
  const [homework,   setHomework]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checks,     setChecks]     = useState({})

  const studs = classStudents(Number(classId))

  function toggleCheck(studentId) {
    setChecks((prev) => ({ ...prev, [studentId]: !prev[studentId] }))
  }

  function handleClassChange(val) {
    setClassId(val)
    setChecks({})
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!subject.trim() || !content.trim() || submitting) return
    setSubmitting(true)

    const studentChecks = classStudents(Number(classId)).map((s) => ({
      studentId: s.id,
      done: checks[s.id] ?? false,
    }))

    await onSubmit({
      classId:       Number(classId),
      date,
      subject:       subject.trim(),
      content:       content.trim(),
      homework:      homework.trim(),
      studentChecks,
      createdBy:     user.id,
    })
    setSubmitting(false)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">← 목록</button>
        <h1 className="text-xl font-bold text-[#2B2B2B]">리포트 작성</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">반</label>
            <select
              value={classId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
            >
              {classes.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">과목</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="예: 독서, 문학, 화법과 작문"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">진도 내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="오늘 수업한 내용을 입력하세요"
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4] resize-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            과제 <span className="text-gray-400 font-normal">(선택)</span>
          </label>
          <textarea
            value={homework}
            onChange={(e) => setHomework(e.target.value)}
            placeholder="과제 내용을 입력하세요"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4] resize-none"
          />
        </div>

        {studs.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              과제 수행 현황{' '}
              <span className="text-gray-400 font-normal">
                ({Object.values(checks).filter(Boolean).length}/{studs.length}명)
              </span>
            </label>
            <div className="flex flex-col gap-2">
              {studs.map((s) => (
                <div
                  key={s.id}
                  onClick={() => toggleCheck(s.id)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    checks[s.id] ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-sm font-medium text-[#2B2B2B]">{s.name}</span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    checks[s.id] ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {checks[s.id] ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!subject.trim() || !content.trim() || submitting}
          className="w-full py-3 bg-[#2B2B2B] text-white rounded-xl font-medium disabled:opacity-40"
        >
          {submitting ? '저장 중...' : '리포트 저장'}
        </button>
      </form>
    </div>
  )
}
