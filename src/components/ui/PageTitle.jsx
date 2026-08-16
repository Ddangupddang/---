// src/components/ui/PageTitle.jsx
// 페이지 제목. 본문·탭·버튼과 같은 고딕체(Pretendard)를 쓴다 —
// 표와 버튼이 빽빽한 관리 화면에서는 제목만 명조체면 그 부분만 붕 떠 보인다.
// 명조체는 로고에만 남긴다.

export default function PageTitle({ title, lead }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-ink tracking-tight">{title}</h1>
      {lead && <p className="text-sm text-ink-soft mt-1.5">{lead}</p>}
    </div>
  )
}
