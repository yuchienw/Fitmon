# ADR-0001: Web-First 網頁 Demo 至 iOS / Android 雙平台 APP 技術選型架構

- **狀態**：已批准 (Approved)
- **決策者**：產品架構團隊 & LLM Wiki 智庫
- **日期**：2026-11-01

---

## 1. 背景與需求 (Context & Requirements)

根據 FitMon 產品規劃與商業驗證節奏：
1. **即時驗證需求**：在正式向 App Store / Google Play 提審前，需要迅速擁有一個**能在網頁端直接開啟、操作完整訓練流、確認數值平衡與像素動態的 Demo 版**，以利內部驗證、種子用戶封測與投資人展示。
2. **無縫轉換雙端 App**：網頁 Demo 確認成型後，必須能以**最低重構成本、最高程式碼復用率**，直接產出 iOS 與 Android 雙平台原生 App。
3. **特定技術相容性**：
   - 本機 Canvas 迷因壓圖與像素小人微動態渲染。
   - Local-First 本機存儲（組數記錄、離線操作無卡頓）。
   - 組間計時結束之設備震動反饋（Haptic Feedback）。
   - 未來 Apple / Google 原生應用程式內購 (IAP)。

---

## 2. 備選技術方案評估 (Evaluation of Options)

### 方案 A：React 18 + Vite + Tailwind CSS + Capacitor (推薦 ⭐⭐⭐⭐⭐)
- **原理**：採用現代 Web 標準打造 SPA 網頁 Demo；成型後透過 Capacitor 原生橋接容器，直接將 Web 專案打包進 Xcode (iOS) 與 Android Studio (Android)。
- **優勢**：
  - **100% 程式碼復用**：網頁端寫好的 UI、HTML5 Canvas 迷因繪製、CSS 像素動畫，打包至 App 時完全不需要改寫。
  - **開發速度最快**：Vite 毫秒級熱重載（HMR），網頁預覽零等待時間。
  - **原生能力完善**：Capacitor 提供官方外掛直接呼叫震動馬達 (`@capacitor/haptics`)、原生分享 (`@capacitor/share`)、本機 SQLite (`@capacitor-community/sqlite`) 以及官方內購 (`@capacitor/inapppurchase`)。
- **劣勢**：超重度 3D 場景效能不及原生 C++，但 FitMon 屬於 2D 像素與專業表單記錄，Webview 效能完全溢出綽綽有餘（60fps+）。

---

### 方案 B：React Native + Expo (Expo Web)
- **原理**：使用 React Native 原生元件（`<View>`, `<Text>`），透過 Expo Web 編譯至瀏覽器。
- **優勢**：在 iOS/Android 端具備原生 View 繪製效能。
- **劣勢**：
  - **Web 端相容摩擦力大**：許多 React Native 函式庫對 Web 支援殘缺，常發生「手機跑得動、網頁版報錯」的狀況。
  - **Canvas 迷因壓圖受限**：React Native 缺乏瀏覽器原生 DOM Canvas，需要仰賴 Skia 或自訂 Native Module，在 Web 端與 Native 端往往需要寫兩套適配碼。

---

### 方案 C：Flutter + Flutter Web
- **原理**：使用 Dart 語言與 Flutter Skia 引擎統一渲染。
- **優勢**：雙端與 Web 畫面像素級高度一致。
- **劣勢**：
  - **Web 打包產物沉重**：Flutter Web 初次載入需下載數 MB 的 CanvasKit WASM 檔案，載入延遲明顯，不利於網頁 Demo 的極速分享體驗。
  - **生態體系隔離**：現代前端社群強大的像素繪圖小工具、CSS 動畫與 Canvas 庫難以直接復用，開發速度相對較慢。

---

## 3. 決策結論 (Decision)

**決定採用「方案 A：React + Vite + Tailwind CSS + Capacitor」作為 FitMon 的核心技術基底。**

### 分階段落地執行策略：
1. **階段一（當前）：Web-First 互動 Demo (`apps/web-demo/`)**
   - 採用 React + Vite + Tailwind CSS。
   - 介面強制採用行動裝置視口容器（Mobile Frame Container），確保在電腦與手機瀏覽器上皆呈現真實手機比例。
   - 核心數值與公式獨立抽離至 `packages/engine/`，實現邏輯與表現層解耦。
   - 數據層使用 `IndexedDB` 實現本機持久化。

2. **階段二：原生 App 封裝 (`apps/mobile/`)**
   - 執行 `npx cap init` 與 `npx cap add ios` / `npx cap add android`。
   - 將本機儲存平滑橋接至 SQLite。
   - 引入原生外掛增強：倒數結束觸發裝置真實震動，迷因圖一鍵呼叫系統原生 Share Sheet。
