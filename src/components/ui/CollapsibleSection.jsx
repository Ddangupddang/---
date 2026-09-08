// src/components/ui/CollapsibleSection.jsx
// 접었다 펼치는 묶음. 과제 목록(주차별)이 쓴다.
//
// 화살표 기호를 쓰지 않는다. 이 사이트는 그림자 대신 테두리로, 장식 대신
// 색과 선으로 구분한다. 펼쳐진 묶음만 왼쪽에 로고 블루 선이 서고 제목이
// 진해진다 — 지금 어디를 보고 있는지가 그 하나로 드러난다.
//
// 제목은 안에 든 항목보다 조금 커야 한다. 같은 크기면 묶음인지 항목인지
// 구분이 안 된다.
//
// 닫힌 묶음의 글씨를 흐리게 하지 않는다. 회색으로 죽이면 못 쓰는 것처럼
// 보인다 — 접혀 있을 뿐 똑같이 유효한 자료다. 열림/닫힘은 왼쪽 선과
// 글씨 굵기로만 가른다.
//
// 접힌 상태에서도 개수를 보여준다. 몇 개가 들어 있는지 모르면
// 펼쳐보기 전에는 빠뜨린 게 있는지 알 수 없다.
import { useState } from 'react'

export default function CollapsibleSection({ title, meta, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`mb-2 border-l-2 ${open ? 'border-navy' : 'border-transparent'}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-baseline gap-3 px-4 py-3 text-left hover:bg-surface-alt transition-colors"
      >
        <span className={`text-base text-ink flex-1 ${open ? 'font-semibold' : 'font-medium'}`}>
          {title}
        </span>
        <span className="text-sm text-ink-mute shrink-0 tabular-nums">{meta}</span>
      </button>

      {open && <div className="pl-4 pr-1 pb-3">{children}</div>}
    </div>
  )
}
