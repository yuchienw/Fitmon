# FitMon LLM-Wiki 知識庫系統

本知識庫遵循 Andrej Karpathy 所倡導的「LLM-as-a-Maintainer」知識庫架構理念建立。

## 導覽地圖

- [即時狀態與任務看板 (PROJECT_STATE.md)](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/PROJECT_STATE.md)
- [人機長期協作與持續溝通 SOP (collaboration_sop.md)](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/ops/collaboration_sop.md)
- [Agent 協同作業與讀寫規範 (AGENT.md)](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/AGENT.md)
- [全域知識索引 (00_INDEX)](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/wiki/00_INDEX.md)
- [維護協議與作業規範 (wiki_protocol)](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/ops/wiki_protocol.md)
- [演進日誌與決策鏈 (changelog)](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/logs/changelog.md)
- [架構決策記錄 (ADR)](file:///Users/yuchien/Project/Github/fitmon/llm-wiki/adr/0001-web-first-demo-to-mobile-cross-platform-architecture.md)

## 目錄分佈

```text
llm-wiki/
├── raw/         # 原始商業規格書、輸入檔案（例如原始 PRD）
├── wiki/        # 結構化、可供 LLM 高速調度與人機共讀之主題知識庫
├── logs/        # 系統演進日誌，每一版決策脈絡均記錄於此
├── adr/         # 重大技術與系統架構決策（Architecture Decision Records）
└── ops/         # Wiki 維護指引與運作規範
```
