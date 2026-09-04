// src/pages/Dashboard.jsx
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import StudentHomeworkCard from '../components/homework/StudentHomeworkCard'
import PageTitle from '../components/ui/PageTitle'
import { visibleClasses, visibleStudents } from '../utils/classAccess'
import { pendingHomeworkCount } from '../utils/homeworkPending'
import { unansweredCount } from '../utils/qnaAccess'
import { formatDate } from '../utils/datetime'

const today = new Date().toISOString().slice(0, 10)

// ────────── 관리자/교사 대시보드 ──────────
function AdminTeacherDashboard({ user }) {
  const navigate = useNavigate()
  const {
    classes, students, attendance, qnaList, notices: dbNotices, tests, submissions,
    homeworkSets, homeworkDays, homeworkSubmissions,
  } = useData()

  // 관리자는 전체, 교사는 담당 반만 (규칙은 utils/classAccess에 모아뒀다)
  const myClasses  = visibleClasses(classes, user)
  const myClassIds = myClasses.map((c) => c.id)

  // 미처리 항목 계산
  // 마감이 지난 과제를 안 낸 학생 수 (담당 반 학생만, 이번 주 기준)
  const pendingHomework = pendingHomeworkCount({
    students: visibleStudents(students, classes, user),
    sets: homeworkSets, days: homeworkDays, submissions: homeworkSubmissions,
    today,
  })

  // 질문은 이제 테스트에 매이지 않는다 — 질문한 학생을 볼 수 있는지로 판단한다
  const unansweredQna = unansweredCount(qnaList, students, classes, user)

  // 요약 통계
  const totalStudents = visibleStudents(students, classes, user).length

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
        <div className="bg-surface border border-line rounded p-4 text-center">
          <p className="text-2xl font-bold text-ink">{totalStudents}</p>
          <p className="text-xs text-ink-faint mt-0.5">전체 학생</p>
        </div>
        <button
          onClick={() => navigate('/homework')}
          data-testid="pending-homework"
          className={`rounded p-4 text-center border transition-colors ${
            pendingHomework > 0
              ? 'bg-danger-soft border-line hover:opacity-90'
              : 'bg-surface border-line hover:bg-surface-alt'
          }`}
        >
          <p className={`text-2xl font-bold ${pendingHomework > 0 ? 'text-danger' : 'text-ink'}`}>
            {pendingHomework}
          </p>
          <p className={`text-xs mt-0.5 ${pendingHomework > 0 ? 'text-danger' : 'text-ink-faint'}`}>
            과제 미제출
          </p>
        </button>
        <button
          onClick={() => navigate('/qna')}
          className={`rounded p-4 text-center border transition-colors ${
            unansweredQna > 0
              ? 'bg-warn-soft border-line hover:opacity-90'
              : 'bg-surface border-line hover:bg-surface-alt'
          }`}
        >
          <p className={`text-2xl font-bold ${unansweredQna > 0 ? 'text-warn' : 'text-ink'}`}>
            {unansweredQna}
          </p>
          <p className={`text-xs mt-0.5 ${unansweredQna > 0 ? 'text-warn' : 'text-ink-faint'}`}>
            미답변 Q&A
          </p>
        </button>
      </div>

      {/* 오늘 출결 현황 */}
      <section>
        <h2 className="text-sm font-semibold text-ink-mute mb-2">
          오늘 출결 · <span className="text-ink">{today}</span>
        </h2>
        {myClasses.length === 0 ? (
          <div className="bg-surface border border-line rounded p-6 text-center text-ink-faint text-sm">
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
                  className="bg-surface border border-line rounded p-4 text-left hover:bg-surface-alt transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-ink">{cls.name}</h3>
                      <p className="text-xs text-ink-faint mt-0.5">학생 {total}명</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-navy">{present}</div>
                        <div className="text-xs text-ink-faint">출석</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-danger">{absent}</div>
                        <div className="text-xs text-ink-faint">결석</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-warn">{late}</div>
                        <div className="text-xs text-ink-faint">지각</div>
                      </div>
                    </div>
                  </div>
                  {todayRecs.length === 0 && (
                    <p className="mt-2 text-xs text-ink-faint italic">오늘 출결 미기록</p>
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
          <h2 className="text-sm font-semibold text-ink-mute">최근 테스트</h2>
          <button
            onClick={() => navigate('/tests')}
            className="text-xs text-navy hover:underline"
          >
            전체 보기
          </button>
        </div>
        {recentTests.length === 0 ? (
          <p className="text-sm text-ink-faint text-center py-4">테스트가 없습니다.</p>
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
                  className="bg-surface border border-line rounded p-3 text-left hover:bg-surface-alt transition-colors flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-ink-faint">{cls?.name}</span>
                      <span className="text-xs text-ink-faint">·</span>
                      <span className="text-xs text-ink-faint">{test.date}</span>
                    </div>
                    <p className="text-sm font-medium text-ink">{test.title}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    {avg ? (
                      <>
                        <p className="text-sm font-bold text-navy">{avg.avg}점</p>
                        <p className="text-xs text-ink-faint">평균 / {avg.total}점</p>
                      </>
                    ) : (
                      <span className="text-xs text-ink-faint">{badge[test.status]}</span>
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
          <h2 className="text-sm font-semibold text-ink-mute">최근 공지사항</h2>
          <button
            onClick={() => navigate('/notices')}
            className="text-xs text-navy hover:underline"
          >
            전체 보기
          </button>
        </div>
        {recentNotices.length === 0 ? (
          <p className="text-sm text-ink-faint text-center py-4">공지사항이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentNotices.map((n) => (
              <button
                key={n.id}
                onClick={() => navigate('/notices')}
                className="bg-surface border border-line rounded p-3 text-left hover:bg-surface-alt transition-colors flex justify-between items-center"
              >
                <p className="text-sm font-medium text-ink line-clamp-1 flex-1">{n.title}</p>
                <span className="text-xs text-ink-faint ml-3 shrink-0">{formatDate(n.createdAt)}</span>
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

      {/* 이번 주 과제 — 마감이 있어 가장 급한 항목이라 맨 위에 둔다 */}
      <StudentHomeworkCard studentId={user.studentId} />

      {/* 이번 달 출결 */}
      <button
        onClick={() => navigate('/attendance')}
        className="bg-surface border border-line rounded p-4 text-left hover:bg-surface-alt transition-colors"
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-ink">이번 달 출결</h3>
          <span className="text-2xl font-bold text-navy">{rate}%</span>
        </div>
        {total === 0 ? (
          <p className="text-sm text-ink-faint text-center py-1">이번 달 출결 기록이 없습니다.</p>
        ) : (
          <div className="flex justify-around">
            <div className="text-center">
              <div className="text-2xl font-bold text-navy">{present}</div>
              <div className="text-xs text-ink-faint">출석</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-danger">{absent}</div>
              <div className="text-xs text-ink-faint">결석</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warn">{late}</div>
              <div className="text-xs text-ink-faint">지각</div>
            </div>
          </div>
        )}
      </button>

      {/* 최근 테스트 결과 */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-semibold text-ink-mute">최근 테스트 결과</h2>
          <button onClick={() => navigate('/tests')} className="text-xs text-navy hover:underline">
            전체 보기
          </button>
        </div>
        {myTestResults.length === 0 ? (
          <div className="bg-surface border border-line rounded p-4 text-center text-sm text-ink-faint">
            채점된 테스트 결과가 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {myTestResults.map(({ test, myScore, totalPoints, submittedAt }) => (
              <button
                key={test?.id}
                onClick={() => navigate('/tests')}
                className="bg-surface border border-line rounded p-3 text-left hover:bg-surface-alt transition-colors flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{test?.title}</p>
                  <p className="text-xs text-ink-faint mt-0.5">{submittedAt.slice(0, 10)}</p>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <p className="text-sm font-bold text-navy">{myScore}점</p>
                  <p className="text-xs text-ink-faint">/ {totalPoints}점</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 최근 내신 성적 */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-semibold text-ink-mute">최근 성적</h2>
          <button onClick={() => navigate('/grades')} className="text-xs text-navy hover:underline">
            전체 보기
          </button>
        </div>
        {myGrades.length === 0 ? (
          <div className="bg-surface border border-line rounded p-4 text-center text-sm text-ink-faint">
            등록된 성적이 없습니다.
          </div>
        ) : (
          <div className="bg-surface border border-line rounded p-3 flex flex-col gap-2">
            {myGrades.map((g) => (
              <div key={g.id} className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium text-ink">{g.subject}</span>
                  <span className="text-xs text-ink-faint ml-2">{g.part}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-navy">{g.score}점</span>
                  <span className="text-xs text-ink-faint">{g.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 답변받은 Q&A */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-semibold text-ink-mute">Q&A 답변</h2>
          <button onClick={() => navigate('/qna')} className="text-xs text-navy hover:underline">
            전체 보기
          </button>
        </div>
        {answeredQna.length === 0 ? (
          <div className="bg-surface border border-line rounded p-4 text-center text-sm text-ink-faint">
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
                  className="bg-navy-soft border border-line rounded p-3 text-left hover:opacity-90 transition-opacity"
                >
                  <p className="text-xs text-navy font-medium mb-1">
                    답변 완료 · {test?.title ?? 'Q&A'}
                  </p>
                  <p className="text-sm text-ink line-clamp-1">{q.content}</p>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* 최근 공지사항 */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-semibold text-ink-mute">공지사항</h2>
          <button onClick={() => navigate('/notices')} className="text-xs text-navy hover:underline">
            전체 보기
          </button>
        </div>
        {recentNotices.length === 0 ? (
          <div className="bg-surface border border-line rounded p-4 text-center text-sm text-ink-faint">
            공지사항이 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentNotices.map((n) => (
              <button
                key={n.id}
                onClick={() => navigate('/notices')}
                className="bg-surface border border-line rounded p-3 text-left hover:bg-surface-alt transition-colors flex justify-between items-center"
              >
                <p className="text-sm font-medium text-ink line-clamp-1 flex-1">{n.title}</p>
                <span className="text-xs text-ink-faint ml-3 shrink-0">
                  {formatDate(n.createdAt)}
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
      <PageTitle title={user?.role === 'student' ? `안녕하세요, ${user.name}님` : '대시보드'} />
      {user?.role === 'student'
        ? <StudentDashboard user={user} />
        : <AdminTeacherDashboard user={user} />
      }
    </Layout>
  )
}

export default Dashboard
