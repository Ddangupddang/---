import '@testing-library/jest-dom'

// Node v25에 내장된 localStorage가 불완전하여 jsdom의 localStorage를 덮어쓰는 문제 해결
// 테스트 환경에서 정상 동작하는 인메모리 localStorage 구현으로 교체
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (i) => Object.keys(store)[i] ?? null,
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})
