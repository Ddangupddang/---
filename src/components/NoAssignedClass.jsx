// src/components/NoAssignedClass.jsx
// 담당 반이 없는 교사에게 보여주는 안내.
// 배정 전에는 화면이 텅 비는데, 그것만으로는 고장인지 구분되지 않는다.
export default function NoAssignedClass() {
  return (
    <div className="text-center py-12">
      <p className="text-sm text-ink-mute">담당 반이 없습니다.</p>
      <p className="text-xs text-ink-faint mt-1">관리자에게 반 배정을 요청하세요.</p>
    </div>
  )
}
