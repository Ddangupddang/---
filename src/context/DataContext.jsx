// src/context/DataContext.jsx
// Supabase에서 데이터를 불러와 앱 전체에 제공하는 컨텍스트
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { QNA_DEFAULT_CATEGORY } from '../constants/qna'
import { resizeQnaImage, qnaImagePath, qnaImageToken } from '../utils/qnaImage'
import { subscriptionRow } from '../utils/pushSubscription'
import { rowsOrNull } from '../utils/dbRows'
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
    // 말머리가 빈 옛 질문은 전부 테스트에 달려 있었다
    category:   q.category ?? QNA_DEFAULT_CATEGORY,
    studentId:  q.student_id,
    content:    q.content,
    // 사진을 붙이기 전 질문에는 이 칸이 없다 — 빈 배열로 채워 화면이 분기하지 않게 한다
    imagePaths: q.image_paths ?? [],
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
  const [classes,       setClasses]       = useState([])
  const [students,      setStudents]      = useState([])
  const [attendance,    setAttendance]    = useState([])
  const [grades,        setGrades]        = useState([])
  const [qnaList,       setQnaList]       = useState([])
  const [notices,       setNotices]       = useState([])
  const [reports,       setReports]       = useState([])
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

      // rowsOrNull이 null을 주면 못 읽은 것이라 화면을 건드리지 않는다.
      // 0건이면 0건 그대로 반영한다 — 예전에는 여기서 화면을 안 건드려서
      // 처음 넣어둔 Mock 자료가 유령처럼 남아 있었다(지워지지도 않았다).
      const cRows = rowsOrNull(cRes); if (cRows) setClasses(cRows.map(toClass))
      const sRows = rowsOrNull(sRes); if (sRows) setStudents(sRows.map(toStudent))
      const aRows = rowsOrNull(aRes); if (aRows) setAttendance(aRows.map(toAttendance))
      const gRows = rowsOrNull(gRes); if (gRows) setGrades(gRows.map(toGrade))
      const qRows = rowsOrNull(qRes); if (qRows) setQnaList(qRows.map(toQna))
      const nRows = rowsOrNull(nRes); if (nRows) setNotices(nRows.map(toNotice))
      const rRows = rowsOrNull(rRes); if (rRows) setReports(rRows.map(toReport))
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
        category:    data.category,
        student_id:  data.studentId,
        content:     data.content,
        image_paths: data.imagePaths ?? [],
      }])
      .select()
      .single()

    // 실패 이유를 그대로 올려보낸다 — 화면에서 "왜 안 됐는지"를 보여줘야
    // 학생이 올라간 줄 알고 넘어가지 않는다.
    if (error) { console.error('질문 등록 실패:', error); return { error: error.message } }
    const newQ = toQna(inserted)
    setQnaList((prev) => [newQ, ...prev])
    return { question: newQ }
  }

  // 질문에 붙일 사진 하나를 올리고 스토리지 경로를 돌려준다.
  //
  // 공개 URL이 아니라 경로를 담는 이유: qna-images는 비공개 버킷이다.
  // 질문 자체가 본인·담당 교사에게만 보이는데 사진만 URL 아는 사람 아무나
  // 볼 수 있으면 앞문을 잠그고 뒷문을 열어 두는 꼴이 된다.
  async function uploadQnaImage(file, studentId) {
    const blob = await resizeQnaImage(file)
    const path = qnaImagePath(studentId, qnaImageToken())
    const { error } = await supabase.storage
      .from('qna-images')
      // 축소에 실패해 원본(PNG·HEIC 등)이 그대로 오는 경우가 있어 형식을 물어본다
      .upload(path, blob, { contentType: blob.type || 'image/jpeg' })

    if (error) { console.error('Q&A 사진 업로드 실패:', error); return null }
    return path
  }

  // 볼 때마다 1시간짜리 임시 주소를 만든다
  async function qnaImageUrl(path) {
    const { data, error } = await supabase.storage
      .from('qna-images')
      .createSignedUrl(path, 60 * 60)

    if (error) { console.error('Q&A 사진 주소 생성 실패:', error); return null }
    return data.signedUrl
  }

  async function answerQuestion(id, answer, answeredBy) {
    const now = new Date().toISOString()
    const { data: updated, error } = await supabase
      .from('qna')
      .update({ answer, answered_at: now, answered_by: answeredBy })
      .eq('id', id)
      .select()

    if (error) { console.error('답변 등록 실패:', error); return { error: error.message } }
    // 에러 없이 0건이면 RLS가 조용히 막은 것이다. 성공으로 치면 화면만 바뀌고
    // 새로고침하면 답변이 사라져 있다.
    if (!updated?.length) {
      console.error('답변 등록 실패: 0 rows updated (RLS 정책 확인 필요)')
      return { error: '답변을 저장할 권한이 없습니다.' }
    }

    setQnaList((prev) =>
      prev.map((q) => q.id === id ? { ...q, answer, answeredAt: now, answeredBy } : q)
    )
    return {}
  }

  // 답변만 지운다. 질문은 남고 다시 "답변 대기"가 된다.
  // 잘못 단 답변을 되돌리려고 질문을 통째로 지우면 학생이 쓴 질문까지 사라진다.
  async function deleteAnswer(id) {
    const { data: updated, error } = await supabase
      .from('qna')
      .update({ answer: null, answered_at: null, answered_by: null })
      .eq('id', id)
      .select()

    if (error) { console.error('답변 삭제 실패:', error); return { error: error.message } }
    if (!updated?.length) {
      console.error('답변 삭제 실패: 0 rows updated (RLS 정책 확인 필요)')
      return { error: '답변을 지울 권한이 없습니다.' }
    }

    setQnaList((prev) => prev.map((q) =>
      q.id === id ? { ...q, answer: null, answeredAt: null, answeredBy: null } : q
    ))
    return {}
  }

  // 질문과 거기 붙은 사진을 함께 지운다.
  //
  // 순서가 중요하다. 질문을 먼저 지운다 — 사진부터 지우면 그다음 질문 삭제가
  // 실패했을 때 이미지가 깨진 질문이 화면에 남는다.
  // 사진 삭제가 실패해도 되돌리지 않는다. 질문이 없어져 아무도 볼 수 없는
  // 파일이고, docs의 정리 쿼리로 나중에 치울 수 있다.
  async function deleteQuestion(id, imagePaths = []) {
    const { data: deleted, error } = await supabase.from('qna').delete().eq('id', id).select()

    if (error) { console.error('질문 삭제 실패:', error); return { error: error.message } }
    // 에러 없이 0건 지워지는 건 RLS가 조용히 막은 것이다.
    // 화면만 지워지고 새로고침하면 되살아나는 상황을 만들지 않는다.
    if (!deleted?.length) {
      console.error('질문 삭제 실패: 0 rows deleted (RLS 정책 확인 필요)')
      return { error: '삭제 권한이 없습니다. (docs/qna-delete.sql 실행 여부 확인)' }
    }

    if (imagePaths.length > 0) {
      const { error: imgError } = await supabase.storage.from('qna-images').remove(imagePaths)
      if (imgError) console.error('질문 사진 삭제 실패(질문은 삭제됨):', imgError)
    }

    setQnaList((prev) => prev.filter((q) => q.id !== id))
    return {}
  }

  // ── 알림 구독 ──────────────────────────────────────────

  // 이 기기에서 알림을 받겠다고 등록한다.
  // 껐다 켜면 같은 endpoint가 다시 오므로 upsert로 덮어쓴다.
  async function savePushSubscription(subscription, profileId) {
    let row
    try {
      row = subscriptionRow(subscription, profileId, navigator.userAgent)
    } catch (e) {
      console.error('알림 구독 정보가 올바르지 않습니다:', e)
      return false
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(row, { onConflict: 'endpoint' })

    if (error) { console.error('알림 구독 저장 실패:', error); return false }
    return true
  }

  // 이 기기에서 알림을 끈다
  async function deletePushSubscription(endpoint) {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)

    if (error) { console.error('알림 구독 해제 실패:', error); return false }
    return true
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

    // 실패 이유를 그대로 올려보낸다 — 화면에서 "왜 안 됐는지"를 보여줘야
    // 올라간 줄 알고 지나가지 않는다. 공지는 실제로 작성자 칸 타입이 어긋나
    // 한 건도 저장되지 않았는데, 조용히 실패해서 한참 뒤에야 알았다.
    if (error) { console.error('공지 등록 실패:', error); return { error: error.message } }
    const newN = toNotice(inserted)
    setNotices((prev) => [newN, ...prev])
    return { notice: newN }
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

    // 공지와 같은 이유로 사유를 올려보낸다
    if (error) { console.error('리포트 등록 실패:', error); return { error: error.message } }
    const newR = toReport(inserted)
    setReports((prev) => [newR, ...prev])
    return { report: newR }
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
        // 내신은 class_id로, 정시는 target(레벨)로 대상을 정한다
        target:     payload.target == null ? null : Number(payload.target),
        class_id:   payload.classId ?? null,
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
        target:     payload.target == null ? null : Number(payload.target),
        class_id:   payload.classId ?? null,
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

  // 제출 취소 — 학생이 잘못 낸 답안을 지워 다시 풀 수 있게 한다.
  // 학생은 제출 뒤 스스로 고칠 수 없으므로 이게 유일한 구제책이다.
  // 기록을 통째로 지우므로 되돌릴 수 없다 — 부르는 쪽에서 반드시 확인을 받는다.
  async function deleteHomeworkSubmission({ dayId, studentId }) {
    const { error } = await supabase
      .from('homework_submissions_v2')
      .delete().eq('day_id', dayId).eq('student_id', studentId)
    // 실패를 삼키면 화면만 "미제출"로 바뀌고 학생은 계속 못 내는 상태가 된다
    if (error) { console.error('과제 제출 취소 실패:', error); return false }
    setHomeworkSubmissions((prev) =>
      prev.filter((s) => !(s.dayId === dayId && s.studentId === studentId))
    )
    return true
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
      addQuestion, answerQuestion, deleteAnswer, deleteQuestion, uploadQnaImage, qnaImageUrl,
      savePushSubscription, deletePushSubscription,
      addNotice, deleteNotice,
      addReport, updateReportChecks, deleteReport,
      addVideo, deleteVideo, addVideoComment, replyVideoComment,
      addTest, updateTestStatus, deleteTest,
      addSubmission, updateSubmissionScores,
      homeworkSets, homeworkDays, homeworkQuestions, homeworkSubmissions,
      addHomeworkSet, updateHomeworkSet, deleteHomeworkSet, upsertHomeworkSubmission,
      deleteHomeworkSubmission,
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
