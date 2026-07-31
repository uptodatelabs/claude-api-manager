# Claude API Manager

Claude Code의 `settings.json`에서 API 설정을 관리하는 CLI 도구. 여러 API 프로필을 저장하고 커서로 선택하여 전환할 수 있습니다.

## 설치

```bash
git clone https://github.com/uptodatelabs/claude-api-manager.git
cd claude-api-manager
npm install
npm link
```

## 사용법

### 대시보드 (화살표 키로 선택)

```bash
cam
# 또는
cam select
```

### 프로필 관리

```bash
# 프로필 목록 확인
cam list

# 새 프로필 추가 (대화형)
cam add work

# 프로필 수정
cam edit work

# 프로필 삭제
cam remove work

# 프로필 적용
cam apply work

# 현재 활성 프로필 확인
cam current
```

### 설정 파일

```bash
# 설정 파일 경로 확인
cam config

# settings.json 경로 확인/변경
cam path
cam path -s "C:\custom\path\settings.json"
```

### 가져오기/내보내기

```bash
# 모든 프로필 내보내기
cam export backup.json

# 프로필 가져오기 (중복 건너뜀)
cam import backup.json

# 기존 프로필 덮어쓰며 가져오기
cam import -f backup.json
```

## 지원 공급자

| 공급자 | 환경변수 |
|--------|----------|
| Anthropic API (기본) | `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL` |
| Amazon Bedrock | `CLAUDE_CODE_USE_BEDROCK`, `AWS_REGION`, `AWS_ACCESS_KEY_ID` 등 |
| Google Cloud Agent Platform | `CLAUDE_CODE_USE_VERTEX`, `CLOUD_ML_REGION`, `ANTHROPIC_VERTEX_PROJECT_ID` |
| Microsoft Foundry | `CLAUDE_CODE_USE_FOUNDRY`, `ANTHROPIC_FOUNDRY_RESOURCE`, `ANTHROPIC_FOUNDRY_API_KEY` |
| Claude Platform on AWS | `ANTHROPIC_AWS_WORKSPACE_ID`, `ANTHROPIC_AWS_API_KEY`, `AWS_REGION` |

## 설정 파일 위치

- 프로필 데이터: `~/.claude-api-manager/apis.json`
- Claude Code 설정: `~/.claude/settings.json` (기본값, 변경 가능)

## 동작 방식

`apply` 명령어는 `settings.json`의 `env` 섹션만 교체합니다. 기존 설정(hooks, permissions 등)은 보존됩니다.

## 라이선스

MIT
