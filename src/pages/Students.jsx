// src/pages/Students.jsx
import { useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import Layout from '../components/Layout'
import BulkAccountModal from '../components/BulkAccountModal'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'
import { GRADES, GRADE_LABELS, JEONGSI_LEVELS, JEONGSI_LEVEL_LABELS } from '../constants/homework'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'

function Students() {
  const { user } = useAuth()
  const {
    classes, students: studentList,
    addStudent, updateStudent, deleteStudent, bulkAddStudents, bulkDeleteStudents,
    addClass, updateClass, deleteClass,
    reorderClasses, reorderStudents,
    studentAccountIds, studentUsernameById, refreshStudentAccounts,
  } = useData()
  const [searchParams, setSearchParams] = useSearchParams()

  // 학생 폼
  const [showForm, setShowForm]     = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm]             = useState({ name: '', phone: '', classId: '', parentPhone: '', grade: '', jeongsiLevel: '' })
  const fileInputRef                = useRef(null)

  // 반 폼
  const [showClassForm, setShowClassForm] = useState(false)
  const [editClass, setEditClass]         = useState(null)
  const [classForm, setClassForm]         = useState({ name: '' })

  const activeTab      = searchParams.get('tab') === 'classes' ? 'classes' : 'students'
  const [selectedClass, setSelectedClass] = useState(null)
  const isAdmin = user?.role === 'admin'

  // 계정 생성 모달
  const [accountModal,   setAccountModal]   = useState(null)
  const [accountForm,    setAccountForm]    = useState({ username: '', password: '' })
  const [accountMsg,     setAccountMsg]     = useState({ type: '', text: '' })
  const [accountLoading, setAccountLoading] = useState(false)

  // 일괄 계정 생성 모달
  const [showBulkModal, setShowBulkModal] = useState(false)
  // 계정이 없는 학생 목록
  const accountlessStudents = studentList.filter((s) => !studentAccountIds.includes(s.id))

  // ── 선택 삭제 ─────────────────────────────────────────
  const [selectMode,         setSelectMode]         = useState(false)
  const [selectedIds,        setSelectedIds]        = useState([])
  const [bulkDeleteConfirm,  setBulkDeleteConfirm]  = useState(false)
  const [bulkDeleting,       setBulkDeleting]       = useState(false)

  const displayStudents = selectedClass
    ? studentList.filter((s) => s.classId === selectedClass)
    : studentList

  const allSelected = displayStudents.length > 0 && selectedIds.length === displayStudents.length

  const toggleSelect = (id) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? [] : displayStudents.map((s) => s.id))

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds([])
  }

  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    await bulkDeleteStudents(selectedIds)
    setBulkDeleting(false)
    setBulkDeleteConfirm(false)
    exitSelectMode()
  }
  // ─────────────────────────────────────────────────────

  const openAccountModal = (student) => {
    setAccountModal(student)
    setAccountForm({ username: '', password: '' })
    setAccountMsg({ type: '', text: '' })
  }

  const handleCreateAccount = async (e) => {
    e.preventDefault()
    if (!accountForm.username.trim() || !accountForm.password.trim()) return
    setAccountLoading(true)
    setAccountMsg({ type: '', text: '' })

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const res = await fetch('/api/create-student-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        username:  accountForm.username.trim(),
        password:  accountForm.password.trim(),
        name:      accountModal.name,
        classId:   accountModal.classId,
        studentId: accountModal.id,
      }),
    })

    const data = await res.json()
    setAccountLoading(false)

    if (res.ok) {
      setAccountMsg({ type: 'success', text: `${accountModal.name} 계정이 생성됐습니다. (아이디: ${accountForm.username})` })
    } else {
      setAccountMsg({ type: 'error', text: data.error ?? '계정 생성에 실패했습니다.' })
    }
  }

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
    setForm({ name: '', phone: '', classId: '', parentPhone: '', grade: '', jeongsiLevel: '' })
  }

  const handleDelete = async (id) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      await deleteStudent(id)
    }
  }

  const handleEdit = (student) => {
    setEditTarget(student)
    setForm({
      ...student,
      classId: String(student.classId),
      grade: student.grade ?? '',
      jeongsiLevel: student.jeongsiLevel ?? '',
    })
    setShowForm(true)
  }

  const handleExcelDownload = () => {
    const data = studentList.map((s) => ({
      이름: s.name,
      반: getClassName(s.classId),
      연락처: s.phone,
      학부모연락처: s.parentPhone,
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
      const newStudents = rows.map((row) => {
        // 컬럼명의 공백/특수문자 제거 후 매핑
        const clean = {}
        Object.entries(row).forEach(([k, v]) => { clean[k.trim()] = v })
        const name        = clean['성명']      ?? clean['이름']        ?? ''
        const phone       = clean['학생핸드폰'] ?? clean['연락처']      ?? ''
        const parentPhone = clean['부모핸드폰'] ?? clean['학부모연락처'] ?? ''
        const className   = clean['반명']      ?? clean['반']          ?? ''
        const classId     = classes.find((c) => c.name === className)?.id ?? null
        return { name, phone, parentPhone, classId }
      })
      await bulkAddStudents(newStudents)
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

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

  const handleDeleteClass = async (id) => {
    const hasStudents = studentList.some((s) => s.classId === id)
    if (hasStudents) { alert('반에 학생이 있어 삭제할 수 없습니다. 먼저 학생을 다른 반으로 이동해주세요.'); return }
    if (confirm('반을 삭제하시겠습니까?')) await deleteClass(id)
  }

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
      <div className="flex gap-1 mb-4 bg-surface border border-line rounded p-1 w-fit">
        <button
          onClick={() => { setSearchParams({}); exitSelectMode() }}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'students' ? 'bg-ink text-white' : 'text-ink-mute hover:text-ink-soft'
          }`}
        >
          학생 목록
        </button>
        <button
          onClick={() => { setSearchParams({ tab: 'classes' }); exitSelectMode() }}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'classes' ? 'bg-ink text-white' : 'text-ink-mute hover:text-ink-soft'
          }`}
        >
          반 관리
        </button>
      </div>

      {/* === 학생 목록 탭 === */}
      {activeTab === 'students' && (
        <div className="flex flex-col gap-4">
          {/* 액션 버튼 바 */}
          <div className="flex gap-2 flex-wrap">
            {isAdmin && !selectMode && (
              <>
                <Button
                  variant="primary"
                  onClick={() => { setShowForm(true); setEditTarget(null); setForm({ name: '', phone: '', classId: '', parentPhone: '', grade: '', jeongsiLevel: '' }) }}
                >
                  + 학생 추가
                </Button>
                <Button variant="accent" onClick={() => fileInputRef.current?.click()}>
                  📥 엑셀 업로드
                </Button>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
                <Button variant="ghost" onClick={handleExcelDownload}>
                  📤 엑셀 다운로드
                </Button>
                {/* 선택 삭제 모드 진입 버튼 */}
                <Button variant="ghost" onClick={() => setSelectMode(true)}>
                  선택 삭제
                </Button>
                <Button variant="ghost" onClick={() => setShowBulkModal(true)}>
                  계정 일괄 생성 ({accountlessStudents.length})
                </Button>
              </>
            )}
            {!isAdmin && (
              <Button variant="ghost" onClick={handleExcelDownload}>
                📤 엑셀 다운로드
              </Button>
            )}
          </div>

          {/* 반 필터 */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedClass(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${!selectedClass ? 'bg-ink text-white' : 'bg-surface text-ink-mute border border-line'}`}
            >
              전체 ({studentList.length})
            </button>
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${selectedClass === cls.id ? 'bg-navy text-white' : 'bg-surface text-ink-mute border border-line'}`}
              >
                {cls.name} ({studentList.filter((s) => s.classId === cls.id).length})
              </button>
            ))}
          </div>

          {/* 테이블 */}
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-ink-mute text-xs">
                  {/* 선택 모드: 전체 선택 체크박스 */}
                  {isAdmin && selectMode && (
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 accent-ink cursor-pointer"
                      />
                    </th>
                  )}
                  {/* 일반 모드: 드래그 핸들 열 */}
                  {isAdmin && !selectMode && <th className="px-2 py-3 w-8"></th>}
                  <th className="text-left px-3 py-3 font-medium">이름</th>
                  <th className="text-left px-2 py-3 font-medium">반</th>
                  <th className="text-left px-3 py-3 font-medium hidden md:table-cell">연락처</th>
                  {isAdmin && !selectMode && <th className="px-2 py-3 text-center font-medium">계정</th>}
                  {isAdmin && !selectMode && <th className="px-2 py-3"></th>}
                </tr>
              </thead>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleStudentDragEnd}
              >
                <SortableContext items={displayStudents.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <tbody>
                    {displayStudents.map((student) => (
                      <SortableStudentRow
                        key={student.id}
                        student={student}
                        isAdmin={isAdmin}
                        getClassName={getClassName}
                        username={studentUsernameById[student.id]}
                        onEdit={() => handleEdit(student)}
                        onDelete={() => handleDelete(student.id)}
                        onCreateAccount={() => openAccountModal(student)}
                        selectMode={selectMode}
                        selected={selectedIds.includes(student.id)}
                        onToggle={() => toggleSelect(student.id)}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </DndContext>
            </table>
            {displayStudents.length === 0 && (
              <div className="py-8 text-center text-ink-faint text-sm">학생이 없습니다.</div>
            )}
          </Card>

          {/* 선택 모드 하단 액션 바 — 이미 어두운 배경이라 Button의 밝은 배경용 variant를 쓰면
              글자가 배경에 묻힌다. 토큰 색만 입힌 네이티브 버튼을 그대로 둔다. */}
          {selectMode && (
            <div className="sticky bottom-4 flex items-center justify-between bg-ink text-white rounded px-4 py-3">
              <span className="text-sm">
                {selectedIds.length > 0
                  ? `${selectedIds.length}명 선택됨`
                  : '학생을 선택하세요'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={exitSelectMode}
                  className="px-4 py-1.5 rounded text-sm border border-white/30 hover:bg-white/10"
                >
                  취소
                </button>
                <button
                  onClick={() => selectedIds.length > 0 && setBulkDeleteConfirm(true)}
                  disabled={selectedIds.length === 0}
                  className="px-4 py-1.5 rounded text-sm bg-danger hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
                >
                  삭제
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === 반 관리 탭 === */}
      {activeTab === 'classes' && (
        <div className="flex flex-col gap-3">
          {isAdmin && (
            <Button
              variant="primary"
              onClick={() => { setShowClassForm(true); setEditClass(null); setClassForm({ name: '' }) }}
              className="w-fit"
            >
              + 반 추가
            </Button>
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
          <div className="bg-surface rounded p-6 w-full max-w-sm">
            <h2 className="font-bold text-ink mb-4">{editClass ? '반 수정' : '반 추가'}</h2>
            <form onSubmit={handleClassFormSubmit} className="flex flex-col gap-3">
              <input
                required
                placeholder="반 이름 (예: 수능국어A반)"
                value={classForm.name}
                onChange={(e) => setClassForm({ name: e.target.value })}
                className="w-full h-11 px-3 bg-surface-alt rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy"
              />
              <div className="flex gap-2 mt-1">
                <Button variant="ghost" type="button" onClick={() => setShowClassForm(false)} className="flex-1">취소</Button>
                <Button variant="primary" type="submit" className="flex-1">저장</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 계정 생성 모달 */}
      {accountModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-surface rounded p-6 w-full max-w-sm">
            <h2 className="font-bold text-ink mb-1">계정 생성</h2>
            <p className="text-sm text-ink-faint mb-4">{accountModal.name} 학생의 로그인 계정을 만듭니다.</p>

            {/* 성공/실패는 팔레트에 초록이 없어 Alert의 info(남색)/danger로 대응한다 */}
            {accountMsg.text && (
              <Alert tone={accountMsg.type === 'success' ? 'info' : 'danger'} className="mb-3">
                {accountMsg.text}
              </Alert>
            )}

            {accountMsg.type !== 'success' && (
              <form onSubmit={handleCreateAccount} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-mute mb-1">아이디</label>
                  <div className="flex items-center bg-surface-alt rounded px-3 h-11">
                    <input
                      required
                      placeholder="예: hong2025"
                      value={accountForm.username}
                      onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value.replace(/\s/g, '') })}
                      className="flex-1 bg-transparent text-sm focus:outline-none"
                    />
                    <span className="text-xs text-ink-faint">@soomoonjae.com</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-mute mb-1">초기 비밀번호</label>
                  <input
                    required
                    type="password"
                    placeholder="6자 이상"
                    minLength={6}
                    value={accountForm.password}
                    onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                    className="w-full h-11 px-3 bg-surface-alt rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                  />
                </div>
                <p className="text-xs text-ink-faint">* 학생이 처음 로그인 후 비밀번호를 변경하도록 안내하세요.</p>
                <div className="flex gap-2 mt-1">
                  <Button variant="ghost" type="button" onClick={() => setAccountModal(null)} className="flex-1">취소</Button>
                  <Button variant="primary" type="submit" disabled={accountLoading} className="flex-1">
                    {accountLoading ? '생성 중...' : '계정 생성'}
                  </Button>
                </div>
              </form>
            )}

            {accountMsg.type === 'success' && (
              <Button variant="primary" onClick={() => setAccountModal(null)} className="w-full">
                확인
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 계정 일괄 생성 모달 */}
      {showBulkModal && (
        <BulkAccountModal
          students={accountlessStudents}
          getClassName={getClassName}
          onClose={() => setShowBulkModal(false)}
          onDone={refreshStudentAccounts}
        />
      )}

      {/* 학생 추가/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-surface rounded p-6 w-full max-w-sm">
            <h2 className="font-bold text-ink mb-4">{editTarget ? '학생 수정' : '학생 추가'}</h2>
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-3">
              <input required placeholder="이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-11 px-3 bg-surface-alt rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy" />
              <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="w-full h-11 px-3 bg-surface-alt rounded text-sm focus:outline-none">
                <option value="">반 선택</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input placeholder="연락처 (010-0000-0000)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full h-11 px-3 bg-surface-alt rounded text-sm focus:outline-none" />
              <input placeholder="학부모 연락처" value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} className="w-full h-11 px-3 bg-surface-alt rounded text-sm focus:outline-none" />
              <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className="w-full h-11 px-3 bg-surface-alt rounded text-sm focus:outline-none">
                <option value="">학년 선택(내신)</option>
                {GRADES.map((g) => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
              </select>
              <select value={form.jeongsiLevel} onChange={(e) => setForm({ ...form, jeongsiLevel: e.target.value })} className="w-full h-11 px-3 bg-surface-alt rounded text-sm focus:outline-none">
                <option value="">정시 레벨(선택 안 함)</option>
                {JEONGSI_LEVELS.map((l) => <option key={l} value={l}>{JEONGSI_LEVEL_LABELS[l]}</option>)}
              </select>
              <div className="flex gap-2 mt-1">
                <Button variant="ghost" type="button" onClick={() => setShowForm(false)} className="flex-1">취소</Button>
                <Button variant="primary" type="submit" className="flex-1">저장</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 일괄 삭제 확인 모달 */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-surface rounded p-6 w-full max-w-sm">
            <h2 className="font-bold text-ink mb-2">학생 일괄 삭제</h2>
            <p className="text-sm text-ink-mute mb-5">
              선택한 <span className="font-semibold text-danger">{selectedIds.length}명</span>의 학생을
              삭제하시겠습니까?<br />삭제 후 복구할 수 없습니다.
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setBulkDeleteConfirm(false)}
                className="flex-1"
              >
                취소
              </Button>
              {/* 삭제는 위험 동작이라 accent(남색)가 아니라 danger 톤을 직접 입힌다 —
                  Button에는 danger variant가 없어 여기만 수동으로 남긴다 */}
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex-1 h-11 bg-danger text-white rounded text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {bulkDeleting ? '삭제 중...' : `${selectedIds.length}명 삭제`}
              </button>
            </div>
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
      className="bg-surface border border-line rounded p-4 flex items-center gap-3 cursor-pointer"
    >
      {isAdmin && (
        <div
          {...attributes} {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab text-ink-faint hover:text-ink-mute text-lg select-none px-1"
        >
          ⠿
        </div>
      )}
      <div className="flex-1">
        <h3 className="font-bold text-ink">{cls.name}</h3>
        <p className="text-xs text-ink-faint mt-0.5">학생 {count}명 · 클릭하면 학생 목록</p>
      </div>
      {isAdmin && (
        <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
          <button onClick={onEdit} className="text-xs text-navy hover:underline">수정</button>
          <button onClick={onDelete} className="text-xs text-danger hover:underline">삭제</button>
        </div>
      )}
    </div>
  )
}

// ── 드래그 가능한 학생 행 ──────────────────────────────
function SortableStudentRow({
  student, isAdmin, getClassName, username,
  onEdit, onDelete, onCreateAccount,
  selectMode, selected, onToggle,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: student.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      onClick={selectMode ? onToggle : undefined}
      className={`border-b border-line-soft transition-colors ${
        selectMode
          ? selected
            ? 'bg-navy-soft cursor-pointer'
            : 'hover:bg-surface-alt cursor-pointer'
          : 'hover:bg-surface-alt'
      }`}
    >
      {/* 선택 모드: 체크박스 */}
      {isAdmin && selectMode && (
        <td className="px-4 py-3 w-10" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="w-4 h-4 accent-ink cursor-pointer"
          />
        </td>
      )}
      {/* 일반 모드: 드래그 핸들 */}
      {isAdmin && !selectMode && (
        <td className="px-2 py-3 w-8">
          <div {...attributes} {...listeners} className="cursor-grab text-ink-faint hover:text-ink-mute flex justify-center select-none">
            ⠿
          </div>
        </td>
      )}
      <td className="px-3 py-3 font-medium whitespace-nowrap">{student.name}</td>
      <td className="px-2 py-3 text-ink-mute text-xs whitespace-nowrap max-w-[80px] truncate">{getClassName(student.classId)}</td>
      <td className="px-3 py-3 text-ink-mute hidden md:table-cell">{student.phone}</td>
      {isAdmin && !selectMode && (
        <td className="px-2 py-3 text-center">
          {username
            ? <span className="font-mono text-xs text-ink whitespace-nowrap">{username}</span>
            : <button onClick={onCreateAccount} className="text-xs text-navy hover:underline whitespace-nowrap">
                계정 생성
              </button>}
        </td>
      )}
      {isAdmin && !selectMode && (
        <td className="px-2 py-3">
          <div className="flex gap-1.5 justify-end">
            <button onClick={onEdit} className="text-xs text-navy hover:underline">수정</button>
            <button onClick={onDelete} className="text-xs text-danger hover:underline">삭제</button>
          </div>
        </td>
      )}
    </tr>
  )
}
