// src/components/ui/Alert.jsx
// 경고·안내 배너. 왼쪽 세로선으로 눈에 띄게 한다.

const TONES = {
  danger: 'bg-danger-soft border-danger text-danger',
  info:   'bg-navy-soft border-navy text-navy',
}

export default function Alert({ tone = 'danger', className = '', children }) {
  return (
    <div
      data-tone={tone}
      className={`px-4 py-3 rounded-sm border-l-[3px] text-sm font-semibold ${TONES[tone]} ${className}`}
    >
      {children}
    </div>
  )
}
