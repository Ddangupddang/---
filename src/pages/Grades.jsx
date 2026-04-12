// src/pages/Grades.jsx
import { useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { students } from '../data/students'
import { classes } from '../data/classes'
import { grades as initialGrades } from '../data/grades'

// ────────── SVG 꺾은선 그래프 ──────────
// data: [{ label: 'MM-DD', value: 점수, max: 만점 }]
function LineChart({ data, color = '#5B8FD4', height = 140 }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center text-xs text-gray-400" style={{ height }}>
        데이터가 2개 이상 있어야 그래프를 표시할 수 있습니다.
      </div>
    )
  }

  const W   = 320
  const H   = height
  const PAD = { top: 24, right: 20, bottom: 28, left: 32 }

  // 0~100 % 로 정규화
  const pctValues = data.map((d) => Math.round((d.value / d.max) * 100))
  const minPct    = Math.max(0,   Math.min(...pctValues) - 15)
  const maxPct    = Math.min(100, Math.max(...pctValues) + 10)
  const range     = maxPct - minPct || 1

  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top  - PAD.bottom

  const xAt = (i)   => PAD.left + (i / (data.length - 1)) * chartW
  const yAt = (pct) => PAD.top  + chartH - ((pct - minPct) / range) * chartH

  const pts = data.map((d, i) => ({
    x:     xAt(i),
    y:     yAt(pctValues[i]),
    label: d.label,
    value: d.value,
    pct:   pctValues[i],
  }))

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${(PAD.top + chartH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(PAD.top + chartH).toFixed(1)} Z`

  // Y축 눈금 3개
  const yTicks = [minPct, Math.round((minPct + maxPct) / 2), maxPct]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      {/* Y축 눈금선 + 라벨 */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={PAD.left} y1={yAt(v).toFixed(1)}
            x2={W - PAD.right} y2={yAt(v).toFixed(1)}
            stroke="#f0f0ef" strokeWidth="1"
          />
          <text
            x={PAD.left - 4} y={yAt(v) + 4}
            textAnchor="end" fontSize="9" fill="#b0b0a8"
          >
            {v}
          </text>
        </g>
      ))}

      {/* 면적 채우기 */}
      <path d={areaPath} fill={color} fillOpacity="0.1" />

      {/* 꺾은선 */}
      <path
        d={linePath} fill="none"
        stroke={color} strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round"
      />

      {/* 점 + 점수 라벨 + 날짜 라벨 */}
      {pts.map((p, i) => (
        <g key={i}>
          {/* 날짜 X축 */}
          <text
            x={p.x} y={H - 4}
            textAnchor="middle" fontSize="8" fill="#b0b0a8"
          >
            {p.label}
          </text>

          {/* 점수 라벨 (위) */}
          <text
            x={p.x} y={p.y - 7}
            textAnchor="middle" fontSize="9" fill={color} fontWeight="600"
          >
            {p.value}
          </text>

          {/* 원 */}
          <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
          <circle cx={p.x} cy={p.y} r="2"   fill="white" />
        </g>
      ))}
    </svg>
  )
}

// ────────── Grades 페이지 ──────────
function Grades() {
  const { user } = useAuth()
  const [gradeList,     setGradeList]     = useState(initialGrades)
  const [activeType,    setActiveType]    = useState('weekly')
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id ?? null)
  const [showForm,      setShowForm]      = useState(false)
  const [form, setForm] = useState({
    studentId: '', subject: '', part: '', score: '', total: '100',
    date: new Date().toISOString().slice(0, 10),
  })

  const isStudent     = user?.role === 'student'
  const classStudents = students.filter((s) => s.classId === selectedClass)

  const typeTabs = [
    { key: 'weekly', label: '주간 테스트' },
    { key: 'exam',   label: '내신 시험' },
  ]

  function handleAdd(e) {
    e.preventDefault()
    const newId = Math.max(...gradeList.map((g) => g.id), 0) + 1
    setGradeList((prev) => [
      ...prev,
      {
        id: newId, type: activeType,
        ...form,
        studentId: Number(form.studentId),
        score:     Number(form.score),
        total:     Number(form.total),
      },
    ])
    setShowForm(false)
    setForm({ studentId: '', subject: '', part: '', score: '', total: '100', date: new Date().toISOString().slice(0, 10) })
  }

  // ────────── 학생 뷰 ──────────
  if (isStudent) {
    const myGrades = gradeList
      .filter((g) => g.studentId === user.studentId && g.type === activeType)
      .sort((a, b) => a.date.localeCompare(b.date)) // 시간순 정렬 (차트용)

    // 그래프용 데이터 — 날짜 중복 시 최신값 사용
    const chartData = myGrades.map((g) => ({
      label: g.date.slice(5), // MM-DD
      value: g.score,
      max:   g.total,
    }))

    // 강점/약점 파트 분석
    const partMap = {}
    myGrades.forEach((g) => {
      if (!g.part) return
      if (!partMap[g.part]) partMap[g.part] = { sum: 0, cnt: 0 }
      partMap[g.part].sum += (g.score / g.total) * 100
      partMap[g.part].cnt += 1
    })
    const partAvgs = Object.entries(partMap)
      .map(([part, v]) => ({ part, avg: Math.round(v.sum / v.cnt) }))
      .sort((a, b) => b.avg - a.avg)
    const strong = partAvgs.slice(0, 2)
    const weak   = partAvgs.slice(-2).reverse()

    return (
      <Layout>
        {/* 탭 */}
        <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm w-fit">
          {typeTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveType(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeType === tab.key ? 'bg-[#2B2B2B] text-white' : 'text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 성적 추이 그래프 */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">성적 추이</h2>
          {myGrades.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">성적 기록이 없습니다.</p>
          ) : (
            <LineChart data={chartData} color="#5B8FD4" />
          )}
        </div>

        {/* 강점/약점 파트 */}
        {partAvgs.length > 0 && (
          <div className="flex gap-3 mb-4">
            {strong.length > 0 && (
              <div className="flex-1 bg-green-50 border border-green-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-green-700 mb-2">💪 강점 파트</p>
                {strong.map((p) => (
                  <div key={p.part} className="flex justify-between items-center">
                    <span className="text-xs text-gray-700">{p.part}</span>
                    <span className="text-xs font-bold text-green-600">{p.avg}%</span>
                  </div>
                ))}
              </div>
            )}
            {weak.length > 0 && (
              <div className="flex-1 bg-red-50 border border-red-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-[#C0392B] mb-2">📚 보완 파트</p>
                {weak.map((p) => (
                  <div key={p.part} className="flex justify-between items-center">
                    <span className="text-xs text-gray-700">{p.part}</span>
                    <span className="text-xs font-bold text-[#C0392B]">{p.avg}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 성적 목록 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {myGrades.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">성적 기록이 없습니다.</div>
          ) : (
            [...myGrades].reverse().map((g) => ( // 최신순으로 역정렬해서 표시
              <div
                key={g.id}
                className="flex justify-between items-center px-4 py-3 border-b border-gray-50 last:border-0"
              >
                <div>
                  <span className="text-sm font-medium">{g.subject}</span>
                  <span className="text-xs text-gray-400 ml-2">{g.part}</span>
                  <div className="text-xs text-gray-400 mt-0.5">{g.date}</div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    (g.score / g.total) * 100 >= 80 ? 'text-[#5B8FD4]'
                    : (g.score / g.total) * 100 >= 60 ? 'text-[#f39c12]'
                    : 'text-[#C0392B]'
                  }`}>
                    {g.score}점
                  </div>
                  <div className="text-xs text-gray-400">/ {g.total}점</div>
                </div>
              </div>
            ))
          )}
        </div>
      </Layout>
    )
  }

  // ────────── 교사/관리자 뷰 ──────────
  const displayGrades  = gradeList.filter((g) => g.type === activeType)

  // 반 전체 날짜별 평균 추이 (그래프용)
  const classGrades = displayGrades.filter((g) =>
    classStudents.some((s) => s.id === g.studentId)
  )
  const dateMap = {}
  classGrades.forEach((g) => {
    if (!dateMap[g.date]) dateMap[g.date] = { sum: 0, cnt: 0, total: g.total }
    dateMap[g.date].sum += (g.score / g.total) * 100
    dateMap[g.date].cnt += 1
  })
  const avgChartData = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      label: date.slice(5),
      value: Math.round(v.sum / v.cnt),
      max:   100,
    }))

  function getStudentLatestGrade(studentId) {
    return displayGrades
      .filter((g) => g.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
  }

  return (
    <Layout>
      {/* 탭 */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm w-fit">
        {typeTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveType(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeType === tab.key ? 'bg-[#2B2B2B] text-white' : 'text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {/* 반 선택 + 성적 입력 버튼 */}
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  selectedClass === cls.id
                    ? 'bg-[#2B2B2B] text-white'
                    : 'bg-white text-gray-500 border border-gray-200'
                }`}
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

        {/* 반 평균 추이 그래프 */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            {classes.find((c) => c.id === selectedClass)?.name} 평균 추이
          </h2>
          {avgChartData.length < 2 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              데이터가 부족합니다. 성적을 더 입력하면 그래프가 표시됩니다.
            </p>
          ) : (
            <LineChart data={avgChartData} color="#2B2B2B" />
          )}
        </div>

        {/* 학생별 성적 테이블 */}
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
                const g = getStudentLatestGrade(student.id)
                const pct = g ? Math.round((g.score / g.total) * 100) : null
                return (
                  <tr key={student.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium">{student.name}</td>
                    <td className="px-4 py-3 text-gray-500">{g?.subject ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell text-xs">{g?.part ?? '—'}</td>
                    <td className="px-4 py-3">
                      {g ? (
                        <span className={`font-bold ${
                          pct >= 80 ? 'text-green-600'
                          : pct >= 60 ? 'text-[#f39c12]'
                          : 'text-[#C0392B]'
                        }`}>
                          {g.score}점
                        </span>
                      ) : (
                        <span className="text-gray-300">미입력</span>
                      )}
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
              <select
                required
                value={form.studentId}
                onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none"
              >
                <option value="">학생 선택</option>
                {classStudents.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input
                required placeholder="과목 (예: 독서)"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none"
              />
              <input
                placeholder="파트 (예: 현대문학)"
                value={form.part}
                onChange={(e) => setForm({ ...form, part: e.target.value })}
                className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none"
              />
              <div className="flex gap-2">
                <input
                  required type="number" placeholder="점수" min="0"
                  value={form.score}
                  onChange={(e) => setForm({ ...form, score: e.target.value })}
                  className="flex-1 h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none"
                />
                <input
                  required type="number" placeholder="만점"
                  value={form.total}
                  onChange={(e) => setForm({ ...form, total: e.target.value })}
                  className="w-20 h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none"
                />
              </div>
              <input
                type="date" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full h-11 px-3 bg-[#F4F3EE] rounded-lg text-sm focus:outline-none"
              />
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 h-11 border border-gray-200 rounded-lg text-sm text-gray-500"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 bg-[#2B2B2B] text-white rounded-lg text-sm font-semibold"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Grades
