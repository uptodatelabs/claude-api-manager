# Claude API Manager

[![npm version](https://img.shields.io/npm/v/claude-api-manager.svg)](https://www.npmjs.com/package/claude-api-manager) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![npm downloads](https://img.shields.io/npm/dm/claude-api-manager.svg)](https://www.npmjs.com/package/claude-api-manager)

> TUI dashboard for managing Claude Code API configurations. Save multiple API profiles and switch between them with keyboard shortcuts — Ink (React-based), Claude Code style UI.

> Claude Code의 API 설정을 관리하는 TUI 대시보드. 여러 API 프로필을 저장하고 키보드로 빠르게 전환할 수 있습니다. Ink(React 기반) + Claude Code 스타일 UI.

---

**[English](#english) | [한국어](#한국어)**

---

## English

### Overview

Claude API Manager is a TUI (terminal UI) dashboard that manages the API configuration in Claude Code's `settings.json`. Instead of manually editing `settings.json` each time, save multiple API profiles and switch between them instantly with a few keystrokes.

**Bilingual UI (English/Korean)** — English by default, toggle with the `l` key at any time.

### Key Features

- **TUI dashboard** — Sidebar with profile list + main detail panel, status bar, key-binding footer
- **Multi-profile switching** — Save unlimited API profiles; apply any one to `settings.json` instantly
- **Diff preview before apply** — See `+`(added), `-`(removed), `~`(changed) before writing
- **4-step form wizard** — Provider → keys/endpoint → model/meta → custom env vars; sequential field-by-field input
- **Custom env vars** — Add any `KEY=VALUE` pair (e.g. `API_TIMEOUT_MS=600000`) in the wizard
- **Delete confirmation** — `[y]` delete / `[n]` cancel dialog before removing a profile
- **Rename profiles** — Rename with the `r` key
- **Settings viewer** — View current Claude Code `settings.json` (`s` key), change its path (`p` key)
- **Inline search** — `/` filters profiles by name/tag/description
- **Auto-scroll sidebar** — Selected item always stays visible; indicator shows range + current position (e.g. `2-4/8 | pos 3`)
- **Sensitive value masking** — API keys shown as `sk-c...8738` format everywhere
- **5 providers** — Anthropic API, Amazon Bedrock, Google Cloud Agent Platform, Microsoft Foundry, Claude Platform on AWS
- **Profile metadata** — description, tags, last-applied time, apply count (auto-tracked)
- **Safety** — `.bak` backup before every `settings.json` write; corrupted data file auto-recovery
- **CLI compatibility** — All operations also available as one-line commands
- **OpenAI-compatible proxy** — Connect OpenAI-compatible APIs to Claude Code through a local proxy server

### Quick Start

**Install from npm (recommended):**

```bash
npm install -g claude-api-manager
cam          # Launch TUI (no arguments)
```

**Or from source:**

```bash
git clone https://github.com/uptodatelabs/claude-api-manager.git
cd claude-api-manager
npm install
npm link
```

### TUI Dashboard

```bash
cam                # Launch TUI (no arguments)
```

```
┌─ ✦ Claude API Manager │ active: ollama-glm5.2 │ view: detail │ EN ───────────┐
│                                                                              │
│ ┌─ ✦ Profiles (8) ───┐  ┌─ ✦ ollama-glm5.2  [ACTIVE] ─────────────────────┐  │
│ │  / Search or type… │  │ Anthropic API                                  │  │
│ │                     │  │                                                │  │
│ │  ○ minimax-m3       │  │ ─ Environment Variables ─                      │  │
│ │      Anthropic API  │  │   ANTHROPIC_API_KEY          = 8e50...xlI6     │  │
│ │  ● modelark [proxy] │  │   ANTHROPIC_AUTH_TOKEN       = 8e50...xlI6     │  │
│ │      Anthropic API  │  │   ANTHROPIC_BASE_URL         = https://ollama… │  │
│ │  ○ freemodel [free] │  │   ANTHROPIC_MODEL            = glm-5.2:cloud   │  │
│ │  …                  │  │                                                │  │
│ │  2-4/8 | pos 3 ▼    │  │ Tags: [ollama] [cloud]                         │  │
│ └─────────────────────┘  │ Last applied: 2026-08-03 (5 times)             │  │
│                          └────────────────────────────────────────────────┘  │
│                                                                              │
│ Tab Focus  ↑↓ Move  / Search  ↵ Select  a Apply  e Edit  r Rename  d Delete │
│ n Add  s Settings  l Lang  q Quit                                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move selection (auto-scroll keeps the selected item visible) |
| `Tab` | Toggle focus: sidebar ↔ main panel |
| `/` | Search mode (name/tag/description) |
| `Enter` / `a` | Apply selected profile (with diff preview) |
| `e` | Edit profile (wizard) |
| `r` | Rename profile |
| `d` | Delete profile (confirmation dialog) |
| `n` | Add new profile (wizard) |
| `p` | Start/stop proxy for selected profile |
| `s` | View Claude Code settings file (`e` to edit env vars) |
| `l` | Toggle language (English ↔ 한국어) |
| `q` / `Ctrl+C` | Quit |

#### Apply flow

`Enter`/`a` shows a diff preview before writing:

```
┌─ ⚡ Diff Preview ─────────────────────────────────────────┐
│                                                           │
│   ~ ANTHROPIC_MODEL                                       │
│     - glm-5.2:cloud                                       │
│     + ark-code-latest                                     │
│   + ANTHROPIC_DEFAULT_OPUS_MODEL                          │
│   - AWS_REGION                                            │
│                                                           │
│  [Enter] Apply   [Esc] Cancel                             │
└───────────────────────────────────────────────────────────┘
```

#### Form wizard (4 steps)

`n` (add) or `e` (edit) opens a wizard. Fields are entered one at a time:

1. **Provider** (Anthropic/Bedrock/Vertex/Foundry/AWS)
2. **Keys & Endpoint** (API Key, Auth Token, Base URL, AWS Region)
3. **Model & Meta** (Model, fallback, description, tags)
4. **Custom env vars** (repeat `KEY=VALUE`, empty input to finish)

In edit mode, enter `-` in a field to delete its value.

#### Other views

- **Delete confirm** — `d` shows a dialog: `[y]` delete, `[n]`/`Esc` cancel
- **Settings viewer** — `s` shows current settings (path, env, model). Sensitive keys masked as `sk-c...8738`. `p` to change the path
- **Settings editor** — from the settings viewer, press `e` to edit the `env` block: `↑`/`↓` to select a key, `Enter` to edit its value, `a` to add a new key, `d` to delete. Values are saved to `settings.json` immediately (a `.bak` backup is kept)

#### OpenAI-compatible proxy

Connect OpenAI-compatible APIs (Ollama, LiteLLM, Groq, etc.) to Claude Code through a local proxy server.

> **Note:** This proxy is exclusively for converting Anthropic format to OpenAI format. If your provider already supports the Anthropic API format natively, configure it directly in `settings.json` — no proxy needed.

**From TUI:**
1. Select a profile with `ANTHROPIC_BASE_URL` pointing to an OpenAI-compatible API
2. Press `p` to start the proxy
3. Status bar shows `* profile:port` and live token usage (`in X / out Y / req N`)
4. Press `D` to open/close the debug log window (scroll with `PgUp`/`PgDn`)
5. Press `p` again to stop (settings.json is automatically restored)

**From CLI:**

```bash
cam proxy <profile-name>              # Start proxy on default port 3456
cam proxy <profile-name> --port 5678  # Custom port
cam proxy <profile-name> --debug      # Print request/response logs to terminal
cam proxy <profile-name> --force      # Kill the process occupying the port and start
cam proxy <profile-name> --rate-limit auto # Adaptive: start unlimited, back off on 429s
```

If the port is already in use, the proxy shows a clear error (with the occupying process's PID) instead of silently moving to another port — this prevents background servers from accumulating. Use `--port` to pick another port or `--force` to terminate the occupying process.

**Rate limiting (3 modes):** set via `--rate-limit` or the profile env `CAM_RATE_LIMIT`.

| Value | Behavior |
|---|---|
| `0` or unset | **Unlimited** — no restriction at all |
| Number `N` | **Fixed limit** — sliding window delays requests beyond N/min (Claude Code never sees a 429) |
| `auto` | **Adaptive (AIMD)** — starts unlimited; on an upstream 429 the limit is halved (burst 429s count once per 5s cooldown, minimum 1/min); after 90s without a 429 it grows ~+10% every 20s to find the optimum (ceiling 240/min) |

All adaptive adjustments are logged as `RATE LIMIT AUTO:` lines in `~/.claude-api-manager/proxy-debug.log`.

**Dedicated classifier provider:** if the main provider cannot handle Claude Code's auto-mode safety classifier requests (sonnet/haiku/spark-family models — e.g. the upstream replies 400 to classifier packets and Edit gets blocked), you can route classifier requests only to a separate provider/model via profile env:

| env key | Description |
|---|---|
| `CAM_CLASSIFIER_BASE_URL` | Dedicated classifier API URL (defaults to the main provider) |
| `CAM_CLASSIFIER_API_KEY` | Dedicated classifier API key (defaults to the main key) |
| `CAM_CLASSIFIER_MODEL` | Dedicated classifier model (defaults to the main model) |

If any of the three is set, classifier-shaped requests (small sync packets) are routed accordingly. For example, you can keep the main URL/key and swap only the model (`CAM_CLASSIFIER_MODEL=some-other-model`). Routing is logged as `classifier -> <url> model=<model>` in `~/.claude-api-manager/proxy-debug.log`. Also configurable in the TUI profile editor (`e`) under the "Classifier provider" step. As `CAM_` keys they are never written to settings.json.

The proxy automatically:
1. **Backs up** your current `settings.json` (the active profile's env)
2. **Sets** `ANTHROPIC_BASE_URL=http://127.0.0.1:<port>` in `settings.json`
3. **Starts** the proxy server
4. **Restores** the original `settings.json` when stopped

If the proxy process is killed (crash, forced quit), the leftover backup is detected and `settings.json` is restored automatically on the next `cam` invocation.

Then in another terminal:

```bash
claude  # Claude Code will use the proxy automatically
```

The proxy converts:
- Anthropic Messages format → OpenAI Chat Completions format
- `x-api-key` → `Authorization: Bearer`
- Streaming SSE events (bidirectional)
- Tool calls/results (Anthropic ↔ OpenAI)

### CLI Commands

All features also work as one-line commands:

```bash
# Profile management
cam list                       # List profiles (alias: cam ls)
cam list -t ollama             # Filter by tag
cam show work                  # Show profile details
cam apply work                 # Apply profile to settings.json
cam current                    # Show active profile
cam rename old new             # Rename profile
cam copy work work2            # Duplicate profile
cam remove work                # Remove profile (alias: cam rm)
cam capture imported           # Save current settings.json as profile

# Settings
cam path                       # Show settings.json path
cam path -s "C:\custom\..."    # Change settings.json path
cam config                     # Show profile data file path

# Import / Export
cam export backup.json
cam import backup.json
cam import -f backup.json      # Overwrite existing profiles

# Proxy
cam proxy <profile-name>              # Start proxy (default port 3456)
cam proxy <profile-name> --port 5678  # Custom port
```

### Providers

| Provider | Environment variables |
|----------|----------------------|
| Anthropic API (default) | `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL` |
| Amazon Bedrock | `CLAUDE_CODE_USE_BEDROCK`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, etc. |
| Google Cloud Agent Platform | `CLAUDE_CODE_USE_VERTEX`, `CLOUD_ML_REGION`, `ANTHROPIC_VERTEX_PROJECT_ID` |
| Microsoft Foundry | `CLAUDE_CODE_USE_FOUNDRY`, `ANTHROPIC_FOUNDRY_RESOURCE`, `ANTHROPIC_FOUNDRY_API_KEY` |
| Claude Platform on AWS | `ANTHROPIC_AWS_WORKSPACE_ID`, `ANTHROPIC_AWS_API_KEY`, `AWS_REGION` |

### Profile Metadata

Each profile can carry:
- `description` — purpose / note
- `tags` — comma-separated tags (used for search/filter)
- `lastApplied`, `applyCount` — usage history (auto-tracked)

### Storage Locations

- Profile data: `~/.claude-api-manager/apis.json`
- Claude Code settings: `~/.claude/settings.json` (default; changeable from the TUI)

### Behavior Notes

- `apply` replaces only the `env` section of `settings.json`. `model`/`fallbackModel` are replaced too, and removed when the new profile doesn't define them.
- Diff preview before apply: `+` (added), `-` (removed), `~` (changed).
- A `.bak` backup is created before every `settings.json` write.
- Profile edit: enter `-` to delete a field's value.
- Custom env vars (`KEY=VALUE`) supported.
- The sidebar auto-scrolls to keep the selection visible; the bottom indicator shows the visible range and current position.

### License

MIT

---

## Support

If you find Claude API Manager useful, consider supporting the project:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/uptodatelabs) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-ClaudeAPI-ea4aaa?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/uptodatelabs)

---

## 한국어

### 개요

Claude API Manager는 Claude Code의 `settings.json`에 있는 API 설정을 관리하는 TUI(터미널 UI) 대시보드입니다. 매번 `settings.json`을 수동으로 편집하는 대신, 여러 API 프로필을 저장해 두고 몇 번의 키 입력으로 즉시 전환할 수 있습니다.

**영/한 이중언어 UI** — 기본은 영어, 언제든지 `l` 키로 전환.

### 핵심 기능

- **TUI 대시보드** — 프로필 목록 사이드바 + 메인 상세 패널, 상태바, 키 안내 푸터
- **다중 프로필 전환** — 무제한 API 프로필 저장, 원하는 프로필을 `settings.json`에 즉시 적용
- **적용 전 diff 미리보기** — 쓰기 전에 `+`(추가), `-`(삭제), `~`(변경) 확인
- **4단계 폼 위저드** — 공급자 → 키/엔드포인트 → 모델/메타 → 커스텀 환경변수; 필드 하나씩 순차 입력
- **커스텀 환경변수** — 위저드에서 `KEY=VALUE` 형태로 자유롭게 추가 (예: `API_TIMEOUT_MS=600000`)
- **삭제 확인** — 프로필 삭제 전 `[y]` 삭제 / `[n]` 취소 다이얼로그
- **이름 변경** — `r` 키로 프로필 이름 변경
- **설정 파일 보기** — 현재 Claude Code `settings.json` 확인(`s` 키), 경로 변경(`p` 키)
- **인라인 검색** — `/`로 이름/태그/설명 필터링
- **사이드바 자동 스크롤** — 선택 항목이 항상 화면에 보이도록 유지; 하단 인디케이터에 범위 + 현재 위치 표시 (예: `2-4/8 | pos 3`)
- **민감 값 마스킹** — API 키는 모든 화면에서 `sk-c...8738` 형식으로 표시
- **5개 공급자** — Anthropic API, Amazon Bedrock, Google Cloud Agent Platform, Microsoft Foundry, Claude Platform on AWS
- **프로필 메타데이터** — 설명, 태그, 마지막 적용 시각, 적용 횟수(자동 기록)
- **안전장치** — `settings.json` 쓰기 전 `.bak` 백업; 데이터 파일 손상 시 자동 복구
- **CLI 호환** — 모든 작업을 한 줄 명령어로도 수행 가능
- **OpenAI 호환 프록시** — 로컬 프록시 서버를 통해 OpenAI 호환 API를 Claude Code에 연결

### 빠른 시작

**npm 설치 (권장):**

```bash
npm install -g claude-api-manager
cam          # 인자 없이 실행 → TUI 진입
```

**또는 소스에서:**

```bash
git clone https://github.com/uptodatelabs/claude-api-manager.git
cd claude-api-manager
npm install
npm link
```

### TUI 대시보드

```bash
cam                # 인자 없이 실행 → TUI 진입
```

```
┌─ ✦ Claude API Manager │ active: ollama-glm5.2 │ view: detail │ EN ───────────┐
│                                                                              │
│ ┌─ ✦ Profiles (8) ───┐  ┌─ ✦ ollama-glm5.2  [ACTIVE] ─────────────────────┐  │
│ │  / Search or type… │  │ Anthropic API                                  │  │
│ │                     │  │                                                │  │
│ │  ○ minimax-m3       │  │ ─ Environment Variables ─                      │  │
│ │      Anthropic API  │  │   ANTHROPIC_API_KEY          = 8e50...xlI6     │  │
│ │  ● modelark [proxy] │  │   ANTHROPIC_AUTH_TOKEN       = 8e50...xlI6     │  │
│ │      Anthropic API  │  │   ANTHROPIC_BASE_URL         = https://ollama… │  │
│ │  ○ freemodel [free] │  │   ANTHROPIC_MODEL            = glm-5.2:cloud   │  │
│ │  …                  │  │                                                │  │
│ │  2-4/8 | pos 3 ▼    │  │ Tags: [ollama] [cloud]                         │  │
│ └─────────────────────┘  │ Last applied: 2026-08-03 (5 times)             │  │
│                          └────────────────────────────────────────────────┘  │
│                                                                              │
│ Tab 포커스  ↑↓ 이동  / 검색  ↵ 선택  a 적용  e 수정  r 이름변경  d 삭제       │
│ n 추가  s 설정보기  l 언어  q 종료                                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 키보드 단축키

| 키 | 동작 |
|----|------|
| `↑` / `↓` | 선택 이동 (자동 스크롤로 선택 항목 항상 유지) |
| `Tab` | 포커스 전환: 사이드바 ↔ 메인 패널 |
| `/` | 검색 모드 (이름/태그/설명) |
| `Enter` / `a` | 선택 프로필 적용 (diff 미리보기) |
| `e` | 프로필 수정 (위저드) |
| `r` | 프로필 이름 변경 |
| `d` | 프로필 삭제 (확인 다이얼로그) |
| `n` | 새 프로필 추가 (위저드) |
| `p` | 선택 프로필 프록시 시작/중지 |
| `s` | Claude Code 설정 파일 보기 (`e` 키로 env 편집) |
| `l` | 언어 전환 (English ↔ 한국어) |
| `q` / `Ctrl+C` | 종료 |

#### Apply 흐름

`Enter`/`a`를 누르면 쓰기 전에 diff 미리보기가 표시됩니다:

```
┌─ ⚡ Diff Preview ─────────────────────────────────────────┐
│                                                           │
│   ~ ANTHROPIC_MODEL                                       │
│     - glm-5.2:cloud                                       │
│     + ark-code-latest                                     │
│   + ANTHROPIC_DEFAULT_OPUS_MODEL                          │
│   - AWS_REGION                                            │
│                                                           │
│  [Enter] 적용  [Esc] 취소                                  │
└───────────────────────────────────────────────────────────┘
```

#### 폼 위저드 (4단계)

`n`(추가) 또는 `e`(수정)로 위저드가 열립니다. 필드는 하나씩 순차 입력:

1. **공급자** (Anthropic/Bedrock/Vertex/Foundry/AWS)
2. **키 및 엔드포인트** (API Key, Auth Token, Base URL, AWS Region)
3. **모델 및 메타** (Model, fallback, 설명, 태그)
4. **커스텀 환경변수** (`KEY=VALUE` 반복 입력, 빈 값 입력 시 완료)

수정 모드에서는 필드에 `-`를 입력하면 해당 값을 삭제합니다.

#### 기타 화면

- **삭제 확인** — `d` 누르면 다이얼로그: `[y]` 삭제, `[n]`/`Esc` 취소
- **설정 파일 보기** — `s` 키로 현재 설정(경로, env, model) 표시. 민감 키는 `sk-c...8738` 형식으로 마스킹. `p` 키로 경로 변경
- **설정 편집** — 설정 보기에서 `e` 키로 env 블록 편집: `↑`/`↓`로 키 선택, `Enter`로 값 수정, `a`로 새 키 추가, `d`로 삭제. 값은 `settings.json`에 즉시 저장됨 (`.bak` 백업 유지)

#### OpenAI 호환 프록시

로컬 프록시 서버를 통해 OpenAI 호환 API(Ollama, LiteLLM, Groq 등)를 Claude Code에 연결합니다.

> **참고:** 이 프록시는 Anthropic 형식을 OpenAI 형식으로 변환하는 전용입니다. 공급자가 이미 Anthropic API 형식을 지원하면 `settings.json`에 직접 설정하세요 — 프록시가 필요 없습니다.

**TUI에서:**
1. `ANTHROPIC_BASE_URL`이 OpenAI 호환 API를 가리키는 프로필을 선택
2. `p` 키로 프록시 시작
3. 상태바에 `* profile:port`와 실시간 토큰 사용량(`in X / out Y / req N`) 표시
4. `D` 키로 디버그 로그 창 열기/닫기 (`PgUp`/`PgDn`으로 스크롤)
5. 다시 `p` 키로 프록시 중지 (settings.json 자동 복구)

**CLI에서:**

```bash
cam proxy <프로필-이름>              # 기본 포트 3456으로 프록시 시작
cam proxy <프로필-이름> --port 5678  # 커스텀 포트
cam proxy <프로필-이름> --debug      # 요청/응답 로그를 터미널에 출력
cam proxy <프로필-이름> --force      # 포트 점유 프로세스를 종료하고 시작
cam proxy <프로필-이름> --rate-limit auto # 적응형: 무제한 시작, 429 시 자동 감속
```

포트가 이미 사용 중이면 조용히 다른 포트로 이동하지 않고 점유 프로세스(PID 포함)를 안내하는 명확한 에러를 표시합니다 — 백그라운드 서버 누적을 방지합니다. `--port`로 다른 포트를 지정하거나 `--force`로 점유 프로세스를 종료하세요.

**레이트 리밋 (3가지 모드):** `--rate-limit` 또는 프로필 env의 `CAM_RATE_LIMIT`로 설정합니다.

| 값 | 동작 |
|---|---|
| `0` 또는 미설정 | **무제한** — 아무 제한 없음 |
| 숫자 `N` | **고정 한도** — 슬라이딩 윈도우로 분당 N회 초과 시 지연 (Claude Code에 429 없음) |
| `auto` | **적응형(AIMD)** — 무제한으로 시작, 공급자가 429를 반환하면 한도 절반 축소(동시 다발은 5초 쿨다운으로 1회만, 최소 1/분), 90초간 안정화되면 20초마다 약 +10%씩 증가해 최적값을 학습 (상한 240/분) |

적응형 모드의 모든 조절 과정은 `~/.claude-api-manager/proxy-debug.log`에 `RATE LIMIT AUTO:` 로그로 기록됩니다.

**분류기 전용 공급자:** Claude Code auto 모드의 안전 분류기(sonnet/haiku/spark 계열 모델 호출)를 메인 공급자가 처리하지 못하는 경우(예: 업스트림이 분류기 패킷에 400을 반환해 Edit이 차단될 때), 프로필 env로 분류기 요청만 별도 공급자/모델로 라우팅할 수 있습니다.

| env 키 | 설명 |
|---|---|
| `CAM_CLASSIFIER_BASE_URL` | 분류기 전용 API URL (미설정 시 메인 공급자 사용) |
| `CAM_CLASSIFIER_API_KEY` | 분류기 전용 API 키 (미설정 시 메인 키 사용) |
| `CAM_CLASSIFIER_MODEL` | 분류기 전용 모델 (미설정 시 메인 모델 사용) |

셋 중 하나라도 설정되면 분류기성 요청(작은 sync 패킷)은 해당 설정으로 라우팅됩니다. 예: URL/키는 메인 공급자 그대로 두고 모델만 교체(`CAM_CLASSIFIER_MODEL=다른-모델`)도 가능합니다. 라우팅 시 `~/.claude-api-manager/proxy-debug.log`에 `classifier -> <url> model=<model>` 로 기록됩니다. TUI 프로필 편집(`e`)의 "분류기 공급자" 단계에서도 설정할 수 있으며, `CAM_` 키이므로 settings.json에는 기록되지 않습니다.

프록시가 자동으로 수행하는 작업:
1. 현재 `settings.json` **백업** (활성 프로필 env 기준)
2. `ANTHROPIC_BASE_URL=http://127.0.0.1:<port>` **설정**
3. 프록시 서버 **시작**
4. 중지 시 원본 `settings.json` **복구**

프록시가 크래시/강제 종료로 죽으면 남은 백업을 감지해, 다음 `cam` 실행 시 `settings.json`을 자동으로 복원합니다.

다른 터미널에서:

```bash
claude  # Claude Code가 자동으로 프록시를 사용
```

프록시가 변환하는 내용:
- Anthropic Messages 형식 → OpenAI Chat Completions 형식
- `x-api-key` → `Authorization: Bearer`
- 양방향 SSE 스트리밍 이벤트
- 도구 호출/결과 (Anthropic ↔ OpenAI)

### CLI 명령

모든 기능은 한 줄 명령어로도 사용 가능합니다:

```bash
# 프로필 관리
cam list                       # 목록 (별칭: cam ls)
cam list -t ollama             # 태그 필터
cam show work                  # 프로필 상세
cam apply work                 # settings.json에 적용
cam current                    # 현재 활성 프로필
cam rename old new             # 이름 변경
cam copy work work2            # 복제
cam remove work                # 삭제 (별칭: cam rm)
cam capture imported           # 현재 settings.json을 프로필로 저장

# 설정
cam path                       # settings.json 경로 확인
cam path -s "C:\custom\..."    # settings.json 경로 변경
cam config                     # 프로필 데이터 파일 경로

# 가져오기 / 내보내기
cam export backup.json
cam import backup.json
cam import -f backup.json      # 기존 프로필 덮어쓰기

# 프록시
cam proxy <프로필-이름>              # 프록시 시작 (기본 포트 3456)
cam proxy <프로필-이름> --port 5678  # 커스텀 포트
```

### 지원 공급자

| 공급자 | 환경변수 |
|--------|----------|
| Anthropic API (기본) | `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL` |
| Amazon Bedrock | `CLAUDE_CODE_USE_BEDROCK`, `AWS_REGION`, `AWS_ACCESS_KEY_ID` 등 |
| Google Cloud Agent Platform | `CLAUDE_CODE_USE_VERTEX`, `CLOUD_ML_REGION`, `ANTHROPIC_VERTEX_PROJECT_ID` |
| Microsoft Foundry | `CLAUDE_CODE_USE_FOUNDRY`, `ANTHROPIC_FOUNDRY_RESOURCE`, `ANTHROPIC_FOUNDRY_API_KEY` |
| Claude Platform on AWS | `ANTHROPIC_AWS_WORKSPACE_ID`, `ANTHROPIC_AWS_API_KEY`, `AWS_REGION` |

### 프로필 메타데이터

각 프로필은 다음을 가질 수 있습니다:
- `description` — 용도/메모
- `tags` — 쉼표 구분 태그 (검색/필터에 사용)
- `lastApplied`, `applyCount` — 사용 이력 (자동 기록)

### 저장 위치

- 프로필 데이터: `~/.claude-api-manager/apis.json`
- Claude Code 설정: `~/.claude/settings.json` (기본값, TUI에서 변경 가능)

### 동작 방식

- `apply`는 `settings.json`의 `env` 섹션만 교체합니다. `model`/`fallbackModel`도 새 프로필 값으로 교체하고, 새 프로필에 없으면 제거합니다.
- 적용 전 diff 미리보기: `+`(추가), `-`(삭제), `~`(변경).
- `settings.json` 쓰기 전마다 `.bak` 백업 생성.
- 프로필 수정 시 값 삭제: 필드에 `-` 입력 후 Enter.
- 커스텀 환경변수 `KEY=VALUE` 추가 가능.
- 사이드바는 선택 항목이 화면에서 벗어나지 않도록 자동 스크롤되며, 하단 인디케이터에 보이는 범위와 현재 위치를 표시합니다.

### 라이선스

MIT

---

## 후원

Claude API Manager가 유용하다면 프로젝트 후원을 고려해 주세요:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/uptodatelabs) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-ClaudeAPI-ea4aaa?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/uptodatelabs)
