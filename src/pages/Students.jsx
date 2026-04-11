// src/pages/Students.jsx
import { useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { students as initialStudents } from '../data/students'
import { classes } from '../data/classes'

function Students() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [studentList, setStudentList] = useState(initialStudents)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', classId: '', parentPhone: '', joinDate: '' })
  const fileInputRef = useRef(null)

  const activeTab = searchParams.get('tab') === 'classes' ? 'classes' : 'students'
  const [selectedClass, setSelectedClass] = useState(null)
  const isAdmin = user?.role === 'admin'

  const displayStudents = selectedClass
    ? studentList.filter((s) => s.classId === selectedClass)
    : studentList

  const getClassName = (classId) =>
    classes.find((c) => c.id === classId)?.name ?? '미배정'

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (editTarget) {
      setStudentList((prev) =>
        prev.map((s) => s.id === editTarget.id ? { ...s, ...form, classId: Number(form.classId) } : s)
      )
    } else {
      const newId = Math.max(...studentList.map((s) => s.id), 0) + 1
      setStudentList((prev) => [...prev, { id: newId, ...form, classId: Number(form.classId) }])
    }
    setShowForm(false)
    setEditTarget(null)
    setForm({ name: '', phone: '', classId: '', parentPhone: '', joinDate: '' })
  }

  const handleDelete = (id) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      setStudentList((prev) => prev.filter((s) => s.id !== id))
    }
  }

  const handleEdit = (student) => {
    setEditTarget(student)
    setForm({ ...student, classId: String(student.classId) })
    setShowForm(true)
  }

  const handleExcelDownload = () => {
    const data = studentList.map((s) => ({
      이름: s.name,
      반: getClassName(s.classId),
      연락처: s.phone,
      학부모연락처: s.parentPhone,
      등록일: s.joinDate,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '학생목록')
    XLSX.writeFile(wb, '수문재_학생목록.xlsx')
  }

  const handleExcelUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws)
      const newStudents = rows.map((row, i) => ({
        id: Math.max(...studentList.map((s) => s.id), 0) + i + 1,
        name: row['이름'] ?? '',
        phone: row['연락처'] ?? '',
        classId: classes.find((c) => c.name === row['반'])?.id ?? null,
        parentPhone: row['학부모연락처'] ?? '',
        joinDate: row['등록일'] ?? '',
      }))
      setStudentList((prev) => [...prev, ...newStudents])
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  return (
    <Layout>
      {/* 탭 */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm w-fit">
        <button
          onClick={() => setSearchParams({})}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'students' ? 'bg-[#2B2B2B] text-white' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          학생 목록
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'classes' })}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'classes' ? 'bg-[#2B2B2B] text-white' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          반 관리
        </button>
      </div>

      {/* === 학생 목록 탭 === */}
      {activeTab === 'students' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 flex-wrap">
            {isAdmin && (
              <button
                onClick={() => { setShowForm(true); setEditTarget(null); setForm({ name: '', phone: '', classId: '', parentPhone: '', joinDate: '' }) }}
                className="px-4 py-2 bg-[#2B2B2B] text-white text-sm rounded-lg hover:bg-[#3d3d3d]"
              >
                + 학생 추가
              </button>
            )}
            {isAdmin && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-[#5B8FD4] text-white text-sm rounded-lg hover:bg-[#4a7ec3]"
                >
                  📥 엑셀 업로드
                </button>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
              </>
            )}
            <button
              onClick={handleExcelDownload}
              className="px-4 py-2 bg-white border border-gray-200 text-sm rounded-lg hover:bg-gray-50"
            >
              📤 엑셀 다운로드
            </button>
          </div>

          {/* 반 필터 */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedClass(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${!selectedClass ? 'bg-[#2B2B2B] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
            >
              전체 ({studentList.length})
            </button>
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${selectedClass === cls.id ? 'bg-[#5B8FD4] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
              >
                {cls.name} ({studentList.filter((s) => s.classId === cls.id).length})
              </button>
            ))}
          </div>

          {/* 테이블 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 text-xs">
                  <th className="text-left px-4 py-3 font-medium">이름</th>
                  <th className="text-left px-4 py-3 font-medium">반</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">연락처</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">등록일</th>
                  {isAdmin && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {displayStudents.map((student) => (
                  <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{student.name}</td>
                    <td className="px-4 py-3 text-gray-500">{getClassName(student.classId)}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{student.phone}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{student.joinDate}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => handleEdit(student)} className="text-xs text-[#5B8FD4] hover:underline">수정</button>
                          <button onClick={() => handleDelete(student.id)} className="text-xs text-[#C0392B] hover:underline">삭제</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {displayStudents.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-sm">학생이 없습니다.</div>
            )}
          </div>
        </div>
      )}

      {/* === 반 관리 탭 === */}
      {activeTab === 'classes' && (
        <div className="flex flex-col gap-3">
          {classes.map((cls) => {
            const count = studentList.filter((s) => s.classId === cls.id).length
            return (
              <div key={cls.id} className="bg-white rounded-xl p-4 shadow-sm flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-[#2B2B2B]">{cls.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">학생 {count}명</p>
                </div>
                <button
                  onClick={() => { setSelectedClass(cls.id); setSearchParams({}) }}
                  className="text-sm text-[#5B8FD4] hover:underline"
                >
                  학생 보기 →
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* 추가/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="font-bold text-[#2B2B2B] mb-4">{editTarget ? '학생 수정' : '학생 추가'}</h2>
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-3">
              <input required placeholder="이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]" />
              <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none">
                <option value="">반 선택</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input placeholder="연락처 (010-0000-0000)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none" />
              <input placeholder="학부모 연락처" value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none" />
              <input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none" />
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 h-11 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50">취소</button>
                <button type="submit" className="flex-1 h-11 bg-[#2B2B2B] text-white rounded-lg text-sm font-semibold hover:bg-[#3d3d3d]">저장</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Students
