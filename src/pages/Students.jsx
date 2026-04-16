// src/pages/Students.jsx
import { useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function Students() {
  const { user } = useAuth()
  const { classes, students: studentList, addStudent, updateStudent, deleteStudent, bulkAddStudents, addClass, updateClass, deleteClass, reorderClasses, reorderStudents } = useData()
  const [searchParams, setSearchParams] = useSearchParams()
  // 학생 폼
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', classId: '', parentPhone: '', joinDate: '' })
  const fileInputRef = useRef(null)
  // 반 폼
  const [showClassForm, setShowClassForm] = useState(false)
  const [editClass, setEditClass] = useState(null)
  const [classForm, setClassForm] = useState({ name: '' })

  const activeTab = searchParams.get('tab') === 'classes' ? 'classes' : 'students'
  const [selectedClass, setSelectedClass] = useState(null)
  const isAdmin = user?.role === 'admin'

  const displayStudents = selectedClass
    ? studentList.filter((s) => s.classId === selectedClass)
    : studentList

  const getClassName = (classId) =>
    classes.find((c) => c.id === classId)?.name ?? '미배정'

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    const result = editTarget
      ? await updateStudent(editTarget.id, { ...form, classId: Number(form.classId) })
      : await addStudent({ ...form, classId: Number(form.classId) })

    if (result === null && !editTarget) {
      alert('저장 실패: 권한을 확인해주세요.')
      return
    }
    setShowForm(false)
    setEditTarget(null)
    setForm({ name: '', phone: '', classId: '', parentPhone: '', joinDate: '' })
  }

  const handleDelete = async (id) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      await deleteStudent(id)
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
    reader.onload = async (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws)
      const newStudents = rows.map((row) => ({
        name:        row['이름']        ?? '',
        phone:       row['연락처']      ?? '',
        classId:     classes.find((c) => c.name === row['반'])?.id ?? null,
        parentPhone: row['학부모연락처'] ?? '',
        joinDate:    row['등록일']       ?? '',
      }))
      await bulkAddStudents(newStudents)
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  // 반 추가/수정
  const handleClassFormSubmit = async (e) => {
    e.preventDefault()
    if (!classForm.name.trim()) return
    if (editClass) {
      await updateClass(editClass.id, { name: classForm.name.trim() })
    } else {
      await addClass({ name: classForm.name.trim() })
    }
    setShowClassForm(false)
    setEditClass(null)
    setClassForm({ name: '' })
  }

  // 반 삭제
  const handleDeleteClass = async (id) => {
    const hasStudents = studentList.some((s) => s.classId === id)
    if (hasStudents) { alert('반에 학생이 있어 삭제할 수 없습니다. 먼저 학생을 다른 반으로 이동해주세요.'); return }
    if (confirm('반을 삭제하시겠습니까?')) await deleteClass(id)
  }

  // 드래그 센서 (마우스 + 터치 지원)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  function handleStudentDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const newOrder = arrayMove(displayStudents,
      displayStudents.findIndex((s) => s.id === active.id),
      displayStudents.findIndex((s) => s.id === over.id)
    )
    reorderStudents(newOrder.map((s) => s.id))
  }

  function handleClassDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const newOrder = arrayMove(classes,
      classes.findIndex((c) => c.id === active.id),
      classes.findIndex((c) => c.id === over.id)
    )
    reorderClasses(newOrder.map((c) => c.id))
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
                  {isAdmin && <th className="px-2 py-3 w-8"></th>}
                  <th className="text-left px-4 py-3 font-medium">이름</th>
                  <th className="text-left px-4 py-3 font-medium">반</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">연락처</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">등록일</th>
                  {isAdmin && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleStudentDragEnd}>
                <SortableContext items={displayStudents.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <tbody>
                    {displayStudents.map((student) => (
                      <SortableStudentRow
                        key={student.id}
                        student={student}
                        isAdmin={isAdmin}
                        getClassName={getClassName}
                        onEdit={() => handleEdit(student)}
                        onDelete={() => handleDelete(student.id)}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </DndContext>
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
          {isAdmin && (
            <button
              onClick={() => { setShowClassForm(true); setEditClass(null); setClassForm({ name: '' }) }}
              className="px-4 py-2 bg-[#2B2B2B] text-white text-sm rounded-lg hover:bg-[#3d3d3d] w-fit"
            >
              + 반 추가
            </button>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleClassDragEnd}>
            <SortableContext items={classes.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {classes.map((cls) => (
                <SortableClassCard
                  key={cls.id}
                  cls={cls}
                  count={studentList.filter((s) => s.classId === cls.id).length}
                  isAdmin={isAdmin}
                  onEdit={() => { setEditClass(cls); setClassForm({ name: cls.name }); setShowClassForm(true) }}
                  onDelete={() => handleDeleteClass(cls.id)}
                  onClick={() => { setSelectedClass(cls.id); setSearchParams({}) }}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* 반 추가/수정 모달 */}
      {showClassForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="font-bold text-[#2B2B2B] mb-4">{editClass ? '반 수정' : '반 추가'}</h2>
            <form onSubmit={handleClassFormSubmit} className="flex flex-col gap-3">
              <input
                required
                placeholder="반 이름 (예: 수능국어A반)"
                value={classForm.name}
                onChange={(e) => setClassForm({ name: e.target.value })}
                className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FD4]"
              />
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setShowClassForm(false)} className="flex-1 h-11 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50">취소</button>
                <button type="submit" className="flex-1 h-11 bg-[#2B2B2B] text-white rounded-lg text-sm font-semibold hover:bg-[#3d3d3d]">저장</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 학생 추가/수정 모달 */}
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

// ── 드래그 가능한 반 카드 ──────────────────────────────
function SortableClassCard({ cls, count, isAdmin, onEdit, onDelete, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cls.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* 드래그 핸들 (관리자만) */}
      {isAdmin && (
        <div
          {...attributes} {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab text-gray-300 hover:text-gray-500 text-lg select-none px-1"
        >
          ⠿
        </div>
      )}
      <div className="flex-1">
        <h3 className="font-bold text-[#2B2B2B]">{cls.name}</h3>
        <p className="text-xs text-gray-400 mt-0.5">학생 {count}명 · 클릭하면 학생 목록</p>
      </div>
      {isAdmin && (
        <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
          <button onClick={onEdit} className="text-xs text-[#5B8FD4] hover:underline">수정</button>
          <button onClick={onDelete} className="text-xs text-[#C0392B] hover:underline">삭제</button>
        </div>
      )}
    </div>
  )
}

// ── 드래그 가능한 학생 행 ──────────────────────────────
function SortableStudentRow({ student, isAdmin, getClassName, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: student.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, position: 'relative', zIndex: isDragging ? 1 : 0 }

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-gray-50 hover:bg-gray-50">
      {isAdmin && (
        <td className="px-2 py-3 w-8">
          <div {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500 flex justify-center select-none">
            ⠿
          </div>
        </td>
      )}
      <td className="px-4 py-3 font-medium">{student.name}</td>
      <td className="px-4 py-3 text-gray-500">{getClassName(student.classId)}</td>
      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{student.phone}</td>
      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{student.joinDate}</td>
      {isAdmin && (
        <td className="px-4 py-3">
          <div className="flex gap-2 justify-end">
            <button onClick={onEdit} className="text-xs text-[#5B8FD4] hover:underline">수정</button>
            <button onClick={onDelete} className="text-xs text-[#C0392B] hover:underline">삭제</button>
          </div>
        </td>
      )}
    </tr>
  )
}
