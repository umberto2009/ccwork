---
description: 새로운 Claude Code 스킬을 생성한다. 스킬 이름과 목적을 인수로 받아 .claude/skills/<name>/SKILL.md 파일을 만들어준다.
allowed-tools: Bash, Read, Write
---

사용자가 새 스킬을 만들고 싶어합니다.

인수: $ARGUMENTS

## 절차

1. `$ARGUMENTS`에서 스킬 이름(첫 번째 단어)과 목적(나머지)을 파악하세요.
   - 인수가 없으면 사용자에게 스킬 이름과 목적을 물어보세요.

2. 스킬 디렉토리를 결정하세요:
   - 프로젝트 전용 → `.claude/skills/<name>/`
   - 전역(모든 프로젝트) → `~/.claude/skills/<name>/`
   - 명시적 언급이 없으면 프로젝트 전용(`.claude/skills/`)으로 만드세요.

3. 아래 형식으로 `SKILL.md`를 작성하세요:

```yaml
---
description: <한 줄 설명 — Claude가 언제 이 스킬을 쓸지 판단하는 기준>
allowed-tools: <필요한 툴 목록, 불필요하면 생략>
---

<스킬의 역할과 단계별 지시사항>
```

4. `Bash`로 디렉토리를 만들고 `Write`로 파일을 생성하세요:
   ```bash
   mkdir -p .claude/skills/<name>
   ```

5. 생성 완료 후 사용자에게 다음을 알려주세요:
   - 파일 경로
   - 호출 방법 (`/<name>` 또는 `/<name> 인수`)
   - 필요하면 수정할 부분
