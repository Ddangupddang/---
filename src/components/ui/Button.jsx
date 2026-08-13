// src/components/ui/Button.jsx
// 모든 화면이 같은 버튼을 쓰게 하는 공통 부품.
// 색을 직접 쓰지 않고 variant로 고르게 해서, 나중에 색이 바뀌어도 여기만 고치면 된다.

const VARIANTS = {
  primary: 'bg-ink text-white hover:opacity-90',
  accent:  'bg-navy text-white hover:opacity-90',
  ghost:   'border border-line text-ink hover:bg-surface-alt',
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
