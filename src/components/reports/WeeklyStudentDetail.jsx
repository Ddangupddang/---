// src/components/reports/WeeklyStudentDetail.jsx
// 주간 리포트 — 학생 한 명의 한 주 + 교사 코멘트.
import { useState } from 'react'
import { WEEKDAY_LABELS, WEEKDAYS } from '../../constants/homework'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Alert from '../ui/Alert'

const ATT_LABEL = { present: '출석', late: '지각', absent: '결석' }

// 과제 한 종류를 한 줄로. 배정이 없으면 "0% 제출"이 아니라 "배정 없음"이다.
function HomeworkLine({ label, hw }) {
  if (!hw) return <p className="text-sm text-ink-faint">{label} — 배정 없음</p>
  return (
    <p className="text-sm text-ink">
      {label} {hw.submitted}/{hw.total} 제출
      {hw.correctRate != null && <span className="text-ink-mute"> · 정답률 {hw.correctRate}%</span>}
    </p>
  )
}

export default function WeeklyStudentDetail({
  row, dates, attendanceRecords, note, onSaveNote, onBack,
}) {
  const [content, setContent] = useState(note?.content ?? '')
  const [saving, setSaving]   = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError]     = useState('')

  // 클리닉을 거르지 않으면 같은 날짜의 두 행이 겹쳐 뒤에 온 행이 이긴다 —
  // 수업 결석이 클리닉 출석에 덮여 '출석'으로 보일 수 있다
  const statusByDate = Object.fromEntries(
    attendanceRecords
      .filter((a) => a.studentId === row.student.id && a.type === '수업')
      .map((a) => [a.date, a.status])
  )

  async function handleSave() {
    if (saving) return
    setSaving(true)
    setError('')
    setMessage('')
    const saved = await onSaveNote(content)
    setSaving(false)
    // 실패했는데 입력을 지우면 교사가 쓴 내용이 날아간다
    if (!saved) {
      setError('저장에 실패했습니다. 입력한 내용은 그대로 두었으니 다시 시도해 주세요.')
      return
    }
    setMessage('저장했습니다.')
  }

  return (
    <div>
      <button onClick={onBack} className="text-sm text-ink-mute mb-3">← 목록</button>
      <h2 className="text-2xl font-bold text-ink mb-4">{row.student.name}</h2>

      {/* 출석 — 요일별로 펼쳐 보여준다. 숫자만으로는 언제 빠졌는지 알 수 없다 */}
      <Card className="p-4 mb-3">
        <p className="text-sm font-semibold text-ink-soft mb-2">
          출석 {row.attendance ? `${row.attendance.present + row.attendance.late}/${row.attendance.counted}` : '기록 없음'}
        </p>
        <div className="flex gap-2">
          {WEEKDAYS.map((wd, i) => (
            <div key={wd} className="flex-1 text-center">
              <p className="text-xs text-ink-faint mb-1">{WEEKDAY_LABELS[wd]}</p>
              <p data-testid={`att-${dates[i]}`}
                className={`text-xs ${statusByDate[dates[i]] === 'absent' ? 'text-danger' : 'text-ink'}`}>
                {ATT_LABEL[statusByDate[dates[i]]] ?? '-'}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* 주간테스트 */}
      <Card className="p-4 mb-3">
        <p className="text-sm font-semibold text-ink-soft mb-2">주간테스트</p>
        {row.tests.length === 0 && <p className="text-sm text-ink-faint">이번 주 시험이 없습니다.</p>}
        {row.tests.map((t) => (
          <p key={t.test.id} className="text-sm text-ink">
            {t.test.title}{' '}
            {t.state === 'graded'  && <span>{t.score}/{t.total}</span>}
            {t.state === 'grading' && <Badge tone="warn">채점중</Badge>}
            {t.state === 'absent'  && <Badge tone="danger">미응시</Badge>}
          </p>
        ))}
      </Card>

      {/* 주간과제 */}
      <Card className="p-4 mb-3">
        <p className="text-sm font-semibold text-ink-soft mb-2">주간과제</p>
        <HomeworkLine label="내신" hw={row.naesin} />
        <HomeworkLine label="정시" hw={row.jeongsi} />
      </Card>

      {/* 교사 코멘트 */}
      <Card className="p-4">
        <p className="text-sm font-semibold text-ink-soft mb-2">교사 코멘트</p>
        <textarea
          value={content} onChange={(e) => setContent(e.target.value)} rows={3}
          placeholder="상담이나 다음 주 지도에 참고할 내용을 적어 두세요."
          className="w-full border border-line rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
        />
        {error   && <Alert tone="danger" className="mt-2">{error}</Alert>}
        {message && <p className="text-sm text-navy mt-2">{message}</p>}
        <Button variant="primary" onClick={handleSave} disabled={saving} className="w-full mt-3">
          {saving ? '저장 중...' : '저장'}
        </Button>
      </Card>
    </div>
  )
}
