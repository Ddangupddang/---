// src/components/ui/Pagination.jsx
// 쪽 번호. 목록이 한 화면을 넘길 만큼 길어질 때만 쓴다.
//
// 한 쪽뿐이면 아무것도 그리지 않는다 — 고를 게 없는 번호를 띄우면
// 화면만 복잡해진다.
//
// 번호는 다섯 개만 그린다. 전부 그리면 폰에서 화면 밖으로 밀려 뒷번호만
// 보인다(Q&A가 15쪽이 되면서 겪었다). 대신 지금이 몇 쪽 중 몇 쪽인지
// 글로 적어, 창 밖의 쪽이 몇 개나 더 있는지 알 수 있게 한다.
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pageWindow } from '../../utils/pageWindow'

export default function Pagination({ page, total, onChange }) {
  if (total <= 1) return null

  const pages = pageWindow(page, total)

  return (
    <nav className="flex justify-center items-center gap-1 mt-4" aria-label="쪽 이동">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="이전 쪽"
        className="p-1.5 text-ink-mute rounded hover:bg-surface-alt disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronLeft size={16} aria-hidden="true" />
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
        aria-label="다음 쪽"
        className="p-1.5 text-ink-mute rounded hover:bg-surface-alt disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>

      <span className="ml-2 text-xs text-ink-faint tabular-nums whitespace-nowrap">
        {total}쪽 중 {page}쪽
      </span>
    </nav>
  )
}
