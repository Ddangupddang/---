// src/pages/Reports.jsx
// 진도 리포트 — 교사/관리자만 접근 가능
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import Layout from '../components/Layout'
import ReportHomeworkChecks from '../components/reports/ReportHomeworkChecks'
import PageTitle from '../components/ui/PageTitle'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import NoAssignedClass from '../components/NoAssignedClass'
import { visibleClasses, visibleStudents, canSeeClass, hasNoAssignedClass } from '../utils/classAccess'

export default function Reports() {
  const { user } = useAuth()
  const { classes: allClasses, students: allStudents, reports, staffProfiles, addReport, updateReportChecks, deleteReport } = useData()
  // 관리자는 전체, 교사는 담당 반만
  const classes  = visibleClasses(allClasses, user)
  const students = visibleStudents(allStudents, allClasses, user)

  const [view,          setView]          = useState('list')
  const [selected,      setSelected]      = useState(null)
  const [filterClassId, setFilterClassId] = useState('all')

  // 학생은 이 페이지에 접근 불가
  if (user.role === 'student') {
    return (
      <Layout>
        <div className="text-center py-20 text-ink-faint">
          <p className="text-lg">접근 권한이 없습니다.</p>
        </div>
      </Layout>
    )
  }

  // 담당 반 리포트만 — 그 안에서 다시 반 필터를 적용한다
  const filteredReports = reports
    .filter((r) => canSeeClass(allClasses, user, r.classId))
    .filter((r) => filterClassId === 'all' || r.classId === Number(filterClassId))
    .sort((a, b) => b.date.localeCompare(a.date))

  if (hasNoAssignedClass(allClasses, user)) {
    return (
      <Layout>
        <PageTitle title="진도 리포트" />
        <NoAssignedClass />
      </Layout>
    )
  }

  function classStudents(classId) {
    return students.filter((s) => s.classId === classId)
  }

  // ────────── list 뷰 ──────────
  if (view === 'list') {
    return (
      <Layout>
      <div>
        <div className="flex justify-between items-center mb-4">
          <PageTitle title="진도 리포트" />
          <Button onClick={() => setView('create')}>+ 리포트 작성</Button>
        </div>

        {/* 반 탭 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterClassId('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filterClassId === 'all' ? 'bg-ink text-white' : 'bg-surface-alt text-ink-soft hover:bg-line-soft'
            }`}
          >
            전체
          </button>
          {classes.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterClassId(String(c.id))}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filterClassId === String(c.id) ? 'bg-ink text-white' : 'bg-surface-alt text-ink-soft hover:bg-line-soft'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* 리포트 목록 */}
        {filteredReports.length === 0 ? (
          <p className="text-center text-ink-faint py-12">리포트가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredReports.map((r) => {
              const cls           = classes.find((c) => c.id === r.classId)
              const totalStudents = classStudents(r.classId).length
              const doneCount     = r.studentChecks.filter((sc) => sc.done).length
              const author        = staffProfiles.find((p) => p.id === r.createdBy)
              const canDelete     = user.role === 'admin' || r.createdBy === user.id

              return (
                <div key={r.id} className="bg-surface border border-line rounded p-4 hover:bg-surface-alt transition-colors">
                  <div
                    onClick={() => { setSelected(r); setView('detail') }}
                    className="cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge tone="navy">{cls?.name}</Badge>
                          <span className="text-xs text-ink-faint">{r.subject}</span>
                        </div>
                        <p className="text-sm font-semibold text-ink line-clamp-1">{r.content}</p>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className="text-sm font-bold text-ink">{doneCount}/{totalStudents}</p>
                        <p className="text-xs text-ink-faint">과제 완료</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div
                      onClick={() => { setSelected(r); setView('detail') }}
                      className="flex items-center gap-2 text-xs text-ink-faint cursor-pointer"
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
                        className="text-xs text-ink-faint hover:text-danger transition-colors"
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
          const res = await addReport(newReport)
          // 실패했는데 목록으로 넘기면 올라간 줄 알고 지나간다
          if (res?.error) return res.error
          setView('list')
          return null
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

  async function handleChecksChange(updated) {
    setChecks(updated)
    await onUpdateChecks(updated)
  }

  return (
    <div>
      <button onClick={onBack} className="text-sm text-ink-mute hover:text-ink-soft mb-2 block">
        ← 목록
      </button>
      <PageTitle title="진도 리포트" />

      {/* 기본 정보 */}
      <div className="bg-surface border border-line rounded p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Badge tone="navy">{cls?.name}</Badge>
          <span className="text-xs text-ink-faint">{report.subject}</span>
          <span className="text-xs text-ink-faint">· {report.date}</span>
          <span className="text-xs text-ink-faint">· {author?.name ?? '알 수 없음'}</span>
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold text-ink-mute mb-1">진도 내용</p>
          <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-wrap">{report.content}</p>
        </div>

        {report.homework && (
          <div>
            <p className="text-xs font-semibold text-ink-mute mb-1">과제</p>
            <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-wrap">{report.homework}</p>
          </div>
        )}
      </div>

      {/* 과제 수행 체크 — 제출 기록 자동 반영 + 교사 수정 */}
      <ReportHomeworkChecks
        date={report.date}
        students={studs}
        checks={checks}
        onChange={handleChecksChange}
      />
    </div>
  )
}

// ────────── CreateView 컴포넌트 ──────────
function CreateView({ user, onSubmit, onCancel, classStudents }) {
  const { classes: allClasses } = useData()
  // 남의 반 리포트를 만들 수 없도록 선택지도 담당 반으로 제한한다
  const classes = visibleClasses(allClasses, user)
  const [classId,    setClassId]    = useState(String(classes[0]?.id ?? ''))
  const [date,       setDate]       = useState(new Date().toISOString().slice(0, 10))
  const [subject,    setSubject]    = useState('')
  const [content,    setContent]    = useState('')
  const [homework,   setHomework]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')
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

    setError('')
    const failed = await onSubmit({
      classId:       Number(classId),
      date,
      subject:       subject.trim(),
      content:       content.trim(),
      homework:      homework.trim(),
      studentChecks,
      createdBy:     user.id,
    })
    if (failed) setError(failed)
    setSubmitting(false)
  }

  return (
    <div>
      <button onClick={onCancel} className="text-sm text-ink-mute hover:text-ink-soft mb-2 block">← 목록</button>
      <PageTitle title="리포트 작성" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-ink-soft mb-1">반</label>
            <select
              value={classId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            >
              {classes.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-ink-soft mb-1">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">과목</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="예: 독서, 문학, 화법과 작문"
            className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">진도 내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="오늘 수업한 내용을 입력하세요"
            rows={4}
            className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy resize-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">
            과제 <span className="text-ink-faint font-normal">(선택)</span>
          </label>
          <textarea
            value={homework}
            onChange={(e) => setHomework(e.target.value)}
            placeholder="과제 내용을 입력하세요"
            rows={2}
            className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy resize-none"
          />
        </div>

        {studs.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">
              과제 수행 현황{' '}
              <span className="text-ink-faint font-normal">
                ({Object.values(checks).filter(Boolean).length}/{studs.length}명)
              </span>
            </label>
            <div className="flex flex-col gap-2">
              {studs.map((s) => (
                <div
                  key={s.id}
                  onClick={() => toggleCheck(s.id)}
                  className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors ${
                    checks[s.id] ? 'bg-navy-soft' : 'bg-surface-alt hover:bg-line-soft'
                  }`}
                >
                  <span className="text-sm font-medium text-ink">{s.name}</span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    checks[s.id] ? 'bg-navy text-white' : 'bg-line text-ink-faint'
                  }`}>
                    {checks[s.id] ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div data-testid="report-error" className="bg-danger-soft border border-line rounded p-4">
            <p className="text-sm text-danger font-medium">
              리포트 등록에 실패했습니다. 입력한 내용은 그대로 두었으니 다시 시도해 주세요.
            </p>
            <p className="text-xs text-danger mt-1">사유: {error}</p>
          </div>
        )}

        <Button type="submit" disabled={!subject.trim() || !content.trim() || submitting} className="w-full">
          {submitting ? '저장 중...' : '리포트 저장'}
        </Button>
      </form>
    </div>
  )
}
