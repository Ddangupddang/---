// src/constants/qna.js
// Q&A 말머리. 질문을 어디에 달지 고르는 대신, 말머리 하나만 붙인다.
//
// 저장값은 영문 키다 — 나중에 표시 이름을 바꿔도 이미 쌓인 데이터가 어긋나지 않는다.
export const QNA_CATEGORY = {
  NAESIN:  'naesin',
  JEONGSI: 'jeongsi',
  TEST:    'test',
  ETC:     'etc',
}

export const QNA_CATEGORIES = [
  QNA_CATEGORY.NAESIN,
  QNA_CATEGORY.JEONGSI,
  QNA_CATEGORY.TEST,
  QNA_CATEGORY.ETC,
]

export const QNA_CATEGORY_LABELS = {
  [QNA_CATEGORY.NAESIN]:  '내신과제',
  [QNA_CATEGORY.JEONGSI]: '정시과제',
  [QNA_CATEGORY.TEST]:    '테스트',
  [QNA_CATEGORY.ETC]:     '기타',
}

// 말머리가 없는 옛 질문은 전부 테스트에 달려 있었다.
export const QNA_DEFAULT_CATEGORY = QNA_CATEGORY.TEST

export function qnaCategoryLabel(category) {
  return QNA_CATEGORY_LABELS[category] ?? QNA_CATEGORY_LABELS[QNA_DEFAULT_CATEGORY]
}
