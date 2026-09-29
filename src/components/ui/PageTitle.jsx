// src/components/ui/PageTitle.jsx
// 페이지 제목. 본문·탭·버튼과 같은 고딕체(Pretendard)를 쓴다 —
// 표와 버튼이 빽빽한 관리 화면에서는 제목만 명조체면 그 부분만 붕 떠 보인다.
// 명조체는 로고에만 남긴다.

// shrink-0을 준다. 옆에 버튼이 있는 화면에서 제목이 줄어들면 폰에서
// "과 / 제"처럼 한 글자씩 쪼개진다. 줄어드는 대신 버튼이 아랫줄로 내려간다.
// 제목이 길어 한 줄을 넘길 때는 낱말 단위로 끊는다(break-keep).
export default function PageTitle({ title, lead }) {
  return (
    <div className="mb-6 shrink-0">
      <h1 className="text-3xl font-bold text-ink tracking-tight break-keep">{title}</h1>
      {lead && <p className="text-sm text-ink-soft mt-1.5">{lead}</p>}
    </div>
  )
}
