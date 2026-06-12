---
name: run-notes-app
description: Run, screenshot, and drive the notes-app (React 19 + Vite + json-server). Use when asked to start the app, take a screenshot, verify a UI change, or run a flow through the app.
allowed-tools: Bash, Read
---

notes-app은 Vite(5173) + json-server(3001) 구성의 웹 앱이다.
드라이버는 `.claude/skills/run-notes-app/driver.mjs` (playwright 사용)이며,
API는 curl로도 직접 조작 가능하다.

모든 경로는 프로젝트 루트(`ccwork/`) 기준이다.

## 사전 요구사항

```bash
npm install          # playwright 포함 (devDependencies에 등록됨)
```

playwright 브라우저가 없으면:
```bash
npx playwright install chromium
```

## 서버 실행

```bash
npm run dev &        # Vite(5173) + json-server(3001) 동시 실행
sleep 4
curl -s http://localhost:5173 | head -5    # Vite 응답 확인
curl -s http://localhost:3001/notes | head -5  # API 응답 확인
```

## 에이전트 경로 (드라이버)

### 스크린샷

```bash
node .claude/skills/run-notes-app/driver.mjs screenshot /tmp/notes-app.png
```

→ `/tmp/notes-app.png` 생성. `Read` 툴로 내용 확인 가능.

### API smoke 테스트 (서버 없이도 가능)

```bash
node .claude/skills/run-notes-app/driver.mjs smoke
```

출력 예:
```
GET /notes → 4 notes
POST /notes → id=N4WLjxoaeCc
PATCH /notes/N4WLjxoaeCc → content="patched"
DELETE /notes/N4WLjxoaeCc → 404=true
API smoke: OK
```

### UI flow (생성 → 저장 → 삭제)

```bash
node .claude/skills/run-notes-app/driver.mjs flow
```

스크린샷 5장 생성: `/tmp/notes-app-01-loaded.png` ~ `/tmp/notes-app-05-deleted.png`

### curl로 API 직접 조작

```bash
# 목록 조회
curl -s http://localhost:3001/notes

# 노트 생성
curl -s -X POST http://localhost:3001/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"테스트","content":"내용","createdAt":"2026-06-12T00:00:00.000Z","updatedAt":"2026-06-12T00:00:00.000Z"}'

# 노트 수정 (ID 교체)
curl -s -X PATCH http://localhost:3001/notes/ID \
  -H "Content-Type: application/json" \
  -d '{"content":"수정된 내용","updatedAt":"2026-06-12T01:00:00.000Z"}'

# 노트 삭제
curl -s -X DELETE http://localhost:3001/notes/ID
```

## 테스트 스위트

```bash
npm test
```

## 사람이 사용할 때

```bash
npm run dev   # 브라우저에서 http://localhost:5173 열기
```

## Gotchas

- `playwright` 패키지는 `devDependencies`에 있다. `npm install` 없이 `node driver.mjs`를 실행하면 `ERR_MODULE_NOT_FOUND` 오류가 난다.
- json-server 1.x(beta)는 `--watch` 플래그 없이도 `db.json` 변경을 감지한다. `--watch/-w can be omitted` 경고는 정상이다.
- `db.json`의 기존 레코드 id는 숫자 문자열(`"1"`)이고 신규 생성은 nanoid(`"dP_NPYuHV94"`) 형식이 섞여 있다. API 동작에는 영향 없음.
- 드라이버의 `flow` 커맨드는 삭제 시 첫 번째 `삭제` 버튼을 클릭한다. 여러 노트가 열린 상태라면 의도치 않은 노트가 삭제될 수 있다.

## Troubleshooting

| 증상 | 원인 / 해결 |
|---|---|
| `Cannot find package 'playwright'` | `npm install` 실행 |
| `Server not ready: http://localhost:5173` | `npm run dev &; sleep 4` 후 재시도 |
| `Server not ready: http://localhost:3001` | 포트 충돌 — `lsof -i :3001` 으로 프로세스 확인 후 종료 |
| 스크린샷이 빈 화면 | `waitUntil: 'networkidle'` 대기 시간 부족 — 드라이버에서 `waitForTimeout` 늘리기 |
