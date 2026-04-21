// src/context/DataContext.jsx
// Supabase에서 데이터를 불러와 앱 전체에 제공하는 컨텍스트
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { classes as mockClasses } from '../data/classes'
import { students as mockStudents } from '../data/students'
import { attendance as mockAttendance } from '../data/attendance'
import { grades as mockGrades } from '../data/grades'
import { qnaQuestions as mockQna } from '../data/qna'
import { notices as mockNotices } from '../data/notices'
import { reports as mockReports } from '../data/reports'

const DataContext = createContext(null)

// Supabase의 snake_case를 앱에서 쓰는 camelCase로 변환
function toAttendance(a) {
  return { id: a.id, studentId: a.student_id, date: a.date, status: a.status, type: a.type ?? '수업' }
}
function toGrade(g) {
  return {
    id: g.id, studentId: g.student_id, type: g.type,
    date: g.date, subject: g.subject, part: g.part ?? '',
    score: Number(g.score), total: Number(g.total),
  }
}
function toClass(c) {
  return { id: c.id, name: c.name, teacherId: c.teacher_id, sortOrder: c.sort_order ?? c.id }
}
function toStudent(s) {
  return {
    id:          s.id,
    name:        s.name,
    phone:       s.phone       ?? '',
    parentPhone: s.parent_phone ?? '',
    classId:     s.class_id,
    joinDate:    s.join_date   ?? '',
    sortOrder:   s.sort_order  ?? s.id,
  }
}
function toQna(q) {
  return {
    id:         q.id,
    testId:     q.test_id,
    questionId: q.question_id,
    studentId:  q.student_id,
    content:    q.content,
    createdAt:  q.created_at,
    answer:     q.answer,
    answeredAt: q.answered_at,
    answeredBy: q.answered_by,
  }
}
function toNotice(n) {
  return {
    id:             n.id,
    title:          n.title,
    content:        n.content,
    authorId:       n.author_id,
    targetClassIds: n.target_class_ids ?? [],
    createdAt:      n.created_at,
    kakaoSent:      n.kakao_sent ?? false,
  }
}
function toReport(r) {
  return {
    id:            r.id,
    classId:       r.class_id,
    date:          r.date,
    subject:       r.subject,
    content:       r.content,
    homework:      r.homework ?? '',
    studentChecks: r.student_checks ?? [],
    createdBy:     r.created_by,
  }
}

export function DataProvider({ children }) {
  const [classes,    setClasses]    = useState(mockClasses)
  const [students,   setStudents]   = useState(mockStudents)
  const [attendance, setAttendance] = useState(mockAttendance)
  const [grades,     setGrades]     = useState(mockGrades)
  const [qnaList,    setQnaList]    = useState(mockQna)
  const [notices,    setNotices]    = useState(mockNotices)
  const [reports,    setReports]    = useState(mockReports)
  const [dataLoading, setDataLoading] = useState(true)

  // 앱 시작 시 Supabase에서 데이터 로드
  useEffect(() => {
    async function load() {
      const [cRes, sRes, aRes, gRes, qRes, nRes, rRes] = await Promise.all([
        supabase.from('classes').select('*').order('sort_order').order('id'),
        supabase.from('students').select('*').order('sort_order').order('id'),
        supabase.from('attendance').select('*').order('date', { ascending: false }),
        supabase.from('grades').select('*').order('date', { ascending: false }),
        supabase.from('qna').select('*').order('created_at', { ascending: false }),
        supabase.from('notices').select('*').order('created_at', { ascending: false }),
        supabase.from('reports').select('*').order('date', { ascending: false }),
      ])

      if (!cRes.error && cRes.data?.length > 0) setClasses(cRes.data.map(toClass))
      if (!sRes.error && sRes.data?.length > 0) setStudents(sRes.data.map(toStudent))
      if (!aRes.error && aRes.data?.length > 0) setAttendance(aRes.data.map(toAttendance))
      if (!gRes.error && gRes.data?.length > 0) setGrades(gRes.data.map(toGrade))
      if (!qRes.error && qRes.data?.length > 0) setQnaList(qRes.data.map(toQna))
      if (!nRes.error && nRes.data?.length > 0) setNotices(nRes.data.map(toNotice))
      if (!rRes.error && rRes.data?.length > 0) setReports(rRes.data.map(toReport))
      setDataLoading(false)
    }
    load()
  }, [])

  // ── 학생 CRUD ──────────────────────────────────────────

  async function addStudent(data) {
    const { data: inserted, error } = await supabase
      .from('students')
      .insert([{
        name:         data.name,
        phone:        data.phone        || null,
        parent_phone: data.parentPhone  || null,
        class_id:     Number(data.classId) || null,
        join_date:    data.joinDate     || new Date().toISOString().slice(0, 10),
      }])
      .select()
      .single()

    if (error) { console.error('학생 추가 실패:', error); return null }
    const newStudent = toStudent(inserted)
    setStudents((prev) => [...prev, newStudent])
    return newStudent
  }

  async function updateStudent(id, data) {
    const { error } = await supabase
      .from('students')
      .update({
        name:         data.name,
        phone:        data.phone        || null,
        parent_phone: data.parentPhone  || null,
        class_id:     Number(data.classId) || null,
        join_date:    data.joinDate     || null,
      })
      .eq('id', id)

    if (error) { console.error('학생 수정 실패:', error); return }
    setStudents((prev) =>
      prev.map((s) => s.id === id ? { ...s, ...data, classId: Number(data.classId) } : s)
    )
  }

  async function deleteStudent(id) {
    const { error } = await supabase.from('students').delete().eq('id', id)
    if (error) { console.error('학생 삭제 실패:', error); return }
    setStudents((prev) => prev.filter((s) => s.id !== id))
  }

  // 엑셀 업로드 시 여러 학생 한 번에 추가
  async function bulkAddStudents(dataArray) {
    const rows = dataArray.map((d) => ({
      name:         d.name,
      phone:        d.phone        || null,
      parent_phone: d.parentPhone  || null,
      class_id:     Number(d.classId) || null,
      join_date:    d.joinDate     || new Date().toISOString().slice(0, 10),
    }))

    const { data: inserted, error } = await supabase
      .from('students')
      .insert(rows)
      .select()

    if (error) { console.error('학생 일괄 추가 실패:', error); return }
    setStudents((prev) => [...prev, ...inserted.map(toStudent)])
  }

  // ── 출결 CRUD ──────────────────────────────────────────

  // 출결 기록 저장 (없으면 추가, 있으면 수정)
  async function upsertAttendance(studentId, date, status, type = '수업') {
    const { data: upserted, error } = await supabase
      .from('attendance')
      .upsert({ student_id: studentId, date, status, type }, { onConflict: 'student_id,date,type' })
      .select()
      .single()

    if (error) { console.error('출결 저장 실패:', error); return }
    const record = toAttendance(upserted)
    setAttendance((prev) => {
      const exists = prev.some((a) => a.studentId === studentId && a.date === date && a.type === type)
      return exists
        ? prev.map((a) => a.studentId === studentId && a.date === date && a.type === type ? record : a)
        : [record, ...prev]
    })
  }

  async function deleteAttendance(studentId, date, type = '수업') {
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('student_id', studentId)
      .eq('date', date)
      .eq('type', type)

    if (error) { console.error('출결 삭제 실패:', error); return }
    setAttendance((prev) => prev.filter((a) => !(a.studentId === studentId && a.date === date && a.type === type)))
  }

  // ── 성적 CRUD ──────────────────────────────────────────

  async function addGrade(data) {
    const { data: inserted, error } = await supabase
      .from('grades')
      .insert([{
        student_id: data.studentId,
        type:       data.type,
        date:       data.date,
        subject:    data.subject,
        part:       data.part || null,
        score:      Number(data.score),
        total:      Number(data.total) || 100,
      }])
      .select()
      .single()

    if (error) { console.error('성적 추가 실패:', error); return null }
    const newGrade = toGrade(inserted)
    setGrades((prev) => [newGrade, ...prev])
    return newGrade
  }

  async function updateGrade(id, data) {
    const { error } = await supabase
      .from('grades')
      .update({
        student_id: data.studentId,
        type:       data.type,
        date:       data.date,
        subject:    data.subject,
        part:       data.part || null,
        score:      Number(data.score),
        total:      Number(data.total) || 100,
      })
      .eq('id', id)

    if (error) { console.error('성적 수정 실패:', error); return }
    setGrades((prev) => prev.map((g) => g.id === id ? { ...g, ...data, score: Number(data.score), total: Number(data.total) } : g))
  }

  async function deleteGrade(id) {
    const { error } = await supabase.from('grades').delete().eq('id', id)
    if (error) { console.error('성적 삭제 실패:', error); return }
    setGrades((prev) => prev.filter((g) => g.id !== id))
  }

  // ── Q&A CRUD ───────────────────────────────────────────

  async function addQuestion(data) {
    const { data: inserted, error } = await supabase
      .from('qna')
      .insert([{
        test_id:     data.testId,
        question_id: data.questionId ?? null,
        student_id:  data.studentId,
        content:     data.content,
      }])
      .select()
      .single()

    if (error) { console.error('질문 등록 실패:', error); return null }
    const newQ = toQna(inserted)
    setQnaList((prev) => [newQ, ...prev])
    return newQ
  }

  async function answerQuestion(id, answer, answeredBy) {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('qna')
      .update({ answer, answered_at: now, answered_by: answeredBy })
      .eq('id', id)

    if (error) { console.error('답변 등록 실패:', error); return }
    setQnaList((prev) =>
      prev.map((q) => q.id === id ? { ...q, answer, answeredAt: now, answeredBy } : q)
    )
  }

  // ── 공지사항 CRUD ──────────────────────────────────────

  async function addNotice(data) {
    const { data: inserted, error } = await supabase
      .from('notices')
      .insert([{
        title:            data.title,
        content:          data.content,
        author_id:        data.authorId,
        target_class_ids: data.targetClassIds,
        kakao_sent:       data.kakaoSent ?? false,
      }])
      .select()
      .single()

    if (error) { console.error('공지 등록 실패:', error); return null }
    const newN = toNotice(inserted)
    setNotices((prev) => [newN, ...prev])
    return newN
  }

  // ── 진도 리포트 CRUD ───────────────────────────────────

  async function addReport(data) {
    const { data: inserted, error } = await supabase
      .from('reports')
      .insert([{
        class_id:       data.classId,
        date:           data.date,
        subject:        data.subject,
        content:        data.content,
        homework:       data.homework ?? '',
        student_checks: data.studentChecks ?? [],
        created_by:     data.createdBy,
      }])
      .select()
      .single()

    if (error) { console.error('리포트 등록 실패:', error); return null }
    const newR = toReport(inserted)
    setReports((prev) => [newR, ...prev])
    return newR
  }

  async function updateReportChecks(id, studentChecks) {
    const { error } = await supabase
      .from('reports')
      .update({ student_checks: studentChecks })
      .eq('id', id)

    if (error) { console.error('과제 체크 저장 실패:', error); return }
    setReports((prev) =>
      prev.map((r) => r.id === id ? { ...r, studentChecks } : r)
    )
  }

  // ── 순서 변경 ──────────────────────────────────────────

  async function reorderStudents(orderedIds) {
    // 지정된 ID들의 순서만 변경하고, 나머지 학생은 그대로 유지
    setStudents((prev) => {
      const idSet = new Set(orderedIds)
      const reordered = orderedIds.map((id) => prev.find((s) => s.id === id)).filter(Boolean)
      const others    = prev.filter((s) => !idSet.has(s.id))
      return [...reordered, ...others]
    })
    const results = await Promise.all(
      orderedIds.map((id, index) =>
        supabase.from('students').update({ sort_order: index }).eq('id', id)
      )
    )
    const errs = results.filter((r) => r.error)
    if (errs.length) console.error('학생 순서 저장 실패:', errs[0].error)
  }

  async function reorderClasses(orderedIds) {
    setClasses((prev) => orderedIds.map((id) => prev.find((c) => c.id === id)).filter(Boolean))
    const results = await Promise.all(
      orderedIds.map((id, index) =>
        supabase.from('classes').update({ sort_order: index }).eq('id', id)
      )
    )
    const errs = results.filter((r) => r.error)
    if (errs.length) console.error('반 순서 저장 실패:', errs[0].error)
  }

  // ── 반 CRUD ────────────────────────────────────────────

  async function addClass(data) {
    const { data: inserted, error } = await supabase
      .from('classes')
      .insert([{ name: data.name, teacher_id: data.teacherId || null }])
      .select()
      .single()

    if (error) { console.error('반 추가 실패:', error); return null }
    const newClass = toClass(inserted)
    setClasses((prev) => [...prev, newClass])
    return newClass
  }

  async function updateClass(id, data) {
    const { error } = await supabase
      .from('classes')
      .update({ name: data.name, teacher_id: data.teacherId || null })
      .eq('id', id)

    if (error) { console.error('반 수정 실패:', error); return }
    setClasses((prev) =>
      prev.map((c) => c.id === id ? { ...c, ...data } : c)
    )
  }

  async function deleteClass(id) {
    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (error) { console.error('반 삭제 실패:', error); return }
    setClasses((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <DataContext.Provider value={{
      classes, students, attendance, grades, qnaList, notices, reports,
      dataLoading,
      addStudent, updateStudent, deleteStudent, bulkAddStudents,
      addClass,  updateClass,  deleteClass,
      reorderStudents, reorderClasses,
      upsertAttendance, deleteAttendance,
      addGrade, updateGrade, deleteGrade,
      addQuestion, answerQuestion,
      addNotice,
      addReport, updateReportChecks,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
