# Twomi Design Agent Rules v0.1

> **Design Agent 専用の行動規範** — Step 4（Claude が Figma Plugin JS を生成する段階）で必ず参照すること。
> 違反した出力は **MUST 違反** として再生成対象。

| 項目 | 内容 |
|------|------|
| バージョン | v0.1 (Phase 1) |
| 作成日 | 2026-05-28 |
| マスター言語 | 日本語 |
| 適用範囲 | Twomi UI 自動生成（Design Agent system） |
| 継承元 | [AI AGENT Code of Conduct v0.1](https://www.notion.so/36d9a37c48cc81ec866ce5c72ef2a13e) |

---

## 0. このRulesの位置づけ

本ドキュメントは、Twomi の Design Agent が UI 画面を生成する際に従う **業務層ルール** である。

- **上位層**: [AI AGENT Code of Conduct](https://www.notion.so/36d9a37c48cc81ec866ce5c72ef2a13e) — 全社 AI Agent 共通の倫理・運用原則（13条）
- **本層（Design Agent Rules）**: Figma UI 生成に特化したルール — 本ドキュメント
- **下位層**: Per-screen / per-component schemas — `schemas/twomi/*.schema.yaml`

衝突時の優先順位: **上位層 > 本層 > schemas**。

---

## 1. 絶対ルール（MUST 違反 = 再生成）

### 1.1 既存 component の編集禁止
- Library 内の component を編集・更新しない
- variant の追加・削除をしない
- component 名を変更しない
- Figma Library ファイル（`CPe64VQc7petbZawTE6J8o`）を直接書き換えない
- 編集が必要な場合は **人間に YES/NO で確認**（Code of Conduct §6）

### 1.2 Library Component を必使用
- UI 要素は **必ず Library Component を `importComponentSetByKeyAsync` で読み込んで `createInstance()` する**
- `figma.createEllipse()` / `figma.createRectangle()` で代替する**禁止**
- 例外: Library にないテキストノード・auto-layout コンテナ等の純粋な構造要素のみ自前作成可

### 1.3 画面寸法は固定
- **W402 × H874**（変更不可）
- SafeArea: Top 64 / Bottom 34 / Left·Right 16
- Header 高さ: 110px
- BottomNav 高さ: 102px
- 各画面の content area = scaffold で確保された contentFrame の中だけに描画する

### 1.4 AutoLayout 必須・直置き禁止
- アイコン・テキスト・component の **直置き禁止**
- 必ず AutoLayout コンテナに入れて余白を制御
- Gap は **8 の倍数**（4, 8, 12, 16, 24, 32...）
- 幅は固定しない（HUG または FILL）
- 高さは内包要素に依存させる（Header / BottomNav など明確な理由がある場合のみ固定）

### 1.5 line-height を Auto にしない
- 必ず数値指定（PIXELS または PERCENT）
- Noto Sans JP は Auto だと行間がズレるため厳禁

### 1.6 Z 軸の順序を守る
前面から順に:
1. ダイアログ
2. Bottom シート
3. Overlay（黒アルファ）
4. Header（固定 / スクロールで隠れる）
5. Bottom ナビ

逆順に積むと実装バグ（Bottom シートが Header に隠れる等）が発生する。

### 1.7 Text node の name は **絶対に内容にしない**（必ず役割名）

⚠️ **これは絶対ルール**。違反は MUST 違反 = 再生成対象。

text node（TEXT type のノード）の `name` プロパティを **実際の文字内容**（`characters`）と
同じにすることは絶対禁止。**必ず役割名**（〜Text / 〜Label / 〜Title など camelCase）で命名する。

**理由**:
- テキスト内容は spec 由来で動的に変わる。role 命名なら spec が変わっても node 名は変わらない
- 開発側はノード名で参照する（layer 名 = 変数名 / セレクタ）→ 内容で命名すると毎回壊れる
- 多言語対応で JP→EN に切り替えても node 名は変わらない
- テキストが空になっても name は意味を保つ

**NG → OK 一覧**:

| ❌ NG（内容ベース） | ✅ OK（役割ベース） |
|---|---|
| `"Hello world"` | `greetingText` |
| `"Yitian Wang"` / `"Hikari"` / `"サキ"` | `displayNameText` / `senderNameText` / `userNameText` |
| `"@yitian_wang"` | `userHandleText` |
| `"Marketing at AIA"` | `bioText` / `descriptionText` |
| `"1,200"` / `"12,450"` / `"980"` | `coinCountText` / `countText` |
| `"42"` / `"1.2K"` / `"287"` | `statValueText` |
| `"投稿"` / `"フォロワー"` / `"フォロー"` | `statLabelText`（または `posts` / `followers` / `following` を **variant** で持つ） |
| `"プロフィールを編集"` / `"シェア"` | `primaryActionText` / `secondaryActionText` |
| `"フォロー"` / `"フォロー中"` | `followButtonText`（状態は `followStatus` variant） |
| `"×1 送る"` | `sendCtaText` |
| `"ギフトを贈る"` / `"スタンプ"` | `sheetTitleText` |
| `"が🌹を贈りました"` | `senderActionText` |
| `"🎉 1,000🪙ダイヤを贈呈!"` | `congratulationText` |
| `"❤️"` / `"💐"` / `"👑"` / `"💎"` | `giftIcon`（emoji コンテンツも text node の場合 same rule） |
| `"🪙"` (繰り返し 30 個) | `coinIcon`（30 個全部 same name でOK、index は parent 側で管理） |
| `"✨"` (パーティクル多数) | `sparkleIcon` |
| `"1"` / `"2"` / `"3"` (順位) | `rankNumText`（順位値は `rankIndex` variant か parent name で管理） |

**役割名が思いつかない場合の最低保証**:
- セクション内容を表す末尾 `Text`: `bioText` / `priceText` / `dateText`
- フォーム要素なら: `labelText` / `placeholderText` / `valueText` / `helperText` / `errorText`
- ボタン内なら: `buttonLabelText` / `ctaText`
- アイコン的 text なら: `<purpose>Icon` で統一（emoji を icon として使う場合も含む）

**自己チェック**:
- 出力する前に **すべての TEXT node の name を grep** して、**仕様書（spec）に出てくる文字列と一致するものがあれば違反**。
- 例: spec に "Yitian Wang" が含まれている → output に `name="Yitian Wang"` の text node があれば NG。

---

## 2. Library 使用ルール

### 2.1 Library 情報

| 項目 | 値 |
|------|-----|
| Library file_key | `CPe64VQc7petbZawTE6J8o` |
| Library 名 | Library - Guideline |
| 参照方法 | `importComponentSetByKeyAsync(key)` → `.createInstance()` |

### 2.2 よく使う Library Component（白名单）

| 用途 | component 名 | key | 注意 |
|------|------------|-----|------|
| 人間のユーザーアイコン | `User icon` | `51faaa59eccc1fd112e9f7c88100c2077004e974` | COMPONENT_SET、18 variants。type=Self/Other/Default × State=Profile/Comments/MiddleSearch/bottomNavi/Minimum |
| Twomi アバターサムネ | `Avatar icon` | `cdd946a03ddc4f89c12cc5e597bfd8af63311f8a` | COMPONENT_SET、16 variants。State=Active/Disable × Context=サイズ |
| Header（戻る + タイトル） | `Header` | `2fbd7ca2de88291ad1d7f7bcdc4cdc894987f97c` | After/Before × OS × Background |
| 戻る/三点等のヘッダーボタン | `headMenu` | `f5ed07919150302ef05f6608dde1f552e4037bcc` | 41 variants（State × titlePosition × mode） |
| BottomNav | `navigation_liquid` | `250f4ab25c2aa2c1eced9b44b7c13056301ce6b7` | Light/Dark × Selected tab |
| 設定アイコン | `SideTool` | `4d253cf55095f9578e71a34a6ddedc40586ac5b8` | 2 variants（Default/Select）|
| Tier ラベル | `AvatarIcon ExclusiveContentLabel` | `b35ec663d2dcb1c854c76b8ffce24dd355cf8964` | Avatar Card の左上に重ねる pill |
| Alert ダイアログ | `Overlay - Alerts` | `66bd5a7fb0912c0439a331c40c14a092dbd45c44` | COMPONENT（COMPONENT_SET ではない）、`importComponentByKeyAsync` で読む |
| 入力フィールド | `SearchField` | （schemas/twomi/02 参照） | Dark Mode 切替あり |

詳細な variant 構造・パディング・色の決定ロジックは `server/schemas/twomi/*.schema.yaml` を参照。

### 2.3 誤選択しがちな黒名单

| 誤選択 component | 誤用文脈 | 正しい component |
|---|---|---|
| `Avatar infomation` | 人間ユーザーの profile 画面に使う | → User icon + テキストで構築 |
| `Avatar infomation` | 単独 component として配置 | → これは Twomi アバター詳細ページ用、複雑なネスト構造 |
| `AvatarIcon ExclusiveContentLabel` | 単体で配置 | → 必ず Avatar icon の上に重ねる pill。単独使用しない |
| Apple iOS Alert ComponentSet | 直接 import | → block されている。Twomi の `Overlay - Alerts` を使う |

### 2.4 Component 選択の優先順位

1. **schema にある専用 component** → 必ず使う
2. **Library catalog にある近い component** → schema を確認してから使う
3. **schema にも catalog にもない** → primitive で作る（AutoLayout + Text 等）
4. **createEllipse / createRectangle を image fill で頭像にする** → **絶対禁止**

---

## 3. 画面構造ルール

### 3.1 scaffold の使い分け

3 種類の scaffold は `server/scaffolds/scaffold_{a,b,c}.js` にある。Step 4 では適切な scaffold を選んでから contentFrame を埋める。

| scaffold | 特徴 | 適用画面例 |
|---|---|---|
| **A** | Header（110）+ Scroll content（662）+ Footer with BottomNav（102）、白背景 | Profile / Settings / Package Select / Notification / Search |
| **B** | フルスクリーン（H874）+ BottomNav Float、Header overlay、黒背景推奨 | Home Feed / Avatar TOP (Other) / Paid Content / Avatar Zoom |
| **C** | フルスクリーン（H874）+ 下部タブ連動、BottomNav なし | Avatar TOP (Self) / Customize / Creator Studio / Live Stream Full |

### 3.2 scaffold ごとの content area

- **A**: contentFrame は y=110, h=662（Header の下から BottomNav の上まで）
- **B**: contentFrame は y=0, h=874（全画面、Header と BottomNav はオーバーレイ）
- **C**: contentFrame は y=0, h=874（全画面、Header のみオーバーレイ）

### 3.3 配置・余白の原則

- 主要要素は SafeArea 内に配置
- 横方向 padding: 16px 推奨（画面端まで使う場合は 0px）
- Gap は 8 の倍数
- 可変 Content は **起点を必ず指定**（上中央 / 天地中央 / 左揃え縦中央 等 9 方向）

---

## 4. variant / visibility / Prototype 使い分け

画面差分は **screen copy で対応しない**。以下の 3 手段で吸収する。

| 手段 | 使う場面 | 例 |
|---|---|---|
| **variant** | 状態・言語・ユーザー種別による見た目の差分 | Self/Other / JP/EN / Public/Private / Empty |
| **visibility 制御** | タブ切り替え・条件表示・スコープアウト | tab 切り替え / Beta 版バッジ / 非公開状態 |
| **Prototype** | ユーザー操作によるインタラクティブな状態変化 | タップで UI 非表示 / 横スワイプ |

### 4.1 Self / Other 統合パターン

**screen copy 禁止**。同じ画面構造で権限だけ違うので **User variant で 1 component に統合**する。

| 画面 | 統合方法 |
|------|---------|
| Profile | `userHeader` の `userType` variant（self / other）で吸収 |
| Home feed | `Avatar Card` の `User` variant（self / other）で吸収 |
| Avatar TOP | `User` variant + 編集系 UI を visibility 制御 |

### 4.2 Empty 状態の扱い

- 専用 screen を作らず、**`State=Empty` variant** で吸収
- 例: `userProfile` に variant `contentState: filled / empty`

### 4.3 スコープアウト機能の扱い

- 物理削除しない
- `State=Old` / `visibility: false` variant で非表示にする
- 将来の機能追加時に再設計コストが減る
- 正式リリース後に variant を削除（タイミングを明確にする）

---

## 5. カラー使用ルール

### 5.1 ベースカラー

| 用途 | 色 | 備考 |
|------|-----|------|
| ブランド主色・CTA 専用 | `#35C1C6` (Teal) | **Membership / ステータスのベタ塗りに使わない** |
| ブランド副色（フロスト上テキスト） | `#26A2A6` (Teal Darker) | |
| テキスト主色 | `#2E2E2E` (DarkGray) | |
| 背景 | `#FFFEFE` (White) | |
| サブ背景 / フロストバッジ | `#F2F2F2` (White Frost) | |

### 5.2 Color Rules 5 原則

| # | ルール |
|---|--------|
| 01 | **色ベタはブランドアクションのみ** — 塗りつぶしは CTA・公開中など唯一の能動的状態に限定 |
| 02 | **バッジは形状で役割を分離** — Verified（花形）と Membership（pill/丸）でシルエットを変える |
| 03 | **新色は役割単位で追加** — 機能が増えても色を増やさず既存ロールに乗せる |
| 04 | **アバター上は透過＋テキスト色で担保** — 背景が予測不能な場面では `rgba(242,242,242,0.70)` フロスト + `#26A2A6` テキスト |
| 05 | **Teal はブランド専用** — Membership / ステータスのベタ塗りに Teal を使わない |

### 5.3 予約済みカラー（他用途への転用禁止）

| 色域 | 予約用途 |
|------|---------|
| 赤系 `#FF3E1C` | Partner バッジ + Danger/Error |
| グリーン系 `#6F8484` | Verified Standard バッジ |
| ゴールド系 `#EAB004` | Verified Premium バッジ |
| パープル系 `#7F77DD` | Verified VIP バッジ |
| Teal `#35C1C6` | ブランド主色・CTA のみ |

### 5.4 アバター画像上のバッジ（必須仕様）

背景が予測不能な場面で使うフロスト pill / 丸:

```
background: rgba(242, 242, 242, 0.70)
border: 1px solid rgba(242, 242, 242, 0.55)
backdrop-filter: blur(10px)
color: #26A2A6
```

---

## 6. UX ライティング

ユーザーの気持ちに寄り添う言葉を選ぶ。システム的な表現を避ける。

| ❌ NG（システム的） | ✅ OK（ユーザー視点） |
|----------------|-----------------|
| 課金 | お支払い・料金 |
| 決済 | お支払い |
| 課金開始 | 料金が発生します |
| 解約処理 | 解約 |
| 購入完了 | メンバーになりました |
| エラーが発生しました | うまくいきませんでした |

### 用語ルール

| UI 上で使わない言葉 | 代わりに使う言葉 |
|---|---|
| ファン | メンバー / メンバー以外 |
| プランの停止 / 再開 | 公開 / 非公開（ティア公開ステータス）|

---

## 7. 命名規則

### 7.1 Component 命名

- **camelCase**、役割ベース
- フォーマット: `componentName` / `componentName_variant` / `componentName_state`
- 見た目ベース（`redButton`, `largeCard`）**禁止**
- 画面名入り（`loginPageButton`）**禁止**
- 意味曖昧（`component1`, `commonComponent`）**禁止**

### 7.2 Layer 命名

- camelCase、役割ベース、英語
- フォーマット: `[Role][Type]_[Role]_[State]`
- 例: `primaryButton`, `screenTitleText`, `avatarImage`, `tabBar`
- Rectangle / Group / Text 等の汎用名 **禁止**
- 階層は **4 階層以内** が目安（Language variant など構造上やむを得ない場合は超えてよい）

### 7.3 Screen 命名

```
Section名 / 画面名
画面名 = [View] / [State] または [State] / [View]
```

例:
- `Profile / Self / Create`
- `Profile / Self / Create Empty`
- `Home / Other-following`

---

## 8. 既知失敗モード（過去テストで実測）

Design Agent が過去にやらかしたパターン。**生成前に必ずチェック**。

| 失敗 | 原因 | 対策 |
|------|------|------|
| `AVATARNAME` / placeholder text が残る | 違う Library component を import して、その component の placeholder content が露出 | **2.3 黒名单**を確認 |
| `Avatar infomation` を人間 profile に紛れ込ませる | "avatar" キーワードで誤マッチ | spec に "USER profile（人間）" と明記、黒名单参照 |
| Component が画面外（y < 0 や y > 874） | 座標計算ミス | scaffold の contentFrame 内に確実に収める |
| `figma.createEllipse()` で頭像 | Library 認識失敗 | **1.2 絶対ルール** |
| 不要なネスト | Frame を増やすためだけのコンテナ | レイヤー名で用途が説明できないものは作らない |
| screen copy で Self / Other 対応 | variant 知識不足 | **4.1 統合パターン** |
| Empty 状態を別 screen に | variant Empty を使わない | **4.2** |
| line-height: Auto | font 指定の癖 | **1.5** |
| Gap が 8 の倍数でない | 7px や 10px を使う | **1.4** |

---

## 9. 出力前セルフチェック

Step 4 でコード生成後、**出力する前に**以下を自問する。1 つでも No なら再考。

```
□ Library Component で表現できる UI を Library で表現したか？
□ figma.createEllipse() / createRectangle() で代替していないか？
□ 画面サイズ 402×874 を守っているか？
□ 全要素が画面内（y >= 0 && y + height <= 874）か？
□ Header 110 / BottomNav 102 を変更していないか？
□ Gap が 8 の倍数か？
□ AutoLayout コンテナに入れたか（直置きしていないか）？
□ line-height を数値指定したか？
□ Z 軸の順序は正しいか？
□ "AVATARNAME" 等の placeholder text が残っていないか？
□ Self / Other を screen copy していないか（User variant 使用）？
□ Empty / scope-out を visibility variant で対応したか？
□ Teal を CTA 以外に使っていないか？
□ 直置きアイコン・テキストはないか？
```

---

## 10. 不確実時のフォールバック（Code of Conduct §13 準拠）

### 10.1 spec に書いていないことは勝手に判断しない

- spec に明記されていない要素は **入れない**（追加しない）
- spec の意味が曖昧なときは **最も保守的な選択**（後から追加するほうが楽な側）

### 10.2 spec の延長で判断する場合

| spec が曖昧 | 保守的な選択 |
|---|---|
| ボタンの色が無 | ニュートラル（border `#C4C4C4`, fill transparent）|
| 余白の値が無 | 16px（SafeArea LR と揃える）|
| アイコンの種類が無 | アイコン無 |
| 数値の単位が無 | px（Twomi は全 px ベース） |
| 言語が無 | JP |

### 10.3 構造的に判断不可な場合

- Owner に YES/NO 質問形式で確認（Code of Conduct §6）
- 例: 「Profile 画面に Follow ボタンと Edit Profile ボタンを両方配置しますか？ YES = 両方 / NO = Self は Edit のみ、Other は Follow のみ」

---

## 11. Twomi 設計哲学（最終判断基準）

「**なぜその構造か**」で迷ったらこの 8 条に立ち返る:

1. **ユーザーの学習コストを下げる** — 操作パターンは主要エンタメアプリ（TikTok・Instagram）に寄せる
2. **1 画面 1 責務を基本とする** — ただし関連操作はタブでグルーピング
3. **主役はアバター** — UI はアバターの邪魔をしない。必要なときだけ前面に出る
4. **状態はユーザーに明示する** — ただし小さく・端に寄せてアバターを覆わない
5. **Self は編集者、Other は観客** — 同じ画面構造・異なる権限。画面を分けない
6. **拡張を前提に設計する** — 今ない機能は variant で非表示にして保持
7. **設定を「作業」ではなく「体験」にする** — アバターを育てる楽しさとして設計
8. **画面遷移ではなく「空間移動」として設計する**（理想形）
   - 同じ階層の切り替えは横スワイプ
   - 詳細はタップ、戻りはスワイプ下または `<`
   - 各コマは独立した可変サイズ component
   - やむを得ず別画面になる場合は Bottom Sheet で「浮上感」を保つ

---

## 12. 違反時の取扱い

| 違反種別 | 取扱い |
|---|---|
| MUST 違反（1, 2, 3 章）| **自動再生成**。出力を破棄して spec を見直す |
| SHOULD 違反（4-7 章）| 警告ログ。owner が許容するか確認 |
| NICE 改善余地（哲学レベル）| 次回イテレーションで取り入れ |

---

## 13. 参照ドキュメント

| ドキュメント | 用途 |
|---|---|
| [`twomi_design_master.md`](./twomi_design_master.md) | 設計システム本体（色・タイポ・サイズ・命名） |
| [`twomi_design_structure.md`](./twomi_design_structure.md) | AutoLayout / Z 軸 / 構造ルール |
| [`twomi_design_component.md`](./twomi_design_component.md) | line-height / scope-out 対応 |
| [`twomi_screen_analysis.md`](./twomi_screen_analysis.md) | 10 画面の variant / structure patterns |
| [`schemas/twomi/*.schema.yaml`](../schemas/twomi/) | Component 別の詳細 spec |
| [AI AGENT Code of Conduct](https://www.notion.so/36d9a37c48cc81ec866ce5c72ef2a13e) | 全社共通の倫理・運用原則 |
| [AI Agent Operation Policy](https://www.notion.so/36e9a37c48cc8119a503db8e4b8d2e52) | 承認・監視・廃止フロー |

---

## バージョン履歴

| Version | Date | Note |
|---|---|---|
| v0.1 (Phase 1) | 2026-05-28 | 初版。実測失敗モード（5/27 テスト）を §8 に反映 |
