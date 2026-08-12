// src/constants/homework.js
// 과제(내신/정시) 관련 상수와 표시 라벨을 한 곳에서 관리한다.

// 과제 종류 코드
export const HW_CATEGORY = { NAESIN: 'naesin', JEONGSI: 'jeongsi' }
export const CATEGORY_LABELS = { naesin: '내신과제', jeongsi: '정시과제' }

// 학년: 1=중1 … 6=고3 (내신과제 그룹 기준)
export const GRADES = [1, 2, 3, 4, 5, 6]
export const GRADE_LABELS = { 1: '중1', 2: '중2', 3: '중3', 4: '고1', 5: '고2', 6: '고3' }

// 정시 레벨: 1/2/3 (정시과제 그룹 기준)
export const JEONGSI_LEVELS = [1, 2, 3]
export const JEONGSI_LEVEL_LABELS = { 1: '1레벨', 2: '2레벨', 3: '3레벨' }

// 요일: 1=월 … 6=토
export const WEEKDAYS = [1, 2, 3, 4, 5, 6]
export const WEEKDAY_LABELS = { 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토' }

// 과제 제출률이 이보다 낮으면 부진으로 본다.
// 월간 과제 리포트와 주간 리포트가 같은 기준을 써야 교사가 헷갈리지 않는다.
export const LOW_SUBMISSION = 70
