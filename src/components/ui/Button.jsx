// src/components/ui/Button.jsx
// 모든 화면이 같은 버튼을 쓰게 하는 공통 부품.
// 색을 직접 쓰지 않고 variant로 고르게 해서, 나중에 색이 바뀌어도 여기만 고치면 된다.

const VARIANTS = {
  primary: 'bg-ink text-white hover:opacity-90',
  accent:  'bg-navy text-white hover:opacity-90',
  ghost:   'border border-line text-ink hover:bg-surface-alt',
  // 삭제 같은 되돌릴 수 없는 동작. 이게 없어서 각 화면이 삭제 버튼을 손으로 그렸고,
  // 바로 옆 ghost '취소'와 글자 크기·굵기가 달라 보였다.
  danger:  'bg-danger text-white hover:opacity-90',
}

export default function Button({
  variant = 'primary', type = 'button', disabled = false,
  onClick, className = '', children, ...rest
}) {
  return (
    <button
      type={type}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
      className={`px-6 py-3 rounded text-[15px] font-bold transition-opacity
        disabled:opacity-40 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
