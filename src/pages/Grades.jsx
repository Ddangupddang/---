// src/pages/Grades.jsx
import { useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { students } from '../data/students'
import { classes } from '../data/classes'
import { grades as initialGrades } from '../data/grades'

function Grades() {
  const { user } = useAuth()
  const [gradeList, setGradeList] = useState(initialGrades)
  const [activeType, setActiveType] = useState('weekly')
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id ?? null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    studentId: '', subject: '', part: '', score: '', total: '100',
    date: new Date().toISOString().slice(0, 10)
  })

  const isStudent = user?.role === 'student'

  const displayGrades = gradeList.filter((g) => g.type === activeType)
  const classStudents = students.filter((s) => s.classId === selectedClass)

  const getStudentGrade = (studentId) =>
    displayGrades
      .filter((g) => g.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date))[0]

  const handleAdd = (e) => {
    e.preventDefault()
    const newId = Math.max(...gradeList.map((g) => g.id), 0) + 1
    setGradeList((prev) => [
      ...prev,
      {
        id: newId,
        type: activeType,
        ...form,
        studentId: Number(form.studentId),
        score: Number(form.score),
        total: Number(form.total),
      },
    ])
    setShowForm(false)
    setForm({ studentId: '', subject: '', part: '', score: '', total: '100', date: new Date().toISOString().slice(0, 10) })
  }

  const typeTabs = [
    { key: 'weekly', label: '주간 테스트' },
    { key: 'exam',   label: '내신 시험' },
  ]

  // 학생 본인 뷰
  if (isStudent) {
    const myGrades = gradeList
      .filter((g) => g.studentId === user.studentId && g.type === activeType)
      .sort((a, b) => b.date.localeCompare(a.date))

    return (
      <Layout>
        <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm w-fit">
          {typeTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveType(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeType === tab.key ? 'bg-[#2B2B2B] text-white' : 'text-gray-500'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {myGrades.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">성적 기록이 없습니다.</div>
          ) : (
            myGrades.map((g) => (
              <div key={g.id} className="flex justify-between items-center px-4 py-3 border-b border-gray-50 last:border-0">
                <div>
                  <span className="text-sm font-medium">{g.subject}</span>
                  <span className="text-xs text-gray-400 ml-2">{g.part}</span>
                  <div className="text-xs text-gray-400 mt-0.5">{g.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-[#5B8FD4]">{g.score}점</div>
                  <div className="text-xs text-gray-400">/ {g.total}점</div>
                </div>
              </div>
            ))
          )}
        </div>
      </Layout>
    )
  }

  // 관리자/교사 뷰
  return (
    <Layout>
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm w-fit">
        {typeTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveType(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeType === tab.key ? 'bg-[#2B2B2B] text-white' : 'text-gray-500'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${selectedClass === cls.id ? 'bg-[#2B2B2B] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
              >
                {cls.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto px-4 py-2 bg-[#5B8FD4] text-white text-sm rounded-lg hover:bg-[#4a7ec3]"
          >
            + 성적 입력
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 text-xs">
                <th className="text-left px-4 py-3 font-medium">학생</th>
                <th className="text-left px-4 py-3 font-medium">과목</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">파트</th>
                <th className="text-left px-4 py-3 font-medium">점수</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">날짜</th>
              </tr>
            </thead>
            <tbody>
              {classStudents.map((student) => {
                const g = getStudentGrade(student.id)
                return (
                  <tr key={student.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium">{student.name}</td>
                    <td className="px-4 py-3 text-gray-500">{g?.subject ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell text-xs">{g?.part ?? '—'}</td>
                    <td className="px-4 py-3">
                      {g ? (
                        <span className={`font-bold ${(g.score / g.total) * 100 >= 80 ? 'text-green-600' : (g.score / g.total) * 100 >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {g.score}점
                        </span>
                      ) : <span className="text-gray-300">미입력</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell text-xs">{g?.date ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {classStudents.length === 0 && (
            <div className="py-8 text-center text-gray-400 text-sm">해당 반에 학생이 없습니다.</div>
          )}
        </div>
      </div>

      {/* 성적 입력 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="font-bold text-[#2B2B2B] mb-4">성적 입력</h2>
            <form onSubmit={handleAdd} className="flex flex-col gap-3">
              <select required value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none">
                <option value="">학생 선택</option>
                {classStudents.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input required placeholder="과목 (예: 독서)" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none" />
              <input placeholder="파트 (예: 현대문학)" value={form.part} onChange={(e) => setForm({ ...form, part: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none" />
              <div className="flex gap-2">
                <input required type="number" placeholder="점수" min="0" max="100" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} className="flex-1 h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none" />
                <input required type="number" placeholder="만점" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} className="w-20 h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none" />
              </div>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none" />
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 h-11 border border-gray-200 rounded-lg text-sm text-gray-500">취소</button>
                <button type="submit" className="flex-1 h-11 bg-[#2B2B2B] text-white rounded-lg text-sm font-semibold">저장</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Grades
