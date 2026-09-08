// src/components/ui/Pagination.jsx
// 쪽 번호. 목록이 한 화면을 넘길 만큼 길어질 때만 쓴다.
//
// 한 쪽뿐이면 아무것도 그리지 않는다 — 고를 게 없는 번호를 띄우면
// 화면만 복잡해진다.
export default function Pagination({ page, total, onChange }) {
  if (total <= 1) return null

  const pages = Array.from({ length: total }, (_, i) => i + 1)

  return (
    <nav className="flex justify-center items-center gap-1 mt-4" aria-label="쪽 이동">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="px-2.5 py-1.5 text-sm text-ink-mute rounded hover:bg-surface-alt disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        이전
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={`min-w-8 px-2 py-1.5 text-sm rounded tabular-nums transition-colors ${
            p === page
              ? 'bg-ink text-white font-medium'
              : 'text-ink-mute hover:bg-surface-alt'
          }`}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === total}
        className="px-2.5 py-1.5 text-sm text-ink-mute rounded hover:bg-surface-alt disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        다음
      </button>
    </nav>
  )
}
