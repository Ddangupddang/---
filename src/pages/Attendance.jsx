// src/pages/Attendance.jsx
import { useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { checkAcademyWifi } from '../utils/checkWifi'

const statusConfig = {
  present: { label: '출석', color: 'bg-green-100 text-green-700' },
  absent:  { label: '결석', color: 'bg-red-100 text-red-700' },
  late:    { label: '지각', color: 'bg-yellow-100 text-yellow-700' },
  none:    { label: '미기록', color: 'bg-gray-100 text-gray-400' },
}

const nextStatus = { none: 'present', present: 'absent', absent: 'late', late: 'none' }

// ── 수업 출결 (관리자/교사) ──────────────────────────────
function ClassAttendance({ user, records, upsertAttendance, deleteAttendance }) {
  const { classes, students } = useData()
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedClass, setSelectedClass] = useState(null)

  const myClasses = user.role === 'admin' ? classes : classes.filter((c) => c.teacherId === user.id)
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

  return (
    <div className="flex flex-col gap-4">
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="w-fit px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
      />

      <div className="flex gap-2 flex-wrap">
        {myClasses.map((cls) => (
          <button
            key={cls.id}
            onClick={() => setSelectedClass(cls.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${activeClass === cls.id ? 'bg-[#2B2B2B] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
          >
            {cls.name}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        {[
          { label: '출석', count: presentCount, color: 'text-green-600' },
          { label: '결석', count: absentCount,  color: 'text-red-500' },
          { label: '지각', count: lateCount,    color: 'text-yellow-500' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl px-4 py-3 shadow-sm text-center flex-1">
            <div className={`text-2xl font-bold ${item.color}`}>{item.count}</div>
            <div className="text-xs text-gray-400">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {classStudents.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">해당 반에 학생이 없습니다.</div>
        ) : (
          classStudents.map((student) => {
            const status = getStatus(student.id)
            const cfg = statusConfig[status]
            return (
              <div key={student.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                <span className="text-sm font-medium">{student.name}</span>
                <button
                  onClick={() => toggleStatus(student.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}
                >
                  {cfg.label}
                </button>
              </div>
            )
          })
        )}
      </div>
      <p className="text-xs text-gray-400">💡 상태를 클릭하면 출석 → 결석 → 지각 순으로 변경됩니다.</p>
    </div>
  )
}

// ── 클리닉 출결 (관리자/교사) ──────────────────────────────
function ClinicAttendance({ records, upsertAttendance, deleteAttendance }) {
  const { students, classes } = useData()
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [search, setSearch] = useState('')

  // 해당 날짜 클리닉 참석자 목록
  const clinicRecords = records.filter((r) => r.date === selectedDate && r.type === '클리닉')
  const attendedIds = new Set(clinicRecords.map((r) => r.studentId))

  // 검색 결과 (이미 참석 체크된 학생은 상단에)
  const filtered = students.filter((s) =>
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
        className="w-fit px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
      />

      {/* 참석자 수 */}
      <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
        <div className="text-2xl font-bold text-[#5B8FD4]">{clinicRecords.length}</div>
        <div className="text-sm text-gray-500">명 참석</div>
      </div>

      {/* 참석자 목록 */}
      {clinicRecords.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500">참석자</div>
          {students
            .filter((s) => attendedIds.has(s.id))
            .map((student) => (
              <div key={student.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                <div>
                  <span className="text-sm font-medium">{student.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{getClassName(student.classId)}</span>
                </div>
                <button
                  onClick={() => toggle(student.id)}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-[#5B8FD4] text-white"
                >
                  참석 ✓
                </button>
              </div>
            ))}
        </div>
      )}

      {/* 학생 검색 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="학생 이름 검색 후 추가..."
            className="w-full text-sm bg-[#F4F3EE] px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
          />
        </div>
        {search.trim() !== '' && filtered.length === 0 && (
          <div className="py-6 text-center text-gray-400 text-sm">검색 결과가 없습니다.</div>
        )}
        {filtered
          .filter((s) => !attendedIds.has(s.id))
          .map((student) => (
            <div key={student.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
              <div>
                <span className="text-sm font-medium">{student.name}</span>
                <span className="text-xs text-gray-400 ml-2">{getClassName(student.classId)}</span>
              </div>
              <button
                onClick={() => toggle(student.id)}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500"
              >
                + 추가
              </button>
            </div>
          ))}
      </div>
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
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center gap-3">
        <p className="text-sm text-gray-500">오늘 수업 출석 체크</p>
        <button
          onClick={handleCheckIn}
          disabled={checking || alreadyChecked}
          className={`w-full h-12 rounded-xl text-sm font-semibold transition-colors
            ${alreadyChecked
              ? 'bg-green-100 text-green-700 cursor-default'
              : 'bg-[#2B2B2B] text-white disabled:opacity-40'
            }`}
        >
          {checking ? '확인 중...' : alreadyChecked ? '출석 완료 ✓' : '출석 체크'}
        </button>
        {checkResult === 'success' && (
          <p className="text-sm text-green-600 font-medium">출석이 기록됐습니다!</p>
        )}
        {checkResult === 'fail' && (
          <p className="text-sm text-[#C0392B]">학원 WiFi에 연결되어 있지 않습니다.</p>
        )}
        {checkResult === 'already' && (
          <p className="text-sm text-gray-400">오늘 이미 출석 체크했습니다.</p>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-2">
        {['수업', '클리닉'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab === tab ? 'bg-[#2B2B2B] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <input
        type="month"
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="w-fit px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
      />

      {activeTab === '수업' ? (
        <>
          <div className="flex gap-3">
            {[
              { label: '출석', count: present, color: 'text-green-600' },
              { label: '결석', count: absent,  color: 'text-red-500' },
              { label: '지각', count: late,    color: 'text-yellow-500' },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-xl px-4 py-3 shadow-sm text-center flex-1">
                <div className={`text-2xl font-bold ${item.color}`}>{item.count}</div>
                <div className="text-xs text-gray-400">{item.label}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
          <div className="text-2xl font-bold text-[#5B8FD4]">{myRecords.length}</div>
          <div className="text-sm text-gray-500">회 참석</div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500">
          {selectedMonth} {activeTab} 기록
        </div>
        {myRecords.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">기록이 없습니다.</div>
        ) : (
          myRecords
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((record) => {
              const cfg = activeTab === '클리닉'
                ? { label: '참석', color: 'bg-[#5B8FD4]/10 text-[#5B8FD4]' }
                : statusConfig[record.status]
              return (
                <div key={record.id} className="flex justify-between items-center px-4 py-3 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600">{record.date}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                </div>
              )
            })
        )}
      </div>
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
        <StudentAttendance user={user} records={attendance} upsertAttendance={upsertAttendance} />
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        {/* 수업/클리닉 탭 */}
        <div className="flex gap-2">
          {['수업', '클리닉'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab === tab ? 'bg-[#2B2B2B] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
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
