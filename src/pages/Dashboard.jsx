// src/pages/Dashboard.jsx
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const today = new Date().toISOString().slice(0, 10)

// ────────── 관리자/교사 대시보드 ──────────
function AdminTeacherDashboard({ user }) {
  const navigate = useNavigate()
  const { classes, students, attendance, qnaList, notices: dbNotices, tests, submissions } = useData()

  const myClasses = user.role === 'admin'
    ? classes
    : classes.filter((c) => c.teacherId === user.id)

  const myClassIds = myClasses.map((c) => c.id)

  // 미처리 항목 계산
  const ungradedCount = submissions.filter((s) => {
    const test = tests.find((t) => t.id === s.testId)
    return s.scores.length === 0 && myClassIds.includes(test?.classId)
  }).length

  const unansweredQna = qnaList.filter((q) => {
    const test = tests.find((t) => t.id === q.testId)
    return !q.answer && (user.role === 'admin' || myClassIds.includes(test?.classId))
  }).length

  // 요약 통계
  const totalStudents = students.filter((s) => myClassIds.includes(s.classId)).length

  // 최근 공지사항 2개
  const recentNotices = [...dbNotices]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2)

  // 최근 테스트 3개 + 평균 점수
  const recentTests = [...tests]
    .filter((t) => user.role === 'admin' || myClassIds.includes(t.classId))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3)

  function testAvg(test) {
    const graded = submissions.filter(
      (s) => s.testId === test.id && s.scores.length > 0
    )
    if (graded.length === 0) return null
    const total    = test.questions.reduce((sum, q) => sum + q.points, 0)
    const avgScore = graded.reduce(
      (sum, s) => sum + s.scores.reduce((ss, sc) => ss + sc.score, 0), 0
    ) / graded.length
    return { avg: Math.round(avgScore * 10) / 10, total }
  }

  return (
    <div className="flex flex-col gap-5">

      {/* 요약 통계 그리드 — 항상 표시 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-[#2B2B2B]">{totalStudents}</p>
          <p className="text-xs text-gray-400 mt-0.5">전체 학생</p>
        </div>
        <button
          onClick={() => navigate('/tests')}
          className={`rounded-xl p-4 shadow-sm text-center transition-colors ${
            ungradedCount > 0
              ? 'bg-[#C0392B]/10 hover:bg-[#C0392B]/15'
              : 'bg-white hover:bg-gray-50'
          }`}
        >
          <p className={`text-2xl font-bold ${ungradedCount > 0 ? 'text-[#C0392B]' : 'text-[#2B2B2B]'}`}>
            {ungradedCount}
          </p>
          <p className={`text-xs mt-0.5 ${ungradedCount > 0 ? 'text-[#C0392B]/70' : 'text-gray-400'}`}>
            미채점
          </p>
        </button>
        <button
          onClick={() => navigate('/qna')}
          className={`rounded-xl p-4 shadow-sm text-center transition-colors ${
            unansweredQna > 0
              ? 'bg-[#f39c12]/10 hover:bg-[#f39c12]/15'
              : 'bg-white hover:bg-gray-50'
          }`}
        >
          <p className={`text-2xl font-bold ${unansweredQna > 0 ? 'text-[#f39c12]' : 'text-[#2B2B2B]'}`}>
            {unansweredQna}
          </p>
          <p className={`text-xs mt-0.5 ${unansweredQna > 0 ? 'text-[#f39c12]/70' : 'text-gray-400'}`}>
            미답변 Q&A
          </p>
        </button>
      </div>

      {/* 오늘 출결 현황 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-2">
          오늘 출결 · <span className="text-[#2B2B2B]">{today}</span>
        </h2>
        {myClasses.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center text-gray-400 text-sm">
            담당 반이 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {myClasses.map((cls) => {
              const classStudents = students.filter((s) => s.classId === cls.id)
              const total         = classStudents.length
              const todayRecs     = attendance.filter(
                (a) => a.date === today && classStudents.some((s) => s.id === a.studentId)
              )
              const present = todayRecs.filter((a) => a.status === 'present').length
              const absent  = todayRecs.filter((a) => a.status === 'absent').length
              const late    = todayRecs.filter((a) => a.status === 'late').length

              return (
                <button
                  key={cls.id}
                  onClick={() => navigate('/attendance')}
                  className="bg-white rounded-xl p-4 shadow-sm text-left hover:shadow-md transition-shadow"
                >
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
                  {todayRecs.length === 0 && (
                    <p className="mt-2 text-xs text-gray-400 italic">오늘 출결 미기록</p>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* 최근 테스트 */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-semibold text-gray-500">최근 테스트</h2>
          <button
            onClick={() => navigate('/tests')}
            className="text-xs text-[#5B8FD4] hover:underline"
          >
            전체 보기
          </button>
        </div>
        {recentTests.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">테스트가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentTests.map((test) => {
              const cls    = classes.find((c) => c.id === test.classId)
              const avg    = testAvg(test)
              const badge  = { ready: '준비중', active: '진행중', closed: '종료' }

              return (
                <button
                  key={test.id}
                  onClick={() => navigate('/tests')}
                  className="bg-white rounded-xl p-3 shadow-sm text-left hover:shadow-md transition-shadow flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-gray-400">{cls?.name}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{test.date}</span>
                    </div>
                    <p className="text-sm font-medium text-[#2B2B2B]">{test.title}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    {avg ? (
                      <>
                        <p className="text-sm font-bold text-[#5B8FD4]">{avg.avg}점</p>
                        <p className="text-xs text-gray-400">평균 / {avg.total}점</p>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">{badge[test.status]}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* 최근 공지사항 */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-semibold text-gray-500">최근 공지사항</h2>
          <button
            onClick={() => navigate('/notices')}
            className="text-xs text-[#5B8FD4] hover:underline"
          >
            전체 보기
          </button>
        </div>
        {recentNotices.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">공지사항이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentNotices.map((n) => (
              <button
                key={n.id}
                onClick={() => navigate('/notices')}
                className="bg-white rounded-xl p-3 shadow-sm text-left hover:shadow-md transition-shadow flex justify-between items-center"
              >
                <p className="text-sm font-medium text-[#2B2B2B] line-clamp-1 flex-1">{n.title}</p>
                <span className="text-xs text-gray-400 ml-3 shrink-0">{n.createdAt.slice(0, 10)}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ────────── 학생 대시보드 ──────────
function StudentDashboard({ user }) {
  const navigate  = useNavigate()
  const thisMonth = today.slice(0, 7)
  const { attendance, grades: dbGrades, qnaList, notices: dbNotices, tests, submissions } = useData()

  // 이번 달 출결 (Supabase 실제 데이터)
  const myRecords = attendance.filter(
    (a) => a.studentId === user.studentId && a.date.startsWith(thisMonth) && a.type === '수업'
  )
  const present = myRecords.filter((a) => a.status === 'present').length
  const absent  = myRecords.filter((a) => a.status === 'absent').length
  const late    = myRecords.filter((a) => a.status === 'late').length
  const total   = present + absent + late
  const rate    = total > 0 ? Math.round((present / total) * 100) : 0

  // 최근 테스트 결과 (채점 완료된 것만 — mock 데이터)
  const myTestResults = submissions
    .filter((s) => s.studentId === user.studentId && s.scores.length > 0)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, 3)
    .map((s) => {
      const test        = tests.find((t) => t.id === s.testId)
      const myScore     = s.scores.reduce((sum, sc) => sum + sc.score, 0)
      const totalPoints = test?.questions.reduce((sum, q) => sum + q.points, 0) ?? 0
      return { test, myScore, totalPoints, submittedAt: s.submittedAt }
    })

  // 최근 성적 (Supabase 실제 데이터)
  const myGrades = [...dbGrades]
    .filter((g) => g.studentId === user.studentId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3)

  // 답변받은 Q&A (Supabase 실제 데이터)
  const answeredQna = [...qnaList]
    .filter((q) => q.studentId === user.studentId && q.answer)
    .sort((a, b) => (b.answeredAt ?? '').localeCompare(a.answeredAt ?? ''))
    .slice(0, 2)

  // 최근 공지사항 (Supabase 실제 데이터)
  const recentNotices = [...dbNotices]
    .filter((n) => n.targetClassIds.includes(user.classId) || n.targetClassIds.length === 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2)

  return (
    <div className="flex flex-col gap-4">

      {/* 이번 달 출결 */}
      <button
        onClick={() => navigate('/attendance')}
        className="bg-white rounded-xl p-4 shadow-sm text-left hover:shadow-md transition-shadow"
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-[#2B2B2B]">이번 달 출결</h3>
          <span className="text-2xl font-bold text-[#5B8FD4]">{rate}%</span>
        </div>
        {total === 0 ? (
          <p className="text-sm text-gray-400 text-center py-1">이번 달 출결 기록이 없습니다.</p>
        ) : (
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
        )}
      </button>

      {/* 최근 테스트 결과 */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-semibold text-gray-500">최근 테스트 결과</h2>
          <button onClick={() => navigate('/tests')} className="text-xs text-[#5B8FD4] hover:underline">
            전체 보기
          </button>
        </div>
        {myTestResults.length === 0 ? (
          <div className="bg-white rounded-xl p-4 text-center text-sm text-gray-400">
            채점된 테스트 결과가 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {myTestResults.map(({ test, myScore, totalPoints, submittedAt }) => (
              <button
                key={test?.id}
                onClick={() => navigate('/tests')}
                className="bg-white rounded-xl p-3 shadow-sm text-left hover:shadow-md transition-shadow flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-medium text-[#2B2B2B]">{test?.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{submittedAt.slice(0, 10)}</p>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <p className="text-sm font-bold text-[#5B8FD4]">{myScore}점</p>
                  <p className="text-xs text-gray-400">/ {totalPoints}점</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 최근 내신 성적 */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-semibold text-gray-500">최근 성적</h2>
          <button onClick={() => navigate('/grades')} className="text-xs text-[#5B8FD4] hover:underline">
            전체 보기
          </button>
        </div>
        {myGrades.length === 0 ? (
          <div className="bg-white rounded-xl p-4 text-center text-sm text-gray-400">
            등록된 성적이 없습니다.
          </div>
        ) : (
          <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col gap-2">
            {myGrades.map((g) => (
              <div key={g.id} className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium text-[#2B2B2B]">{g.subject}</span>
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
      </section>

      {/* 답변받은 Q&A */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-semibold text-gray-500">Q&A 답변</h2>
          <button onClick={() => navigate('/qna')} className="text-xs text-[#5B8FD4] hover:underline">
            전체 보기
          </button>
        </div>
        {answeredQna.length === 0 ? (
          <div className="bg-white rounded-xl p-4 text-center text-sm text-gray-400">
            받은 Q&A 답변이 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {answeredQna.map((q) => {
              const test = tests.find((t) => t.id === q.testId)
              return (
                <button
                  key={q.id}
                  onClick={() => navigate('/qna')}
                  className="bg-[#5B8FD4]/10 border border-[#5B8FD4]/20 rounded-xl p-3 text-left hover:bg-[#5B8FD4]/15 transition-colors"
                >
                  <p className="text-xs text-[#5B8FD4] font-medium mb-1">
                    답변 완료 · {test?.title ?? 'Q&A'}
                  </p>
                  <p className="text-sm text-[#2B2B2B] line-clamp-1">{q.content}</p>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* 최근 공지사항 */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-semibold text-gray-500">공지사항</h2>
          <button onClick={() => navigate('/notices')} className="text-xs text-[#5B8FD4] hover:underline">
            전체 보기
          </button>
        </div>
        {recentNotices.length === 0 ? (
          <div className="bg-white rounded-xl p-4 text-center text-sm text-gray-400">
            공지사항이 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentNotices.map((n) => (
              <button
                key={n.id}
                onClick={() => navigate('/notices')}
                className="bg-white rounded-xl p-3 shadow-sm text-left hover:shadow-md transition-shadow flex justify-between items-center"
              >
                <p className="text-sm font-medium text-[#2B2B2B] line-clamp-1 flex-1">{n.title}</p>
                <span className="text-xs text-gray-400 ml-3 shrink-0">
                  {n.createdAt.slice(0, 10)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ────────── 메인 Dashboard ──────────
function Dashboard() {
  const { user } = useAuth()

  return (
    <Layout>
      <h1 className="text-xl font-bold text-[#2B2B2B] mb-5">
        {user?.role === 'student' ? `안녕하세요, ${user.name}님` : '대시보드'}
      </h1>
      {user?.role === 'student'
        ? <StudentDashboard user={user} />
        : <AdminTeacherDashboard user={user} />
      }
    </Layout>
  )
}

export default Dashboard
