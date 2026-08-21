// src/pages/Attendance.jsx
import { useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { checkAcademyWifi } from '../utils/checkWifi'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import PageTitle from '../components/ui/PageTitle'
import NoAssignedClass from '../components/NoAssignedClass'
import { visibleClasses, visibleStudents, hasNoAssignedClass } from '../utils/classAccess'

// 출석 상태의 의미별 톤. 팔레트에 초록·빨강·노랑이 따로 없어
// 출석=navy(긍정) · 지각=warn(주의) · 결석=danger(경고) · 미기록=neutral로 대응한다.
const statusConfig = {
  present: { label: '출석', tone: 'navy' },
  absent:  { label: '결석', tone: 'danger' },
  late:    { label: '지각', tone: 'warn' },
  none:    { label: '미기록', tone: 'neutral' },
}

// Badge와 같은 톤 팔레트. 출결 토글 버튼은 클릭 가능해야 해서 Badge(비클릭) 대신
// 같은 배경/글자색 조합을 여기서 재사용한다.
const PILL_TONE = {
  navy:    'bg-navy-soft text-navy',
  danger:  'bg-danger-soft text-danger',
  warn:    'bg-warn-soft text-warn',
  // neutral만 Badge와 글자색이 달랐다(ink-faint). 같은 화면에 Badge와 이 pill이
  // 동시에 뜨는데 같은 톤 이름이 두 색을 갖게 되고, 누를 수 있는 컨트롤인데도
  // 대비가 가장 낮았다 — Badge의 neutral과 같은 ink-soft로 맞춘다.
  neutral: 'bg-surface-alt text-ink-soft',
}

const nextStatus = { none: 'present', present: 'absent', absent: 'late', late: 'none' }

// ── 수업 출결 (관리자/교사) ──────────────────────────────
function ClassAttendance({ user, records, upsertAttendance, deleteAttendance }) {
  const { classes, students } = useData()
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedClass, setSelectedClass] = useState(null)

  const myClasses = visibleClasses(classes, user)
  const activeClass = selectedClass ?? myClasses[0]?.id ?? null
  const classStudents = students.filter((s) => s.classId === activeClass)

  const getStatus = (studentId) =>
    records.find((r) => r.studentId === studentId && r.date === selectedDate && r.type === '수업')?.status ?? 'none'

  const toggleStatus = async (studentId) => {
    const current = getStatus(studentId)
    const next = nextStatus[current]
    if (next === 'none') {
      await deleteAttendance(studentId, selectedDate, '수업')
    } else {
      await upsertAttendance(studentId, selectedDate, next, '수업')
    }
  }

  const presentCount = classStudents.filter((s) => getStatus(s.id) === 'present').length
  const absentCount  = classStudents.filter((s) => getStatus(s.id) === 'absent').length
  const lateCount    = classStudents.filter((s) => getStatus(s.id) === 'late').length

  // 배정 전 교사에게 빈 화면 대신 이유를 알려준다
  if (hasNoAssignedClass(classes, user)) return <NoAssignedClass />

  return (
    <div className="flex flex-col gap-4">
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="w-fit px-3 py-2 bg-surface border border-line rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy"
      />

      <div className="flex gap-2 flex-wrap">
        {myClasses.map((cls) => (
          <button
            key={cls.id}
            onClick={() => setSelectedClass(cls.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${activeClass === cls.id ? 'bg-ink text-white' : 'bg-surface text-ink-mute border border-line'}`}
          >
            {cls.name}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        {[
          { label: '출석', count: presentCount, color: 'text-navy' },
          { label: '결석', count: absentCount,  color: 'text-danger' },
          { label: '지각', count: lateCount,    color: 'text-warn' },
        ].map((item) => (
          <Card key={item.label} className="px-4 py-3 text-center flex-1">
            <div className={`text-2xl font-bold ${item.color}`}>{item.count}</div>
            <div className="text-xs text-ink-faint">{item.label}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        {classStudents.length === 0 ? (
          <div className="py-8 text-center text-ink-faint text-sm">해당 반에 학생이 없습니다.</div>
        ) : (
          classStudents.map((student) => {
            const status = getStatus(student.id)
            const cfg = statusConfig[status]
            return (
              <div key={student.id} className="flex items-center justify-between px-4 py-3 border-b border-line-soft last:border-0">
                <span className="text-sm font-medium">{student.name}</span>
                <button
                  onClick={() => toggleStatus(student.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${PILL_TONE[cfg.tone]}`}
                >
                  {cfg.label}
                </button>
              </div>
            )
          })
        )}
      </Card>
      <p className="text-xs text-ink-faint">💡 상태를 클릭하면 출석 → 결석 → 지각 순으로 변경됩니다.</p>
    </div>
  )
}

// ── 클리닉 출결 (관리자/교사) ──────────────────────────────
function ClinicAttendance({ records, upsertAttendance, deleteAttendance }) {
  const { user } = useAuth()
  const { students, classes } = useData()
  // 클리닉도 담당 반 학생만 다룬다 — 검색으로 남의 반 학생이 나오면 안 된다
  const myStudents = visibleStudents(students, classes, user)
  const myStudentIds = new Set(myStudents.map((s) => s.id))
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [search, setSearch] = useState('')

  // 해당 날짜 클리닉 참석자 목록
  const clinicRecords = records.filter(
    (r) => r.date === selectedDate && r.type === '클리닉' && myStudentIds.has(r.studentId)
  )
  const attendedIds = new Set(clinicRecords.map((r) => r.studentId))

  // 검색 결과 (이미 참석 체크된 학생은 상단에)
  const filtered = myStudents.filter((s) =>
    search.trim() === '' ? false : s.name.includes(search.trim())
  )

  const getClassName = (classId) => classes.find((c) => c.id === classId)?.name ?? ''

  const toggle = async (studentId) => {
    if (attendedIds.has(studentId)) {
      await deleteAttendance(studentId, selectedDate, '클리닉')
    } else {
      await upsertAttendance(studentId, selectedDate, 'present', '클리닉')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="w-fit px-3 py-2 bg-surface border border-line rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy"
      />

      {/* 참석자 수 */}
      <Card className="px-4 py-3 flex items-center gap-3">
        <div className="text-2xl font-bold text-navy">{clinicRecords.length}</div>
        <div className="text-sm text-ink-mute">명 참석</div>
      </Card>

      {/* 참석자 목록 */}
      {clinicRecords.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-line text-xs font-semibold text-ink-mute">참석자</div>
          {myStudents
            .filter((s) => attendedIds.has(s.id))
            .map((student) => (
              <div key={student.id} className="flex items-center justify-between px-4 py-3 border-b border-line-soft last:border-0">
                <div>
                  <span className="text-sm font-medium">{student.name}</span>
                  <span className="text-xs text-ink-faint ml-2">{getClassName(student.classId)}</span>
                </div>
                <button
                  onClick={() => toggle(student.id)}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-navy text-white"
                >
                  참석 ✓
                </button>
              </div>
            ))}
        </Card>
      )}

      {/* 학생 검색 */}
      <Card className="overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-line">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="학생 이름 검색 후 추가..."
            className="w-full text-sm bg-surface-alt px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-navy"
          />
        </div>
        {search.trim() !== '' && filtered.length === 0 && (
          <div className="py-6 text-center text-ink-faint text-sm">검색 결과가 없습니다.</div>
        )}
        {filtered
          .filter((s) => !attendedIds.has(s.id))
          .map((student) => (
            <div key={student.id} className="flex items-center justify-between px-4 py-3 border-b border-line-soft last:border-0">
              <div>
                <span className="text-sm font-medium">{student.name}</span>
                <span className="text-xs text-ink-faint ml-2">{getClassName(student.classId)}</span>
              </div>
              <button
                onClick={() => toggle(student.id)}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-surface-alt text-ink-mute"
              >
                + 추가
              </button>
            </div>
          ))}
      </Card>
    </div>
  )
}

// ── 학생 화면 ──────────────────────────────────────────────
function StudentAttendance({ user, records, upsertAttendance }) {
  const today = new Date().toISOString().slice(0, 10)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [activeTab, setActiveTab] = useState('수업')
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState(null) // null | 'success' | 'fail' | 'already'

  // 오늘 수업 출석 여부
  const todayRecord = records.find(
    (r) => r.studentId === user.studentId && r.date === today && r.type === '수업'
  )
  const alreadyChecked = !!todayRecord

  const handleCheckIn = async () => {
    if (alreadyChecked) {
      setCheckResult('already')
      return
    }
    setChecking(true)
    setCheckResult(null)
    const { ok } = await checkAcademyWifi()
    if (ok) {
      await upsertAttendance(user.studentId, today, 'present', '수업')
      setCheckResult('success')
    } else {
      setCheckResult('fail')
    }
    setChecking(false)
  }

  const myRecords = records.filter(
    (r) => r.studentId === user.studentId && r.date.startsWith(selectedMonth) && r.type === activeTab
  )

  const present = myRecords.filter((r) => r.status === 'present').length
  const absent  = myRecords.filter((r) => r.status === 'absent').length
  const late    = myRecords.filter((r) => r.status === 'late').length

  return (
    <div className="flex flex-col gap-4">
      {/* 출석 체크 버튼 */}
      <Card className="p-4 flex flex-col items-center gap-3">
        <p className="text-sm text-ink-mute">오늘 수업 출석 체크</p>
        <button
          onClick={handleCheckIn}
          disabled={checking || alreadyChecked}
          className={`w-full h-12 rounded text-sm font-semibold transition-colors
            ${alreadyChecked
              ? 'bg-navy-soft text-navy cursor-default'
              : 'bg-ink text-white disabled:opacity-40'
            }`}
        >
          {checking ? '확인 중...' : alreadyChecked ? '출석 완료 ✓' : '출석 체크'}
        </button>
        {checkResult === 'success' && (
          <p className="text-sm text-navy font-medium">출석이 기록됐습니다!</p>
        )}
        {checkResult === 'fail' && (
          <p className="text-sm text-danger">학원 WiFi에 연결되어 있지 않습니다.</p>
        )}
        {checkResult === 'already' && (
          <p className="text-sm text-ink-faint">오늘 이미 출석 체크했습니다.</p>
        )}
      </Card>

      {/* 탭 */}
      <div className="flex gap-2">
        {['수업', '클리닉'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab === tab ? 'bg-ink text-white' : 'bg-surface text-ink-mute border border-line'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <input
        type="month"
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="w-fit px-3 py-2 bg-surface border border-line rounded text-sm"
      />

      {activeTab === '수업' ? (
        <>
          <div className="flex gap-3">
            {[
              { label: '출석', count: present, color: 'text-navy' },
              { label: '결석', count: absent,  color: 'text-danger' },
              { label: '지각', count: late,    color: 'text-warn' },
            ].map((item) => (
              <Card key={item.label} className="px-4 py-3 text-center flex-1">
                <div className={`text-2xl font-bold ${item.color}`}>{item.count}</div>
                <div className="text-xs text-ink-faint">{item.label}</div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card className="px-4 py-3 flex items-center gap-3">
          <div className="text-2xl font-bold text-navy">{myRecords.length}</div>
          <div className="text-sm text-ink-mute">회 참석</div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-line text-xs font-semibold text-ink-mute">
          {selectedMonth} {activeTab} 기록
        </div>
        {myRecords.length === 0 ? (
          <div className="py-8 text-center text-ink-faint text-sm">기록이 없습니다.</div>
        ) : (
          myRecords
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((record) => {
              const cfg = activeTab === '클리닉'
                ? { label: '참석', tone: 'navy' }
                : statusConfig[record.status]
              return (
                <div key={record.id} className="flex justify-between items-center px-4 py-3 border-b border-line-soft last:border-0">
                  <span className="text-sm text-ink-soft">{record.date}</span>
                  <Badge tone={cfg.tone}>{cfg.label}</Badge>
                </div>
              )
            })
        )}
      </Card>
    </div>
  )
}

// ── 메인 ──────────────────────────────────────────────────
function Attendance() {
  const { user } = useAuth()
  const { attendance, upsertAttendance, deleteAttendance } = useData()
  const [activeTab, setActiveTab] = useState('수업')

  if (user?.role === 'student') {
    return (
      <Layout>
        <PageTitle title="출결 관리" />
        <StudentAttendance user={user} records={attendance} upsertAttendance={upsertAttendance} />
      </Layout>
    )
  }

  return (
    <Layout>
      <PageTitle title="출결 관리" />
      <div className="flex flex-col gap-4">
        {/* 수업/클리닉 탭 */}
        <div className="flex gap-2">
          {['수업', '클리닉'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab === tab ? 'bg-ink text-white' : 'bg-surface text-ink-mute border border-line'}`}
            >
              {tab} 출결
            </button>
          ))}
        </div>

        {activeTab === '수업' ? (
          <ClassAttendance
            user={user}
            records={attendance}
            upsertAttendance={upsertAttendance}
            deleteAttendance={deleteAttendance}
          />
        ) : (
          <ClinicAttendance
            records={attendance}
            upsertAttendance={upsertAttendance}
            deleteAttendance={deleteAttendance}
          />
        )}
      </div>
    </Layout>
  )
}

export default Attendance
