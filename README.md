# Claude API Manager

Claude Code의 `settings.json`에서 API 설정을 관리하는 **TUI 대시보드**. 여러 API 프로필을 저장하고 키보드로 빠르게 전환할 수 있습니다. Ink(React 기반) + Claude Code 스타일 UI.

## 설치

```bash
git clone https://github.com/uptodatelabs/claude-api-manager.git
cd claude-api-manager
npm install
npm link
```

## TUI 대시보드

```bash
cam                # 인자 없이 실행 → TUI 진입
cam select         # 동일
```

```
┌─ ✦ Claude API Manager │ active: ollama-glm5.2 │ view: detail ──────────────────┐
│                                                                              │
│ ┌─ ✦ Profiles (3/8) ─┐  ┌─ ✦ ollama-glm5.2  [ACTIVE] ─────────────────────┐  │
│ │  / 검색 또는 이름 입력 │  │ Anthropic API                                  │  │
│ │                     │  │                                                │  │
│ │  ○ minimax-m3       │  │ ─ Environment Variables ─                      │  │
│ │      Anthropic API  │  │   ANTHROPIC_API_KEY          = 8e50...xlI6     │  │
│ │  ○ modelark [proxy] │  │   ANTHROPIC_AUTH_TOKEN       = 8e50...xlI6     │  │
│ │      Anthropic API  │  │   ANTHROPIC_BASE_URL         = https://ollama… │  │
│ │  ● ollama-glm5.2    │  │   ANTHROPIC_MODEL            = glm-5.2:cloud   │  │
│ │      Anthropic API  │  │                                                │  │
│ │  ○ ollama-deepseek… │  │ model:        glm-5.2:cloud                    │  │
│ │      Anthropic API  │  │ 태그: [ollama] [cloud]                          │  │
│ │  …                  │  │ 마지막 적용: 2026-08-03 (5회)                   │  │
│ └─────────────────────┘  └────────────────────────────────────────────────┘  │
│                                                                              │
│ ↑↓ 이동  / 검색  ↵ 선택  a 적용  e 수정  d 삭제  n 추가  ? 도움  q 종료       │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 키보드 단축키

| 키 | 동작 |
|---|---|
| `↑` / `↓` | 프로필 선택 이동 |
| `/` | 검색 모드 (이름/태그/설명) |
| `Enter` / `a` | 선택한 프로필 apply (diff 미리보기) |
| `e` | 프로필 수정 |
| `d` | 프로필 삭제 (확인) |
| `n` | 새 프로필 추가 |
| `c` | 현재 settings.json → 프로필 |
| `i` | JSON 파일 import |
| `x` | JSON 파일 export |
| `q` / `Ctrl+C` | 종료 |

### Apply 흐름

`Enter`/`a`로 적용 시 diff 미리보기가 표시됩니다:

```
┌─ ⚡ Diff Preview ─────────────────────────────────────────┐
│                                                           │
│   ~ ANTHROPIC_MODEL                                       │
│     - glm-5.2:cloud                                       │
│     + ark-code-latest                                     │
│   + ANTHROPIC_DEFAULT_OPUS_MODEL                          │
│   - AWS_REGION                                            │
│                                                           │
│  [Enter] 적용   [Esc] 취소                                 │
└───────────────────────────────────────────────────────────┘
```

### 폼 (Wizard)

`n`(추가) 또는 `e`(수정) 시 3단계 wizard:

1. **공급자 선택** (Anthropic/Bedrock/Vertex/Foundry/AWS)
2. **키 및 엔드포인트** (API Key, Auth Token, Base URL, AWS Region)
3. **모델 및 메타** (Model, fallback, 설명, 태그)

수정 모드에서는 `-` 입력 시 기존값이 삭제됩니다.

## 레거시 CLI 명령어

TUI 없이 한 줄 명령어로도 사용 가능합니다:

```bash
# 프로필 관리
cam list                       # 목록 (cam ls)
cam list -t ollama             # 태그 필터
cam show work                  # 상세
cam add work                   # 추가 (대화형)
cam edit work                  # 수정
cam remove work                # 삭제 (cam rm)
cam apply work                 # 적용
cam current                    # 현재 활성
cam rename old new             # 이름 변경
cam copy work work2            # 복제
cam capture imported           # settings.json → 프로필

# 설정
cam path                       # settings.json 경로 확인
cam path -s "C:\custom\..."    # 경로 변경
cam config                     # 프로필 데이터 파일 경로

# 가져오기/내보내기
cam export backup.json
cam import backup.json
cam import -f backup.json      # 덮어쓰기
```

## 지원 공급자

| 공급자 | 환경변수 |
|--------|----------|
| Anthropic API (기본) | `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL` |
| Amazon Bedrock | `CLAUDE_CODE_USE_BEDROCK`, `AWS_REGION`, `AWS_ACCESS_KEY_ID` 등 |
| Google Cloud Agent Platform | `CLAUDE_CODE_USE_VERTEX`, `CLOUD_ML_REGION`, `ANTHROPIC_VERTEX_PROJECT_ID` |
| Microsoft Foundry | `CLAUDE_CODE_USE_FOUNDRY`, `ANTHROPIC_FOUNDRY_RESOURCE`, `ANTHROPIC_FOUNDRY_API_KEY` |
| Claude Platform on AWS | `ANTHROPIC_AWS_WORKSPACE_ID`, `ANTHROPIC_AWS_API_KEY`, `AWS_REGION` |

## 프로필 메타데이터

각 프로필은 다음을 가질 수 있습니다:
- `description` — 용도/메모
- `tags` — 쉼표 구분 태그 (검색/필터에 사용)
- `lastApplied`, `applyCount` — 사용 이력 (자동)

## 설정 파일 위치

- 프로필 데이터: `~/.claude-api-manager/apis.json`
- Claude Code 설정: `~/.claude/settings.json` (기본값, 변경 가능)

## 동작 방식

- `apply` 시 `settings.json`의 `env` 섹션만 교체. `model`/`fallbackModel`도 새 프로필 값으로 교체하고 없는 경우 제거.
- `apply` 직전 diff 미리보기: `+`(추가), `-`(삭제), `~`(변경).
- `settings.json` 저장 시 `.bak` 백업 생성.
- 프로필 수정 시 값 삭제: `-` 입력 후 Enter.
- 커스텀 환경변수 `KEY=VALUE` 추가 가능.

## 라이선스

MIT