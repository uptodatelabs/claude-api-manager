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

### 대시보드 (화살표 키로 선택 + 인라인 검색)

```bash
cam
# 또는
cam select
```

대시보드 진입 후:
- 화살표/타이핑으로 프로필 필터링
- Enter로 선택
- 그 후 작업 메뉴: 적용 / 상세 / 수정 / 복제 / 삭제 / 뒤로

### 프로필 관리

```bash
# 프로필 목록 (태그 필터 가능)
cam list
cam list -t ollama

# 프로필 상세 보기
cam show work

# 새 프로필 추가 (대화형, 적용 여부 확인 후 적용)
cam add work

# 프로필 수정 (적용 여부 확인 후 적용)
cam edit work

# 프로필 이름 변경
cam rename old-name new-name

# 프로필 복제
cam copy work work2

# 프로필 삭제 (확인 프롬프트)
cam remove work

# settings.json 변경 없이 특정 프로필 적용 (diff 미리보기 후 확인)
cam apply work

# 현재 활성 프로필 확인
cam current
```

### 프로필 메타데이터

각 프로필은 다음을 가질 수 있습니다:
- **description**: 용도/메모 (선택)
- **tags**: 쉼표 구분 태그 (예: `work,proxy,ollama`) - 검색과 필터에 사용
- **lastApplied**: 마지막 적용 시각 (자동 기록)
- **applyCount**: 누적 적용 횟수 (자동 기록)

### 설정 동기화

```bash
# 현재 settings.json을 새 프로필로 저장
cam capture imported-settings

# 모든 프로필 내보내기
cam export backup.json

# 프로필 가져오기 (중복 건너뜀)
cam import backup.json

# 기존 프로필 덮어쓰며 가져오기
cam import -f backup.json
```

### 설정 파일

```bash
# 설정 파일 경로 확인
cam config

# settings.json 경로 확인/변경
cam path
cam path -s "C:\custom\path\settings.json"
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

- `apply` 명령어는 `settings.json`의 `env` 섹션만 교체합니다. `model`, `fallbackModel`도 새 프로필의 값으로 교체하고, 없는 경우 기존 값을 제거합니다.
- `apply` 직전 diff 미리보기로 추가(+)/삭제(-)/변경(~) 표시.
- `capture` 명령어는 현재 `settings.json`의 내용을 새 프로필로 저장합니다.
- `add`/`edit` 완료 후 settings.json 적용 여부를 선택할 수 있습니다.
- `remove` 시 확인 프롬프트가 표시됩니다.
- `settings.json` 저장 시 백업 파일(`settings.json.bak`)을 생성합니다.
- 프로필 수정 시 값 삭제: `-` 입력 후 Enter.
- 커스텀 환경변수(`KEY=VALUE`)를 추가할 수 있습니다.

## 라이선스

MIT
