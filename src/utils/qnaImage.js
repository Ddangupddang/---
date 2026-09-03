// src/utils/qnaImage.js
// Q&A 질문에 붙이는 사진을 다루는 곳.
//
// 학생은 모바일로 찍어 올린다. 요즘 폰 사진은 한 장에 3~5MB라 그대로 올리면
// 학생 데이터도 쓰고 등록도 느리다. 올리기 전에 캔버스로 다시 구워서 줄인다.

export const MAX_QNA_IMAGES = 3

// 원본 상한. 이보다 크면 리사이즈 전에 미리 막는다 —
// 브라우저가 통째로 메모리에 올리다 폰이 버벅이는 걸 피한다.
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024

// 다시 구울 때 쓰는 값. 긴 변 1600px면 화면에서 답안지 글씨가 읽힌다.
const RESIZE_MAX_SIDE = 1600
const RESIZE_QUALITY  = 0.8

// 긴 변을 한계에 맞춘 치수. 한계보다 작은 사진은 그대로 둔다.
export function fitWithin(width, height, maxSide) {
  const longest = Math.max(width, height)
  if (longest <= maxSide) return { width, height }
  const ratio = maxSide / longest
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) }
}

// 이 파일을 받아도 되는가. 문제가 있으면 학생에게 보여줄 한글 사유, 없으면 null.
export function validateQnaImage(file, currentCount = 0) {
  if (currentCount >= MAX_QNA_IMAGES) {
    return `사진은 최대 ${MAX_QNA_IMAGES}장까지 올릴 수 있습니다.`
  }
  if (!String(file?.type || '').startsWith('image/')) {
    return '사진만 올릴 수 있습니다.'
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return `사진 용량이 너무 큽니다. (최대 ${MAX_SOURCE_BYTES / 1024 / 1024}MB)`
  }
  return null
}

// 스토리지 안에서의 경로. 원본 파일명은 쓰지 않는다 —
// "홍길동_답안.jpg"처럼 파일명에 이름이 들어 있는 경우가 흔하다.
// 어차피 JPEG로 다시 구우므로 확장자도 jpg로 고정한다.
export function qnaImagePath(studentId, token) {
  return `${studentId}/${token}.jpg`
}

// 파일 이름이 겹치지 않게 하는 임의 문자열
export function qnaImageToken() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
}

// 캔버스로 다시 구워서 작게 만든다. 실패하면 원본을 그대로 돌려준다 —
// 사진을 줄이지 못했다고 질문 등록 자체를 막을 이유는 없다.
export async function resizeQnaImage(file) {
  try {
    const bitmap = await loadImage(file)
    const { width, height } = fitWithin(bitmap.width, bitmap.height, RESIZE_MAX_SIDE)

    const canvas = document.createElement('canvas')
    canvas.width  = width
    canvas.height = height
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', RESIZE_QUALITY)
    )
    return blob ?? file
  } catch (e) {
    console.error('사진 축소 실패 — 원본을 그대로 올립니다:', e)
    return file
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('사진을 읽지 못했습니다')) }
    img.src = url
  })
}
