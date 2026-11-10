# 人機長期協作與持續溝通標準作業程序 (Human-AI Collaboration SOP)

> **目標**：解決 AI 跨對話「上下文失憶」、「進度斷層」與「討論發散」問題，使每一次互動皆具備明確的時間戳、版本、執行階段、待辦流轉與決策閉環。

---

## SOP-1：開局握手與狀態對齊 (Session Handshake Protocol)

### 觸發時機
每次開立新對話、重啟上下文，或使用者輸入「我們繼續」、「目前進度到哪」、「今天討論 X」時。

### AI 執行動作
1. 主動讀取 [`PROJECT_STATE.md`](../PROJECT_STATE.md)。
2. 回覆時**第一段一律輸出「狀態對齊摘要卡」**，格式如下：

```markdown
> 🎯 **【FitMon 狀態對齊卡】**
> - **時間 / 版本**：以 [`PROJECT_STATE.md`](../PROJECT_STATE.md) 的「最後更新時間」與「當前版本」填入
> - **當前階段**：以 [`PROJECT_STATE.md`](../PROJECT_STATE.md) 的「目前階段」填入
> - **進行中焦點**：以 [`PROJECT_STATE.md`](../PROJECT_STATE.md) 看板「進行中」填入
> - **待辦下一項**：以 [`PROJECT_STATE.md`](../PROJECT_STATE.md) 看板待辦填入
```

3. 讓使用者**一眼確認 AI 當前在同一個頻率上**，無須重覆交代專案背景。

---

## SOP-2：議題討論與決策收斂 (Issue Discussion & Convergence SOP)

當進行任何商業、數值、功能或架構討論時，遵循「**四階收斂法**」：

```mermaid
flowchart TD
    Step1["階段一：明確問題與約束 (Problem & Invariants)\n確認討論邊界，主動核對 5 大不可侵犯原則\n(零個資、本地優先、雙模式等)"]
    Step2["階段二：客觀批判性評估 (Critical Evaluation & Trade-offs)\n嚴禁一昧認同，亦不刻意反駁；必須主動揭露：\n1. 亮點與價值 (Pros)\n2. 潛在風險、缺點與摩擦成本 (Cons/Risks)\n3. 務實替代或緩解方案 (Actionable Mitigations)"]
    Step3["階段三：使用者定案確認 (Alignment)\n待使用者明確選擇或調整後才落地固化"]
    Step4["階段四：知識庫雙向落地 (Wiki & Log Sync)\n1. 更新 wiki/*.md 對應章節\n2. 若屬重大決策撰寫 adr/XXXX-title.md\n3. 追加 logs/changelog.md 因果鏈"]

    Step1 --> Step2 --> Step3 --> Step4
```

---

## SOP-3：待辦事項流轉與閉環 (Task Lifecycle SOP)

待辦事項統一由 [`PROJECT_STATE.md`](../PROJECT_STATE.md) 驅動。看板現行欄位為：`🔴 進行中`、`🟢 已完成／最近已完成`、`⏸️ 擱置／暫不考慮`。本 SOP 不再使用已不存在的 `🟡 待討論清單 (Backlog)` 欄位。

流轉規則如下：

1. **認領或新增任務**：將新工作直接列入 `🔴 進行中 (In Progress)`（或在該區以待辦勾選項新增），同一時間保持 1~2 項焦點，嚴禁多頭並進。
2. **產出交付**：完成討論、文件提煉、規範編寫或經核可的實作。
3. **完成驗收 (Done)**：
   - 移入 `🟢 已完成` 或 `🟢 最近已完成 (Recently Done)`。
   - 更新進度完成百分比（若該項影響里程碑）。
   - 執行 Git 提交，Commit 訊息必須指明 Task ID（例：`docs(plan): 完成 PLAN-001 補劑聯盟導購流程拆解`）。
4. **外部阻礙或暫不排期 (Parked)**：若因缺少資訊暫時無法拍板、或已決定暫不排期，移至 `⏸️ 擱置／暫不考慮`，並清楚標註原因或「等待事項（Waiting on...）」。

---

## SOP-4：對話結尾交接與存檔 (Session Wrap-up & Checkpoint SOP)

### 觸發時機
當一個主題討論告一段落，或使用者表示「今天先到這」、「幫我存檔並總結」時。

### AI 執行動作
1. **輸出本次總結**：
   - 本次拍板之核心結論（2~3 點）。
   - 產出/修改之文檔清單。
2. **維護狀態板**：更新 [`PROJECT_STATE.md`](../PROJECT_STATE.md) 之時間戳與 Kanban。
3. **執行 Git Commit**：將本次所有變更一併存檔固化。
4. **提供下次啟動入口**：給出 1~2 個建議的下次討論題目，讓下一次對話無縫開局。
