// src/components/ui/PageTitle.jsx
// 페이지 제목. 본명조(font-serif)를 쓰는 곳은 여기와 로고뿐이다.

export default function PageTitle({ title, lead }) {
  return (
    <div className="mb-6">
      <h1 className="font-serif text-3xl font-bold text-ink">{title}</h1>
      {lead && <p className="text-sm text-ink-soft mt-1.5">{lead}</p>}
    </div>
  )
}
