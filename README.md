# Design Agent UI

Design Agentへのリクエストフォーム。GitHub Pagesでホスト。

## デプロイ

```bash
cd ~/outputs/design-agent-ui
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/YOUR_ORG/design-agent-ui.git
git push -u origin main

# GitHub → Settings → Pages → Source: main / root
```

## 機能

- プロダクトごとにFigmaファイル・ライブラリキーを登録（localStorage）
- 画面名・タイプ（A/B/C）・選択タブ・仕様書を入力
- Design Agent用プロンプトを自動生成 → コピー → Claude Codeに貼り付け
