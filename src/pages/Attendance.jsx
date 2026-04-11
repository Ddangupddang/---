// src/pages/Attendance.jsx
import { useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { students } from '../data/students'
import { classes } from '../data/classes'
import { attendance as initialAttendance } from '../data/attendance'

const statusConfig = {
  present: { label: '출석', color: 'bg-green-100 text-green-700' },
  absent:  { label: '결석', color: 'bg-red-100 text-red-700' },
  late:    { label: '지각', color: 'bg-yellow-100 text-yellow-700' },
  none:    { label: '미기록', color: 'bg-gray-100 text-gray-400' },
}

const nextStatus = { none: 'present', present: 'absent', absent: 'late', late: 'none' }

function AdminTeacherAttendance({ user }) {
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id ?? null)
  const [records, setRecords] = useState(initialAttendance)

  const myClasses = user.role === 'admin' ? classes : classes.filter((c) => c.teacherId === user.id)
  const classStudents = students.filter((s) => s.classId === selectedClass)

  const getStatus = (studentId) =>
    records.find((r) => r.studentId === studentId && r.date === selectedDate)?.status ?? 'none'

  const toggleStatus = (studentId) => {
    const current = getStatus(studentId)
    const next = nextStatus[current]
    setRecords((prev) => {
      const existing = prev.find((r) => r.studentId === studentId && r.date === selectedDate)
      if (next === 'none') {
        return prev.filter((r) => !(r.studentId === studentId && r.date === selectedDate))
      }
      if (existing) {
        return prev.map((r) =>
          r.studentId === studentId && r.date === selectedDate ? { ...r, status: next } : r
        )
      }
      const newId = Math.max(...prev.map((r) => r.id), 0) + 1
      return [...prev, { id: newId, studentId, date: selectedDate, status: next }]
    })
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
            className={`px-3 py-1 rounded-full text-xs font-medium ${selectedClass === cls.id ? 'bg-[#2B2B2B] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
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

function StudentAttendance({ user }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const myRecords = initialAttendance.filter(
    (r) => r.studentId === user.studentId && r.date.startsWith(selectedMonth)
  )

  const present = myRecords.filter((r) => r.status === 'present').length
  const absent  = myRecords.filter((r) => r.status === 'absent').length
  const late    = myRecords.filter((r) => r.status === 'late').length

  return (
    <div className="flex flex-col gap-4">
      <input
        type="month"
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="w-fit px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
      />

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

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500">
          {selectedMonth} 출결 기록
        </div>
        {myRecords.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">기록이 없습니다.</div>
        ) : (
          myRecords
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((record) => {
              const cfg = statusConfig[record.status]
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

function Attendance() {
  const { user } = useAuth()
  return (
    <Layout>
      {user?.role === 'student'
        ? <StudentAttendance user={user} />
        : <AdminTeacherAttendance user={user} />
      }
    </Layout>
  )
}

export default Attendance
