import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // 대문자로 시작하는 변수/인자(컴포넌트·아이콘 등)는 미사용 검사에서 제외
      // (이 프로젝트는 eslint-plugin-react가 없어 <Icon/> 같은 JSX 사용을 인식 못 하므로 argsIgnorePattern 필요)
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // api/ 폴더는 Vercel 서버리스 함수(Node 환경) — process 등 Node 전역 허용
    files: ['api/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
