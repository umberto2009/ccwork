# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 목적

React 19 + TypeScript + Vite 기반 노트 앱 실습 프로젝트 (TDD 강의용 코드베이스).
`json-server`(`db.json`)를 백엔드로 사용하며, 프론트엔드와 동시에 실행된다.

## 개발 명령어

```bash
npm run dev        # Vite(5173) + json-server(3001) 동시 실행
npm run build      # tsc + vite build
npm run lint       # ESLint --fix
npm run format     # Prettier --write
npm test           # vitest run (단회)
npm run test:watch # vitest (감시 모드)
```

단일 테스트 파일 실행: `npx vitest run src/components/NoteList.test.tsx`

## 아키텍처

```
src/
├── api/notes.ts              # fetch 래퍼 (CRUD) — json-server REST API 호출
├── types/note.ts             # Note 인터페이스
├── context/NotesContext.tsx  # 전역 상태 + CRUD 액션
└── components/               # UI 컴포넌트
```

**데이터 흐름**: `App` → `NotesProvider` → `useNotes()` hook → 컴포넌트.
`NotesContext`가 낙관적 업데이트 없이 API 응답으로 로컬 상태를 동기화한다.

## 사용 라이브러리

| 라이브러리 | 용도 |
|-----------|------|
| **React 19** | UI 렌더링. `useTransition` 등 React 19 동시성 기능은 현재 미사용 |
| **TypeScript 5** | 정적 타입 — strict 모드 활성화 |
| **Vite 6** | 번들러 + 개발 서버 |
| **Tailwind CSS v4** | 유틸리티 CSS. `tailwind.config` 없이 `@tailwindcss/vite` 플러그인으로 구성 |
| **json-server 1.x (beta)** | 로컬 REST API 목 서버. `db.json`이 데이터 저장소. `GET/POST/PATCH/DELETE /notes` 지원 |
| **concurrently** | `npm run dev` 시 Vite와 json-server를 병렬 실행 |
| **Vitest 3** | 테스트 러너. `vite.config.ts` `test` 블록에서 설정 (`globals: true`, `environment: jsdom`) |
| **@testing-library/react** | 컴포넌트 렌더링 + DOM 쿼리 (`render`, `screen`, `userEvent`) |
| **@testing-library/jest-dom** | `toBeInTheDocument()` 등 DOM 매처 확장. `test-setup.ts`에서 전역 등록 |
| **ESLint 9 + typescript-eslint** | 린트. flat config(`eslint.config.js`) 방식 사용 |
| **Prettier 3** | 코드 포맷. `.prettierrc`로 설정 |

## 컴포넌트 구현 패턴

- named export (`export function ComponentName`) 사용, default export 없음
- props 타입은 컴포넌트 바로 위에 `interface ComponentNameProps`로 선언
- 조건부 렌더링은 early return으로 처리 (loading → error → empty → 정상 순서)
- `Layout`은 `sidebar`/`main`을 `ReactNode`로 받아 슬롯 패턴으로 조합

## 상태 관리 방식

- 전역 상태는 `NotesContext` 하나로 집중 (notes[], loading, error)
- 로컬 UI 상태(selectedNoteId, isCreating, saving 등)는 `App` 또는 해당 컴포넌트 내부 `useState`로 관리
- `NoteEditor`는 `useEffect`로 `selectedNoteId` 변경 시 폼을 외부 상태와 동기화

## API 호출 패턴

- `src/api/notes.ts`에 순수 함수로 모아둠 — `async/await` + `res.ok` 체크 후 throw
- Context 액션(`addNote`, `editNote`, `removeNote`)이 api 함수를 호출하고 로컬 상태를 직접 업데이트
- `NoteEditor`의 `handleSave`처럼 컴포넌트에서 직접 try/catch로 저장 중 상태(`saving`)를 처리

## 네이밍 패턴

| 구분 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 파일 | PascalCase.tsx | `NoteEditor.tsx` |
| Context 훅 | `use` + 도메인명 | `useNotes` |
| Context 액션 | `add/edit/remove` + 명사 | `addNote`, `editNote`, `removeNote` |
| API 함수 | `fetch/create/update/delete` + 명사 | `fetchNotes`, `createNote` |
| 이벤트 핸들러 | `handle` + 동사 | `handleSave`, `handleSelectNote` |
| 콜백 props | `on` + 동사 | `onSelect`, `onDelete`, `onDone` |

## ⚠️ 일관성이 없는 패턴

1. **삭제 액션 이름 불일치**: Context는 `removeNote`인데, API 함수는 `deleteNote`. 도메인 동사가 계층마다 다름.
2. **인라인 스타일 혼용**: `Layout.tsx`에서 `style={{ fontFamily: 'Boogaloo, sans-serif' }}`와 `style={{ height: 'calc(...)' }}`를 Tailwind와 혼용. `index.css`의 `@theme`에 `--font-display` CSS 변수가 이미 정의되어 있는데 사용하지 않고 하드코딩.
3. **에러 처리 방식 혼용**: Context 액션은 에러를 throw해서 올리고, `NoteEditor`는 `alert()`로 직접 처리. `NoteList`는 Context의 `error` 상태를 읽어 렌더링. 레이어마다 처리 방식이 다름.
4. **`App.tsx`만 default export 사용**: 모든 컴포넌트는 named export(`export function`)인데 `App`만 `export default App`. `main.tsx`에서 `import App from './App'`으로 가져옴.
5. **`db.json` id 형식 혼재**: 초기 샘플 데이터는 `"id": "1"` 형태의 숫자 문자열이고, 실제 생성된 노트는 `"id": "dP_NPYuHV94"` 형태의 nanoid. `Note` 타입은 `string`으로 선언되어 있어 타입 오류는 없지만 형식이 일관되지 않음.
6. **`useEffect` 의존성 배열 경고 억제**: `NoteEditor.tsx`에서 `selectedNote`를 deps에서 빼고 `// eslint-disable-line react-hooks/exhaustive-deps`로 경고를 무시. 나머지 코드에는 이런 억제가 없음.

## 주요 제약

- `Note` 타입에 `tags` 필드 없음 — 강의 진행 중 추가 예정
- API base URL `http://localhost:3001`이 `src/api/notes.ts`에 하드코딩됨
- Tailwind CSS v4 (`@tailwindcss/vite` 플러그인 방식, `tailwind.config` 파일 없음)
- 테스트 환경: Vitest + jsdom, `@testing-library/jest-dom` matcher는 `test-setup.ts`에서 전역 등록
