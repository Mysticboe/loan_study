# Loan Study Flow And API Refactor

## As-Is Sequence Diagrams

### 1) Login (`Login.vue::handleLogin`)
```mermaid
sequenceDiagram
  actor User
  participant LoginView as Login.vue
  participant Storage as sessionStorage
  participant Router as vue-router

  User->>LoginView: 输入账号/密码/验证码并提交
  LoginView->>LoginView: validateCaptcha + account check
  alt 校验通过
    LoginView->>Storage: set loan_study_logged_in = '1'
    LoginView->>Router: replace(redirect || /apply)
  else 校验失败
    LoginView->>LoginView: refreshCaptcha + failToast
  end
```

### 2) Route Guard (`router.beforeEach`)
```mermaid
sequenceDiagram
  actor User
  participant Router as router/index.js
  participant Storage as sessionStorage

  User->>Router: 访问受保护路由(/apply,/result,/progress)
  Router->>Storage: get loan_study_logged_in
  alt 已登录
    Router-->>User: 放行
  else 未登录
    Router-->>User: 跳转/login?redirect=target
  end
```

### 3) Apply Submit (`LoanApply.vue::submitApply`)
```mermaid
sequenceDiagram
  actor User
  participant ApplyView as LoanApply.vue
  participant MockDelay as setTimeout(2s)
  participant Router as vue-router

  User->>ApplyView: 上传身份证影像 + 点击提交
  ApplyView->>ApplyView: 校验影像和表单
  alt 通过
    ApplyView->>MockDelay: 模拟审批
    ApplyView->>Router: push /result?name&amount&approvalNo
  else 失败
    ApplyView-->>User: failToast
  end
```

### 4) Result Display (`LoanResult.vue`)
```mermaid
sequenceDiagram
  actor User
  participant ResultView as LoanResult.vue
  participant Router as vue-router
  participant Browser as Browser Download

  User->>ResultView: 进入结果页
  ResultView->>Router: 读取route.query(name/amount/approvalNo)
  User->>ResultView: 点击保存凭证
  ResultView->>Browser: Blob + a.download
  User->>ResultView: 点击查看详情
  ResultView->>Router: push /progress
```

### 5) Progress List (`LoanProgress.vue::onLoad`)
```mermaid
sequenceDiagram
  actor User
  participant ProgressView as LoanProgress.vue
  participant MockBuilder as buildMockRows

  User->>ProgressView: 上拉加载/下拉刷新
  ProgressView->>MockBuilder: buildMockRows(pageNo,pageSize)
  MockBuilder-->>ProgressView: list rows
  ProgressView->>ProgressView: 合并分页 + toggleExpand
```

## To-Be Implementation (Implemented In This Repo)

### API Layers
- `src/api/http.js`: request wrapper, timeout, ApiError, 401 centralized handling.
- `src/api/auth.js`: captcha + password login.
- `src/api/upload.js`: ID card image upload.
- `src/api/loan.js`: create application, detail, paginated list.
- `src/api/progress.js`: progress page query facade.
- `src/api/mockServer.js`: local mock API adapter for dev fallback when `VITE_API_BASE_URL` is not configured.

### Session And Guard
- `src/session/authSession.js`: `saveSession/getSession/clearSession/isSessionValid`.
- `src/router/index.js`: token-based route guard, protected route `/result/:applicationId`, unauthorized redirect with `redirect` recovery.

### Page Data Flow
- `Login.vue`
  - captcha from `GET /api/auth/captcha`.
  - login from `POST /api/auth/login`.
  - save token session and redirect.
- `LoanApply.vue`
  - upload images first (`POST /api/uploads/id-cards`).
  - create application (`POST /api/loan/applications`) with idempotency key.
  - navigate to `/result/:applicationId`.
- `LoanResult.vue`
  - fetch detail by `applicationId` (`GET /api/loan/applications/{id}`).
  - supports refresh-safe detail recovery and retry path.
- `LoanProgress.vue`
  - fetch paged list from API (`GET /api/loan/applications?pageNo&pageSize`).
  - keeps pull-refresh and infinite-scroll behavior.

### Error Handling
- 401: clear session + route to `/login` with redirect.
- timeout: unified `ApiError(408)` message.
- page-level errors: empty/failure states with retry actions.

### Acceptance Checklist
- no query-based transfer for result core data.
- no view-layer mock builder for progress list.
- all protected pages guarded by token session.

## Optional Backend Switch
- Set `VITE_API_BASE_URL` to real backend base URL to disable local mock adapter.
- Keep `VITE_USE_MOCK_API=false` to force real network mode.
