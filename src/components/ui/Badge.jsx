// src/components/ui/Badge.jsx
// 상태 라벨. 알약(둥근) 대신 네모(2px)로 두어 관리 도구다운 인상을 준다.

const TONES = {
  navy:    'bg-navy-soft text-navy',
  danger:  'bg-danger-soft text-danger',
  warn:    'bg-warn-soft text-warn',
  neutral: 'bg-surface-alt text-ink-soft',
}

export default function Badge({ tone = 'neutral', className = '', children }) {
  // 좁은 화면에서 '답변 완료'가 '답변 / 완료'로 쪼개지던 것을 막는다
  return (
    <span
      data-tone={tone}
      className={`inline-block whitespace-nowrap px-2 py-[3px] rounded-sm text-xs font-bold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
