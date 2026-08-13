// src/components/ui/MiniBar.jsx
// 표에서 숫자 옆에 붙는 각진 미니 막대.
// 숫자를 읽지 않고 훑어도 비율이 보이게 해서, 문제 학생을 빨리 찾게 한다.

const TONES = { navy: 'bg-navy', danger: 'bg-danger' }

export default function MiniBar({ value, max, tone = 'navy' }) {
  // 배정이 0이면 비율 자체가 성립하지 않는다
  if (!max) return null
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <span className="inline-block w-[52px] h-[5px] bg-line align-middle ml-2.5">
      <span
        data-testid="minibar-fill"
        data-tone={tone}
        className={`block h-full ${TONES[tone]}`}
        style={{ width: `${pct}%` }}
      />
    </span>
  )
}
