// src/components/ui/Card.jsx
// 흰 배경 + 1px 테두리. 그림자를 쓰지 않는 것이 이 디자인의 규칙이다.

export default function Card({ className = '', children }) {
  return (
    <div className={`bg-surface border border-line rounded ${className}`}>
      {children}
    </div>
  )
}
