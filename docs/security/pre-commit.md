# FitMon 資安與 Pre-commit 防護手冊

本文件記錄 FitMon 專案的本地 Git Commit 機密防護機制，以及網頁端 Content Security Policy (CSP) 的設計規範。

---

## 1. Gitleaks Pre-commit Hook 啟用指南

為防止 API 金鑰、雲端憑證、私人簽署金鑰（如 `.jks`、`.keystore`、`AuthKey_*.p8`、`*.p12`、服務帳號 JSON）意外提交至 Git 倉庫，專案提供原生 POSIX pre-commit hook，不依賴任何 npm 套件（如 husky）。

### 1.1 啟用 Hooks 路徑

在複製或進入倉庫後，請在倉庫根目錄執行一次：

```bash
git config core.hooksPath .githooks
```

這會將 Git 的 hooks 目錄指向 `.githooks/`，使得每次執行 `git commit` 時自動觸發 `.githooks/pre-commit`。

### 1.2 安裝 Gitleaks

本地環境必須安裝 `gitleaks` 命令列工具：

- **macOS (Homebrew)**:
  ```bash
  brew install gitleaks
  ```
- **Linux (Binary 或 Release)**:
  ```bash
  # 下載官方 Release
  curl -sSfL https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_linux_x64.tar.gz | tar xz
  sudo mv gitleaks /usr/local/bin/
  ```
- **Windows**:
  ```powershell
  scoop install gitleaks
  # 或
  choco install gitleaks
  ```

### 1.3 運作行為與 Fail-Closed 防護

- **Fail-Closed 原則**：若本機未安裝 `gitleaks`，hook 將直接印出錯誤訊息並以非 0 狀態碼退出（阻擋 commit），避免防護真空。
- **版本向下相容**：
  - Gitleaks >= 8.19：自動使用 `gitleaks git --staged --pre-commit --redact --verbose`
  - Gitleaks < 8.19：自動退回使用 `gitleaks protect --staged --redact --verbose`
- **緊急略過機制**：若遇緊急情況需暫時略過檢查，可設定環境變數：
  ```bash
  SKIP_GITLEAKS=1 git commit -m "chore: emergency commit"
  ```
- **規則擴充與 Allowlist**：根目錄設有 `.gitleaks.toml`，繼承預設規則並將 `dist/`、`node_modules/`、`package-lock.json` 等檔案加入排除名單。

---

## 2. 靜態網頁 CSP (Content Security Policy) 注意事項

FitMon 前端部署於 GitHub Pages（靜態託管環境），透過 `<meta http-equiv="Content-Security-Policy">` 實施嚴格 CSP 標頭。

### 2.1 Meta 標籤無法生效之 CSP 指令限制

依據 W3C Content Security Policy 規範，以下指令**無法透過 `<meta>` 標籤生效**，若寫入 meta 會被瀏覽器忽略並在 Console 產生警告：

1. `frame-ancestors`：僅能在 HTTP Response Header 中生效（用於防止 Clickjacking，靜態託管無伺服器 header 控制權）。
2. `report-uri` / `report-to`：違規報告收集端點無法在 `<meta>` 標籤中定義。
3. `sandbox`：無法在 `<meta>` 標籤中設定。

### 2.2 開發環境 (Dev) vs 建置環境 (Build/Preview)

- Vite dev server 會注入 inline script 與 WebSocket 進行 HMR / React Fast Refresh。
- 為避免在嚴格 CSP（禁用 `'unsafe-inline'` script）下阻礙開發流程，CSP meta 標籤透過 Vite plugin 於 `vite build` 階段（`apply: 'build'`）自動注入至 `dist/index.html`。
- 本地開發時可維持快速 HMR 開發體驗；建置後（`dist/`）與 `vite preview`、GitHub Pages 部署環境則完整套用嚴格 CSP 防護。
