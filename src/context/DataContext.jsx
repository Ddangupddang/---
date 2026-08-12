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
import {
  toHomeworkSet, toHomeworkDay, toHomeworkQuestion, toHomeworkSubmission,
} from '../utils/homeworkMappers'
import { dateForWeekday } from '../utils/homeworkWeek'

const DataContext = createContext(null)

// Supabase snake_case → 앱 camelCase 변환
function toAttendance(a) {
  return { id: a.id, studentId: a.student_id, date: a.date, status: a.status, type: a.type ?? '수업' }
}
function toWeeklyNote(n) {
  return {
    id: n.id, studentId: n.student_id, weekStart: n.week_start,
    content: n.content ?? '', updatedAt: n.updated_at,
  }
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
    grade:       s.grade         ?? null,   // 학년(내신)
    jeongsiLevel: s.jeongsi_level ?? null,  // 정시 레벨
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
function toVideo(v) {
  return {
    id:         v.id,
    title:      v.title,
    youtubeUrl: v.youtube_url ?? '',
    videoId:    v.video_id    ?? '',
    thumbnail:  v.thumbnail   ?? '',
    classId:    v.class_id,
    teacherId:  v.teacher_id,
    createdAt:  v.created_at  ?? '',
  }
}
function toVideoComment(c) {
  return {
    id:        c.id,
    videoId:   c.video_id,
    studentId: c.student_id,
    content:   c.content,
    reply:     c.reply ?? null,
    createdAt: c.created_at,
  }
}
function toTest(t) {
  return {
    id:         t.id,
    title:      t.title,
    classId:    t.class_id,
    teacherId:  t.teacher_id,
    date:       t.date,
    timeLimit:  t.time_limit,
    status:     t.status,
    startedAt:  t.started_at ?? null,
    questions:  t.questions  ?? [],
    createdAt:  t.created_at,
  }
}
function toSubmission(s) {
  return {
    id:          s.id,
    testId:      s.test_id,
    studentId:   s.student_id,
    submittedAt: s.submitted_at,
    answers:     s.answers ?? [],
    scores:      s.scores  ?? [],
  }
}
export function DataProvider({ children }) {
  const [classes,       setClasses]       = useState(mockClasses)
  const [students,      setStudents]      = useState(mockStudents)
  const [attendance,    setAttendance]    = useState(mockAttendance)
  const [grades,        setGrades]        = useState(mockGrades)
  const [qnaList,       setQnaList]       = useState(mockQna)
  const [notices,       setNotices]       = useState(mockNotices)
  const [reports,       setReports]       = useState(mockReports)
  const [staffProfiles, setStaffProfiles] = useState([])
  const [videos,        setVideos]        = useState([])
  const [videoComments, setVideoComments] = useState([])
  const [tests,         setTests]         = useState([])
  const [submissions,   setSubmissions]   = useState([])
  const [homeworkSets,        setHomeworkSets]        = useState([])
  const [homeworkDays,        setHomeworkDays]        = useState([])
  const [homeworkQuestions,   setHomeworkQuestions]   = useState([])
  const [homeworkSubmissions, setHomeworkSubmissions] = useState([])
  const [weeklyNotes, setWeeklyNotes] = useState([])
  const [dataLoading,   setDataLoading]   = useState(true)
  const [studentAccountIds, setStudentAccountIds] = useState([])
  // 학생 ID → 로그인 아이디(username) 매핑. 학생 관리 목록에 아이디를 보여줄 때 사용.
  const [studentUsernameById, setStudentUsernameById] = useState({})

  useEffect(() => {
    async function load() {
      const [cRes, sRes, aRes, gRes, qRes, nRes, rRes, pRes, vRes, vcRes, tRes, subRes, hwSetsRes, hwDaysRes, hwQRes, hwSubRes, wnRes, saRes] =
        await Promise.all([
          supabase.from('classes').select('*').order('sort_order').order('id'),
          supabase.from('students').select('*').order('sort_order').order('id'),
          supabase.from('attendance').select('*').order('date', { ascending: false }),
          supabase.from('grades').select('*').order('date', { ascending: false }),
          supabase.from('qna').select('*').order('created_at', { ascending: false }),
          supabase.from('notices').select('*').order('created_at', { ascending: false }),
          supabase.from('reports').select('*').order('date', { ascending: false }),
          supabase.from('profiles').select('id, name, role').in('role', ['admin', 'teacher']),
          supabase.from('videos').select('*').order('created_at', { ascending: false }),
          supabase.from('video_comments').select('*').order('created_at'),
          supabase.from('tests').select('*').order('created_at', { ascending: false }),
          supabase.from('submissions').select('*').order('submitted_at', { ascending: false }),
          supabase.from('homework_sets').select('*').order('week_start', { ascending: false }),
          supabase.from('homework_days').select('*'),
          supabase.from('homework_questions').select('*'),
          supabase.from('homework_submissions_v2').select('*'),
          supabase.from('weekly_report_notes').select('*'),
          supabase.from('profiles').select('student_id, username').eq('role', 'student'),
        ])

      if (!cRes.error && cRes.data?.length > 0) setClasses(cRes.data.map(toClass))
      if (!sRes.error && sRes.data)              setStudents(sRes.data.map(toStudent))
      if (!aRes.error && aRes.data?.length > 0) setAttendance(aRes.data.map(toAttendance))
      if (!gRes.error && gRes.data?.length > 0) setGrades(gRes.data.map(toGrade))
      if (!qRes.error && qRes.data)              setQnaList(qRes.data.map(toQna))
      if (!nRes.error && nRes.data?.length > 0) setNotices(nRes.data.map(toNotice))
      if (!rRes.error && rRes.data?.length > 0) setReports(rRes.data.map(toReport))
      if (!pRes.error && pRes.data)              setStaffProfiles(pRes.data)
      if (!vRes.error && vRes.data)              setVideos(vRes.data.map(toVideo))
      if (!vcRes.error && vcRes.data)            setVideoComments(vcRes.data.map(toVideoComment))
      if (!tRes.error && tRes.data)              setTests(tRes.data.map(toTest))
      if (!subRes.error && subRes.data)          setSubmissions(subRes.data.map(toSubmission))
      if (!hwSetsRes.error && hwSetsRes.data) setHomeworkSets(hwSetsRes.data.map(toHomeworkSet))
      if (!hwDaysRes.error && hwDaysRes.data) setHomeworkDays(hwDaysRes.data.map(toHomeworkDay))
      if (!hwQRes.error && hwQRes.data)       setHomeworkQuestions(hwQRes.data.map(toHomeworkQuestion))
      if (!hwSubRes.error && hwSubRes.data)   setHomeworkSubmissions(hwSubRes.data.map(toHomeworkSubmission))
      if (!wnRes.error && wnRes.data) setWeeklyNotes(wnRes.data.map(toWeeklyNote))
      if (!saRes.error && saRes.data) {
        const withId = saRes.data.filter((r) => r.student_id)
        setStudentAccountIds(withId.map((r) => r.student_id))
        setStudentUsernameById(Object.fromEntries(withId.map((r) => [r.student_id, r.username])))
      }

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
        grade:        data.grade ? Number(data.grade) : null,
        jeongsi_level: data.jeongsiLevel ? Number(data.jeongsiLevel) : null,
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
        grade:        data.grade ? Number(data.grade) : null,
        jeongsi_level: data.jeongsiLevel ? Number(data.jeongsiLevel) : null,
        join_date:    data.joinDate     || null,
      })
      .eq('id', id)

    if (error) { console.error('학생 수정 실패:', error); return }
    setStudents((prev) =>
      prev.map((s) => s.id === id ? {
        ...s, ...data,
        classId: Number(data.classId),
        grade: data.grade ? Number(data.grade) : null,
        jeongsiLevel: data.jeongsiLevel ? Number(data.jeongsiLevel) : null,
      } : s)
    )
  }

  async function deleteStudent(id) {
    const { data: deleted, error } = await supabase
      .from('students').delete().eq('id', id).select()
    if (error) { console.error('학생 삭제 실패:', error); return }
    if (!deleted?.length) { console.error('학생 삭제 실패: 0 rows deleted (RLS 정책 확인 필요)'); return }
    setStudents((prev) => prev.filter((s) => s.id !== id))
  }

  async function bulkDeleteStudents(ids) {
    const { data: deleted, error } = await supabase
      .from('students').delete().in('id', ids).select()
    if (error) { console.error('학생 일괄 삭제 실패:', error); return }
    if (!deleted?.length) { console.error('학생 일괄 삭제 실패: 0 rows deleted (RLS 정책 확인 필요)'); return }
    setStudents((prev) => prev.filter((s) => !ids.includes(s.id)))
  }

  async function bulkAddStudents(dataArray) {
    const rows = dataArray.map((d) => ({
      name:         d.name,
      phone:        d.phone        || null,
      parent_phone: d.parentPhone  || null,
      class_id:     Number(d.classId) || null,
      grade:        d.grade ? Number(d.grade) : null,
      jeongsi_level: d.jeongsiLevel ? Number(d.jeongsiLevel) : null,
      join_date:    d.joinDate     || new Date().toISOString().slice(0, 10),
    }))

    const { data: inserted, error } = await supabase
      .from('students').insert(rows).select()

    if (error) { console.error('학생 일괄 추가 실패:', error); return }
    setStudents((prev) => [...prev, ...inserted.map(toStudent)])
  }

  // ── 출결 CRUD ──────────────────────────────────────────

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
    const { data: deleted, error } = await supabase
      .from('attendance')
      .delete()
      .eq('student_id', studentId)
      .eq('date', date)
      .eq('type', type)
      .select()

    if (error) { console.error('출결 삭제 실패:', error); return }
    if (!deleted?.length) { console.error('출결 삭제 실패: 0 rows deleted (RLS 정책 확인 필요)'); return }
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
    const { data: deleted, error } = await supabase.from('grades').delete().eq('id', id).select()
    if (error) { console.error('성적 삭제 실패:', error); return }
    if (!deleted?.length) { console.error('성적 삭제 실패: 0 rows deleted (RLS 정책 확인 필요)'); return }
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

  async function deleteNotice(id) {
    const { data: deleted, error } = await supabase.from('notices').delete().eq('id', id).select()
    if (error) { console.error('공지 삭제 실패:', error); return }
    if (!deleted?.length) { console.error('공지 삭제 실패: 0 rows deleted (RLS 정책 확인 필요)'); return }
    setNotices((prev) => prev.filter((n) => n.id !== id))
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

  async function deleteReport(id) {
    const { data: deleted, error } = await supabase.from('reports').delete().eq('id', id).select()
    if (error) { console.error('리포트 삭제 실패:', error); return }
    if (!deleted?.length) { console.error('리포트 삭제 실패: 0 rows deleted (RLS 정책 확인 필요)'); return }
    setReports((prev) => prev.filter((r) => r.id !== id))
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

  // ── 영상 CRUD ──────────────────────────────────────────

  async function addVideo(data) {
    const { data: inserted, error } = await supabase
      .from('videos')
      .insert([{
        title:       data.title,
        youtube_url: data.youtubeUrl  ?? null,
        video_id:    data.videoId     ?? null,
        thumbnail:   data.thumbnail   ?? null,
        class_id:    data.classId     ?? null,
        teacher_id:  data.teacherId   ?? null,
        created_at:  new Date().toISOString().slice(0, 10),
      }])
      .select()
      .single()

    if (error) { console.error('영상 추가 실패:', error); return null }
    const newVideo = toVideo(inserted)
    setVideos((prev) => [newVideo, ...prev])
    return newVideo
  }

  async function deleteVideo(id) {
    const { data: deleted, error } = await supabase.from('videos').delete().eq('id', id).select()
    if (error) { console.error('영상 삭제 실패:', error); return }
    if (!deleted?.length) { console.error('영상 삭제 실패: 0 rows deleted (RLS 정책 확인 필요)'); return }
    setVideos((prev) => prev.filter((v) => v.id !== id))
    setVideoComments((prev) => prev.filter((c) => c.videoId !== id))
  }

  async function addVideoComment(data) {
    const { data: inserted, error } = await supabase
      .from('video_comments')
      .insert([{
        video_id:   data.videoId,
        student_id: data.studentId ?? null,
        content:    data.content,
      }])
      .select()
      .single()

    if (error) { console.error('댓글 추가 실패:', error); return null }
    const newComment = toVideoComment(inserted)
    setVideoComments((prev) => [...prev, newComment])
    return newComment
  }

  async function replyVideoComment(id, reply) {
    const { error } = await supabase.from('video_comments').update({ reply }).eq('id', id)
    if (error) { console.error('답글 저장 실패:', error); return }
    setVideoComments((prev) => prev.map((c) => c.id === id ? { ...c, reply } : c))
  }

  // ── 테스트 CRUD ────────────────────────────────────────

  async function addTest(data) {
    const { data: inserted, error } = await supabase
      .from('tests')
      .insert([{
        title:      data.title,
        class_id:   data.classId   ?? null,
        teacher_id: data.teacherId ?? null,
        date:       data.date,
        time_limit: data.timeLimit ?? null,
        status:     data.status    ?? 'ready',
        started_at: data.startedAt ?? null,
        questions:  data.questions ?? [],
      }])
      .select()
      .single()

    if (error) { console.error('테스트 추가 실패:', error); return null }
    const newTest = toTest(inserted)
    setTests((prev) => [newTest, ...prev])
    return newTest
  }

  async function updateTestStatus(id, status, startedAt = null) {
    const updates = { status }
    if (startedAt) updates.started_at = startedAt
    const { error } = await supabase.from('tests').update(updates).eq('id', id)
    if (error) { console.error('테스트 상태 변경 실패:', error); return }
    setTests((prev) => prev.map((t) => t.id === id ? { ...t, status, startedAt } : t))
  }

  async function deleteTest(id) {
    const { data: deleted, error } = await supabase.from('tests').delete().eq('id', id).select()
    if (error) { console.error('테스트 삭제 실패:', error); return }
    if (!deleted?.length) { console.error('테스트 삭제 실패: 0 rows deleted (RLS 정책 확인 필요)'); return }
    setTests((prev) => prev.filter((t) => t.id !== id))
    setSubmissions((prev) => prev.filter((s) => s.testId !== id))
  }

  // ── 제출 CRUD ──────────────────────────────────────────

  async function addSubmission(data) {
    const { data: inserted, error } = await supabase
      .from('submissions')
      .insert([{
        test_id:    data.testId,
        student_id: data.studentId ?? null,
        answers:    data.answers   ?? [],
        scores:     data.scores    ?? [],
      }])
      .select()
      .single()

    if (error) { console.error('제출 실패:', error); return null }
    const newSub = toSubmission(inserted)
    setSubmissions((prev) => [newSub, ...prev])
    return newSub
  }

  async function updateSubmissionScores(id, scores) {
    const { error } = await supabase.from('submissions').update({ scores }).eq('id', id)
    if (error) { console.error('채점 저장 실패:', error); return }
    setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, scores } : s))
  }

  // ── 과제(내신/정시) CRUD ─────────────────────────────
  // 주간 세트 + 요일 + 문항을 한 번에 생성
  async function addHomeworkSet(payload) {
    const { data: setRow, error: setErr } = await supabase
      .from('homework_sets')
      .insert([{
        category:   payload.category,
        target:     Number(payload.target),
        week_start: payload.weekStart,
        title:      payload.title,
        teacher_id: payload.teacherId,
      }])
      .select().single()
    if (setErr) { console.error('과제 세트 생성 실패:', setErr); return null }

    const newDays = []
    const newQuestions = []
    for (const day of payload.days) {
      const { data: dayRow, error: dayErr } = await supabase
        .from('homework_days')
        .insert([{
          set_id:  setRow.id,
          weekday: day.weekday,
          date:    dateForWeekday(payload.weekStart, day.weekday),
          question_count: day.questionCount,
          day_solution_video_url: day.daySolutionVideoUrl || null,
          day_solution_file_url:  day.daySolutionFileUrl || null,
        }])
        .select().single()
      if (dayErr) { console.error('과제 요일 생성 실패:', dayErr); continue }
      newDays.push(toHomeworkDay(dayRow))

      if (day.questions?.length) {
        const rows = day.questions.map((q) => ({
          day_id: dayRow.id,
          number: q.number,
          answer: q.answer,
          solution_video_url: q.solutionVideoUrl || null,
          solution_file_url:  q.solutionFileUrl || null,
        }))
        const { data: qRows, error: qErr } = await supabase
          .from('homework_questions').insert(rows).select()
        if (qErr) { console.error('과제 문항 생성 실패:', qErr); continue }
        newQuestions.push(...qRows.map(toHomeworkQuestion))
      }
    }

    const newSet = toHomeworkSet(setRow)
    setHomeworkSets((prev) => [newSet, ...prev])
    setHomeworkDays((prev) => [...prev, ...newDays])
    setHomeworkQuestions((prev) => [...prev, ...newQuestions])
    return newSet
  }

  // 기존 세트 수정 — 요일·문항을 지금 입력한 내용에 맞춘다.
  // 문항은 통째로 지우고 다시 넣는다. 제출(homework_submissions_v2)은 요일(day_id)만 참조하고
  // 답은 문항 번호로 맞추므로, 문항 id가 바뀌어도 학생 제출은 그대로 남는다.
  // 학생 점수는 저장돼 있지 않고 화면에서 계산하므로 정답만 고치면 결과는 저절로 반영된다.
  async function updateHomeworkSet(setId, payload) {
    const { data: setRow, error: setErr } = await supabase
      .from('homework_sets')
      .update({
        target:     Number(payload.target),
        week_start: payload.weekStart,
        title:      payload.title,
      })
      .eq('id', setId).select().single()
    if (setErr) { console.error('과제 세트 수정 실패:', setErr); return null }

    const existing = homeworkDays.filter((d) => d.setId === setId)
    const keep = new Set(payload.days.map((d) => d.weekday))

    // 사용 해제된 요일은 삭제한다 (cascade로 그 요일의 문항·제출도 함께 사라진다)
    const dropped = existing.filter((d) => !keep.has(d.weekday))
    if (dropped.length) {
      const { error } = await supabase
        .from('homework_days').delete().in('id', dropped.map((d) => d.id))
      if (error) { console.error('과제 요일 삭제 실패:', error); return null }
    }

    const nextDays = []
    const nextQuestions = []
    for (const day of payload.days) {
      const prev = existing.find((d) => d.weekday === day.weekday)
      const fields = {
        set_id:  setId,
        weekday: day.weekday,
        date:    dateForWeekday(payload.weekStart, day.weekday),
        question_count: day.questionCount,
        day_solution_video_url: day.daySolutionVideoUrl || null,
        day_solution_file_url:  day.daySolutionFileUrl || null,
      }
      const { data: dayRow, error: dayErr } = prev
        ? await supabase.from('homework_days').update(fields).eq('id', prev.id).select().single()
        : await supabase.from('homework_days').insert([fields]).select().single()
      if (dayErr) { console.error('과제 요일 저장 실패:', dayErr); return null }
      nextDays.push(toHomeworkDay(dayRow))

      const { error: delErr } = await supabase
        .from('homework_questions').delete().eq('day_id', dayRow.id)
      if (delErr) { console.error('과제 문항 교체 실패:', delErr); return null }
      if (day.questions?.length) {
        const rows = day.questions.map((q) => ({
          day_id: dayRow.id,
          number: q.number,
          answer: q.answer,
          solution_video_url: q.solutionVideoUrl || null,
          solution_file_url:  q.solutionFileUrl || null,
        }))
        const { data: qRows, error: qErr } = await supabase
          .from('homework_questions').insert(rows).select()
        if (qErr) { console.error('과제 문항 저장 실패:', qErr); return null }
        nextQuestions.push(...qRows.map(toHomeworkQuestion))
      }
    }

    const droppedIds = dropped.map((d) => d.id)
    const touchedIds = nextDays.map((d) => d.id)
    const updated = toHomeworkSet(setRow)
    setHomeworkSets((prev) => prev.map((s) => (s.id === setId ? updated : s)))
    setHomeworkDays((prev) => [...prev.filter((d) => d.setId !== setId), ...nextDays])
    setHomeworkQuestions((prev) => [
      ...prev.filter((q) => !droppedIds.includes(q.dayId) && !touchedIds.includes(q.dayId)),
      ...nextQuestions,
    ])
    setHomeworkSubmissions((prev) => prev.filter((s) => !droppedIds.includes(s.dayId)))
    return updated
  }

  // 세트 삭제 (FK on delete cascade로 요일/문항/제출 자동 삭제)
  async function deleteHomeworkSet(setId) {
    const { data: deleted, error } = await supabase
      .from('homework_sets').delete().eq('id', setId).select()
    if (error) { console.error('과제 세트 삭제 실패:', error); return }
    if (!deleted?.length) { console.error('과제 세트 삭제 실패: 0 rows (RLS 확인)'); return }
    const dayIds = homeworkDays.filter((d) => d.setId === setId).map((d) => d.id)
    setHomeworkSets((prev) => prev.filter((s) => s.id !== setId))
    setHomeworkDays((prev) => prev.filter((d) => d.setId !== setId))
    setHomeworkQuestions((prev) => prev.filter((q) => !dayIds.includes(q.dayId)))
    setHomeworkSubmissions((prev) => prev.filter((s) => !dayIds.includes(s.dayId)))
  }

  // 요일별 제출 (학생 × 요일) upsert
  // 과제 제출은 1회만 — 한 번 낸 답안은 학생이 고칠 수 없다.
  // 화면에서도 수정 경로를 막지만, 중복 클릭·다른 기기·새로고침으로 다시 들어오는 경우가 있어
  // 여기서도 덮어쓰기를 막는다(insert 사용 → 중복이면 DB가 거부).
  async function upsertHomeworkSubmission({ dayId, studentId, answers }) {
    const already = homeworkSubmissions.find((s) => s.dayId === dayId && s.studentId === studentId)
    if (already) return already

    const { data, error } = await supabase
      .from('homework_submissions_v2')
      .insert({ day_id: dayId, student_id: studentId, answers, submitted_at: new Date().toISOString() })
      .select().single()
    // 다른 기기에서 이미 제출한 경우(unique 위반) — 먼저 낸 답안이 정답이므로 그것을 돌려준다
    if (error?.code === '23505') {
      const { data: existing } = await supabase
        .from('homework_submissions_v2')
        .select('*').eq('day_id', dayId).eq('student_id', studentId).single()
      return existing ? toHomeworkSubmission(existing) : null
    }
    // 실패 시 null을 돌려줘서 화면이 "제출됨"으로 잘못 넘어가지 않게 한다
    if (error) { console.error('과제 제출 실패:', error); return null }
    const record = toHomeworkSubmission(data)
    setHomeworkSubmissions((prev) => {
      const exists = prev.some((s) => s.dayId === dayId && s.studentId === studentId)
      return exists
        ? prev.map((s) => (s.dayId === dayId && s.studentId === studentId ? record : s))
        : [...prev, record]
    })
    return record
  }

  // 해설 파일 업로드 → 공개 URL 반환
  async function uploadSolutionFile(file, prefix = 'sol') {
    const safe = file.name.replace(/[^\w.\-가-힣]/g, '_')
    const path = `${prefix}/${Date.now()}_${safe}`
    const { error } = await supabase.storage.from('homework-solutions').upload(path, file)
    if (error) { console.error('해설 파일 업로드 실패:', error); return null }
    const { data } = supabase.storage.from('homework-solutions').getPublicUrl(path)
    return data.publicUrl
  }

  // 공개 URL에서 스토리지 경로만 뽑아낸다 (.../object/public/homework-solutions/<경로>)
  function solutionPathFromUrl(url) {
    const m = String(url || '').match(/\/homework-solutions\/(.+)$/)
    return m ? decodeURIComponent(m[1].split('?')[0]) : null
  }

  // 해설 파일 삭제 — 세트 저장이 끝난 뒤에 호출해서 안 쓰는 파일만 정리한다
  async function deleteSolutionFile(url) {
    const path = solutionPathFromUrl(url)
    if (!path) return false
    const { error } = await supabase.storage.from('homework-solutions').remove([path])
    if (error) { console.error('해설 파일 삭제 실패:', error); return false }
    return true
  }

  // 주간 리포트 코멘트 저장 — 학생·주 조합 하나당 한 줄
  async function upsertWeeklyNote({ studentId, weekStart, content }) {
    const { data, error } = await supabase
      .from('weekly_report_notes')
      .upsert(
        { student_id: studentId, week_start: weekStart, content, updated_at: new Date().toISOString() },
        { onConflict: 'student_id,week_start' }
      )
      .select().single()
    // 실패 시 null을 돌려줘서 화면이 "저장됨"으로 잘못 넘어가지 않게 한다
    if (error) { console.error('주간 코멘트 저장 실패:', error); return null }

    const record = toWeeklyNote(data)
    setWeeklyNotes((prev) => {
      const exists = prev.some((n) => n.studentId === studentId && n.weekStart === weekStart)
      return exists
        ? prev.map((n) => (n.studentId === studentId && n.weekStart === weekStart ? record : n))
        : [...prev, record]
    })
    return record
  }

  // ── 순서 변경 ──────────────────────────────────────────

  async function reorderStudents(orderedIds) {
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
    const { data: deleted, error } = await supabase.from('classes').delete().eq('id', id).select()
    if (error) { console.error('반 삭제 실패:', error); return }
    if (!deleted?.length) { console.error('반 삭제 실패: 0 rows deleted (RLS 정책 확인 필요)'); return }
    setClasses((prev) => prev.filter((c) => c.id !== id))
  }

  // 일괄 계정 생성 후 학생 계정 목록 다시 로드
  async function refreshStudentAccounts() {
    const { data, error } = await supabase.from('profiles').select('student_id, username').eq('role', 'student')
    if (!error && data) {
      const withId = data.filter((r) => r.student_id)
      setStudentAccountIds(withId.map((r) => r.student_id))
      setStudentUsernameById(Object.fromEntries(withId.map((r) => [r.student_id, r.username])))
    }
  }

  return (
    <DataContext.Provider value={{
      classes, students, attendance, grades, qnaList, notices, reports,
      staffProfiles, studentAccountIds, studentUsernameById, refreshStudentAccounts,
      videos, videoComments,
      tests, submissions,
      dataLoading,
      addStudent, updateStudent, deleteStudent, bulkAddStudents, bulkDeleteStudents,
      addClass,  updateClass,  deleteClass,
      reorderStudents, reorderClasses,
      upsertAttendance, deleteAttendance,
      addGrade, updateGrade, deleteGrade,
      addQuestion, answerQuestion,
      addNotice, deleteNotice,
      addReport, updateReportChecks, deleteReport,
      addVideo, deleteVideo, addVideoComment, replyVideoComment,
      addTest, updateTestStatus, deleteTest,
      addSubmission, updateSubmissionScores,
      homeworkSets, homeworkDays, homeworkQuestions, homeworkSubmissions,
      addHomeworkSet, updateHomeworkSet, deleteHomeworkSet, upsertHomeworkSubmission,
      uploadSolutionFile, deleteSolutionFile,
      weeklyNotes, upsertWeeklyNote,
    }}>
      {children}
    </DataContext.Provider>
  )
}

// 훅 co-export는 표준 관행 (Fast Refresh 힌트일 뿐 동작 오류 아님)
// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => useContext(DataContext)
