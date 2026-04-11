// src/pages/Dashboard.jsx
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { classes } from '../data/classes'
import { students } from '../data/students'
import { attendance } from '../data/attendance'
import { grades } from '../data/grades'

const today = new Date().toISOString().slice(0, 10)

function AdminTeacherDashboard({ user }) {
  const myClasses = user.role === 'admin'
    ? classes
    : classes.filter((c) => c.teacherId === user.id)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">
        오늘 <span className="font-semibold text-[#2B2B2B]">{today}</span> 출결 현황
      </p>

      {myClasses.length === 0 && (
        <div className="bg-white rounded-xl p-6 text-center text-gray-400 text-sm">
          담당 반이 없습니다.
        </div>
      )}

      {myClasses.map((cls) => {
        const classStudents = students.filter((s) => s.classId === cls.id)
        const total = classStudents.length
        const todayRecords = attendance.filter(
          (a) => a.date === today && classStudents.some((s) => s.id === a.studentId)
        )
        const present = todayRecords.filter((a) => a.status === 'present').length
        const absent  = todayRecords.filter((a) => a.status === 'absent').length
        const late    = todayRecords.filter((a) => a.status === 'late').length

        return (
          <div key={cls.id} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#2B2B2B]">{cls.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">학생 {total}명</p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-[#27ae60]">{present}</div>
                  <div className="text-xs text-gray-400">출석</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-[#C0392B]">{absent}</div>
                  <div className="text-xs text-gray-400">결석</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-[#f39c12]">{late}</div>
                  <div className="text-xs text-gray-400">지각</div>
                </div>
              </div>
            </div>
            {todayRecords.length === 0 && (
              <p className="mt-2 text-xs text-gray-400 italic">오늘 출결 미기록</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function StudentDashboard({ user }) {
  const thisMonth = today.slice(0, 7)
  const myRecords = attendance.filter(
    (a) => a.studentId === user.studentId && a.date.startsWith(thisMonth)
  )
  const present = myRecords.filter((a) => a.status === 'present').length
  const absent  = myRecords.filter((a) => a.status === 'absent').length
  const late    = myRecords.filter((a) => a.status === 'late').length

  const myGrades = grades
    .filter((g) => g.studentId === user.studentId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3)

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-[#2B2B2B] mb-3">이번 달 출결</h3>
        <div className="flex justify-around">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#27ae60]">{present}</div>
            <div className="text-xs text-gray-400">출석</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#C0392B]">{absent}</div>
            <div className="text-xs text-gray-400">결석</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#f39c12]">{late}</div>
            <div className="text-xs text-gray-400">지각</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-[#2B2B2B] mb-3">최근 성적</h3>
        {myGrades.length === 0 ? (
          <p className="text-sm text-gray-400">성적 기록이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {myGrades.map((g) => (
              <div key={g.id} className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium">{g.subject}</span>
                  <span className="text-xs text-gray-400 ml-2">{g.part}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#5B8FD4]">{g.score}점</span>
                  <span className="text-xs text-gray-400">{g.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Dashboard() {
  const { user } = useAuth()

  return (
    <Layout>
      {user?.role === 'student'
        ? <StudentDashboard user={user} />
        : <AdminTeacherDashboard user={user} />
      }
    </Layout>
  )
}

export default Dashboard
