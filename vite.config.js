import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // AI 코딩 도구의 상태 파일은 몇 초마다 갱신된다.
      // 감시 대상에 두면 그때마다 페이지가 새로고침돼 개발이 불가능하다.
      ignored: ['**/.omc/**', '**/.claude/**'],
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      },
    },
    setupFiles: ['./src/test/setup.js'],
    globals: true,
  },
})
