# Twomi Design Master
> UI Rules & Design System — Single Source of Truth

| 項目 | 内容 |
|------|------|
| 最終更新 | 2026-05-13 |
| ステータス | 運用中 |
| 統合元 | `twomi_ui_rules.md` / `CLAUDE.md` |
| 更新ルール | 今後の更新はこのファイルのみを編集する |
| **正ファイル** | **デザイン情報の参照・更新はこのファイルを正とする。他ファイル（SKILL.md等）と内容が異なる場合はこのファイルを優先する** |

---

## 目次

1. [Figma制作基準](#1-figma制作基準)
2. [カラーシステム](#2-カラーシステム)
3. [タイポグラフィ](#3-タイポグラフィ)
4. [UIコンポーネントルール](#4-uiコンポーネントルール)
5. [UXライティング](#5-uxライティング)
6. [用語ルール](#6-用語ルール)
7. [コンポーネント命名規則](#7-コンポーネント命名規則)
8. [レイヤー設計ルール](#8-レイヤー設計ルール)
9. [Branch命名規則](#9-branch命名規則)
10. [未確定事項](#10-未確定事項)
11. [スクリーン命名規則](#11-スクリーン命名規則)

---

## 1. Figma制作基準

> 参照ファイル：Library - Guideline（CPe64VQc7petbZawTE6J8o）
> カラーページ node-id: 143:1142

### 1.1 画面サイズ

| 区分 | 幅 | 高さ | 用途 |
|-----|-----|------|------|
| **Figmaデザインサイズ（制作基準）** | **402** | **874** | **モック・Figma制作はこのサイズで作成する** |
| 想定最小デバイスサイズ | 375 | 812 | レイアウト崩れの確認基準 |

### 1.2 SafeArea（コンテンツ非配置領域）

| エリア | 値 |
|--------|-----|
| Top | 64px |
| Bottom | 34px |
| Left / Right | 16px |

> **注記：** SafeAreaはコンテンツ（テキスト・ボタン等）の非配置領域。
> 背景画像・背景色はSafeAreaを含む画面全体に適用される。

### 1.3 固定UIの高さ

| コンポーネント | 高さ | 備考 |
|-------------|------|------|
| Header（ナビゲーション） | 110px | StatusBar含む |
| BottomNav | 102px | SafeArea Bottom含む |
| BottomNav アイコン上端 | 37px（Bottom基準） | タップ領域設計に使用 |

### 1.4 コンテンツエリア（実質描画領域）

Figmaデザインサイズ（W402 × H874）の場合：
- **実質コンテンツ高さ: 874 - 110 - 102 = 662px**
- Left / Right padding: 16px推奨（画面端まで使用する場合は0px）

---

## 2. カラーシステム

Figma スタイル: `JP/Primary/*`

### 2.1 ベースカラー（Primary）

| Figmaスタイル名 | Hex | 用途 |
|----------------|-----|------|
| Teal | `#35C1C6` | ブランド主色・CTA専用 |
| Teal Darker | `#26A2A6` | ブランド副色・フロストBG上テキスト・アイコン |
| Teal Light | `#EAF7F8` | 薄Teal |
| DarkGray | `#2E2E2E` | テキスト主色 |
| Black | `#1C1C1C` | — |
| White | `#FFFEFE` | 背景 |
| White Frost | `#F2F2F2` | フロストバッジ用 |
| Warning | `#EAB004` | 警告（既存・触らない） |
| Warning Light | `#FAE199` | 警告背景・強調タグ |
| Warning Lighter | `#FDF0C2` | インライン注記背景 |
| Warning Subtle | `#FEFAED` | 文章セクション背景（最も控えめ） |
| Error | `#FF3E1C` | エラー・Danger |
| Red | `#D3302E` | エラー強調 |
| Error Light | `#FFAB99` | 短いシステムエラーメッセージ背景 |
| Error Lighter | `#FFD5CC` | インライン注記・フォームバリデーション背景 |
| Error Subtle | `#FFF0ED` | 文章セクション背景（最も控えめ） |
| Success | `#6CB804` | 成功 |

### 2.2 バッジカラー

#### Verified Badges（固定・変更不可）
認証状態を示すバッジ。花形シールアイコンを使用。

| バッジ名 | カラー | 用途 |
|---------|--------|------|
| Partner | `#FF3E1C` → `#D3302E`（gradient） | AIA有料会員。AIA赤を継承 |
| Verified Standard | `#6F8484` | 認証済み / 基本会員 |
| Verified Premium | `#EAB004` → `#BA7517`（gradient） | 有料プラン / 上位会員 |
| Verified VIP | `#7F77DD` → `#534AB7`（gradient） | 最上位 / 特別会員 |

#### Membership Badge
メンバーシップ加入済みかどうかを示すバッジ。**プラン識別は行わない**（詳細は別画面で確認）。

**表示形式 2種：**
- **Pill型** — リスト・カード・プロフィール欄
- **アイコン型（丸）** — アバター画像の右下に重ねる

**実装仕様：**
```css
/* Pill */
background: rgba(242, 242, 242, 0.70);
border: 1px solid rgba(242, 242, 242, 0.55);
backdrop-filter: blur(10px);
-webkit-backdrop-filter: blur(10px);
color: #26A2A6;
border-radius: 100px;

/* アイコン（丸）*/
background: rgba(242, 242, 242, 0.70);
border: 1.5px solid rgba(242, 242, 242, 0.55);
backdrop-filter: blur(10px);
-webkit-backdrop-filter: blur(10px);
border-radius: 50%;
```

**Figma スタイル:** `JP/Primary/White Frost`

### 2.3 Warning カラーバリエーション

| Figmaスタイル名 | Hex | 用途 | Figma操作 |
|----------------|-----|------|-----------|
| `Warning` | `#EAB004` | アイコン・バッジ・ボーダー強調 | 既存・触らない |
| `Warning Light` | `#FAE199` | 短いシステムメッセージ背景 | 新規追加済み |
| `Warning Lighter` | `#FDF0C2` | インライン注記・左ボーダー背景 | 新規追加済み |
| `Warning Subtle` | `#FEFAED` | 文章セクション背景（最も控えめ） | 新規追加済み |
| `Warning Text Strong` | `#7A5800` | タイトル・強調（Warning背景上） | 新規追加済み |
| `Warning Text` | `#996E00` | 本文・説明（Warning背景上） | 新規追加済み |

- 白テキストはコントラスト比不足のため使わない（WCAG AA基準）
- Figma グループ: `JP/Semantic/`
- 既存の `Warning` スタイルはリネームしない（参照が外れるリスク）

**追加しなかった色:** `#F2C84B`（70%）— Verified Premiumバッジと視覚的に近く混同リスクがあるため除外

### 2.4 Error / Danger カラーバリエーション

| Figmaスタイル名 | Hex | 用途 | Figma操作 |
|----------------|-----|------|-----------|
| `Error` | `#FF3E1C` | アイコン・ボタン・ボーダー強調 | 既存・触らない |
| `Red` | `#D3302E` | エラー強調 | 既存・触らない |
| `Error Light` | `#FFAB99` | 短いシステムエラーメッセージ背景 | 新規追加済み |
| `Error Lighter` | `#FFD5CC` | インライン注記・フォームバリデーション背景 | 新規追加済み |
| `Error Subtle` | `#FFF0ED` | 文章セクション背景（最も控えめ） | 新規追加済み |
| `Error Text Strong` | `#8B1000` | タイトル・強調（Error背景上） | 新規追加済み |
| `Error Text` | `#C0180A` | 本文・説明（Error背景上） | 新規追加済み |

- 100%背景（ボタン・アイコン）のみ白テキスト使用可
- Figma グループ: `JP/Semantic/`
- 既存の `Error`・`Red` スタイルはリネームしない

**追加しなかった色:** `#FF7A5C`（70%）— Partnerバッジ（#FF3E1C）と視覚的に近く混同リスクがあるため除外

### 2.5 予約済みカラー（他用途への転用禁止）

| 色域 | 予約用途 |
|------|---------|
| 赤系 `#FF3E1C` | Partner バッジ + Danger/Error |
| グリーン系 `#6F8484` | Verified Standard バッジ |
| ゴールド系 `#EAB004` | Verified Premium バッジ |
| パープル系 `#7F77DD` | Verified VIP バッジ |
| Teal `#35C1C6` | ブランド主色・CTA のみ |

**新機能に色が必要なとき:** `#378ADD`（Blue）・`#D85A30`（Coral）・Gray系から選ぶ。

### 2.6 ステータス表示との住み分け

アバター生成・公開状態のステータス（公開中・非公開・生成中など）は**既存の設定を変更しない**。Membershipバッジはその色域・形状・用途と重ならない設計になっている。

### 2.7 Color Rules 5原則

| # | ルール |
|---|--------|
| 01 | **色ベタはブランドアクションのみ** — 塗りつぶしはCTA・公開中など唯一の能動的状態に限定する |
| 02 | **バッジは形状で役割を分離** — Verified（花形）とMembership（pill/丸）でシルエットを変える |
| 03 | **新色は役割単位で追加** — 機能が増えても色を増やさず既存ロールに乗せる。不足なら同色の濃淡で階層を作る |
| 04 | **アバター上は透過＋テキスト色で担保** — 背景が予測不能な場面では `rgba(242,242,242,0.70)` フロスト + `#26A2A6` テキストを使う |
| 05 | **Tealはブランド専用** — Membership・ステータスのベタ塗りにTealを使わない |

---

## 3. タイポグラフィ

| 項目 | 値 | 備考 |
|------|-----|------|
| フォント | Noto Sans JP | 全画面共通 |
| サイズ | 要追加 | 後日追記予定 |

---

## 4. UIコンポーネントルール

### 4.1 タブ・メニュー項目の表示
- タブやメニュー項目は、コンテンツの有無に関わらず**必ず表示する**
- コンテンツが0件の場合は、タブ内に状況に応じた空状態メッセージを表示する

### 4.2 完了・状態変化の通知
- 設定完了・状態変化はすべて**トースト通知**で知らせる
- トーストは画面上部に表示する

### 4.3 Dialog vs Bottom Sheet 使い分け

**判断軸：操作を「止めるか」、流れに「添えるか」**

| 項目 | ダイアログ | ボトムシート |
|------|-----------|-------------|
| 用途 | 重大な意思決定・確認・警告 | 補助的な操作・選択肢の提示 |
| ユーザーへの要求 | 即座に判断・操作を止めさせる | 流れを止めずに追加情報を渡す |
| コンテンツ量 | 短い（テキスト＋1〜2ボタン） | 多くてもOK（スクロール可） |
| 背景との関係 | 背景を完全にブロック・無効化 | 背景は見え、コンテキストを保持 |
| 閉じ方 | ボタンのみが原則（外タップ無効推奨）/ 例外：重要度が低い通知は外タップで閉じることも可 | スワイプ下・外タップ・キャンセル |

**ダイアログを使うケース**
- 削除の最終確認
- 権限リクエスト
- エラー通知（操作が必要）
- サインアウト確認

**ダイアログを使わないケース**
- フィルター選択（内容が多い）
- シェアオプション
- コメント入力

**ボトムシートを使うケース**
- 並び替え・フィルター
- シェアメニュー
- コメント入力・返信
- 詳細情報パネル

**ボトムシートを使わないケース**
- 権限リクエスト
- 削除の最終確認（軽く見える）
- エラー警告

---

## 5. UXライティング

**ユーザーの気持ちに寄り添う言葉を選ぶ**
- システム的な表現より、ユーザーの行動や感情に近い言葉を使う
- 機能の説明ではなく、ユーザーにとっての意味を伝える

**日本語UXで避ける言葉**

| NG（システム的） | OK（ユーザー視点） |
|----------------|-----------------|
| 課金 | お支払い・料金 |
| 決済 | お支払い |
| 課金開始 | 料金が発生します・ご利用料金が始まります |
| 解約処理 | 解約 |
| 購入完了 | メンバーになりました |
| エラーが発生しました | うまくいきませんでした |

---

## 6. 用語ルール

### 「ファン」について
- 「ファン」は要件定義書内での便宜上の呼称であり、UI上には使用しない
- UI上では「メンバー」「メンバー以外」で統一する

### 「停止・再開」について
- 「プランの停止・再開」という表現はUI上では使用しない
- UI上では「公開/非公開」で統一する
- ラベル名：「ティア公開ステータス」
- 状態表現：「公開中 / 非公開」

---

## 7. コンポーネント命名規則（Draft）

**基本方針**
- Component名は「UIの役割」を表す
- 実装時にコンポーネント名・変数名として読めること
- Layer名より少し大きい粒度で命名する

**命名フォーマット**
```
componentName
componentName_variant
componentName_state
```
※ Variant / State は必要な場合のみ

**命名OK例**

| カテゴリ | 例 |
|---------|-----|
| Buttons | primaryButton, secondaryButton, textButton, iconButton |
| State & Variant | primaryButton_disabled, primaryButton_loading, primaryButton_small |
| Form & Input | inputField, textInput, passwordInput, toggleSwitch, checkbox |
| Form & Input With State | inputField_error, inputField_focused |
| Lists & Cards | listItem, userListItem, avatarCard, contentCard |
| Media | avatarImage, avatarVideo, thumbnailImage, previewVideo |
| Navigation | tabBar, tabItem, navigationHeader, backButton |
| Modal & Overlay | modal, confirmationDialog, bottomSheet |

**命名NGパターン**
- 意味が曖昧：`component1` `uiParts` `commonComponent`
- 見た目ベース：`redButton` `largeCard` `shadowBox`
- 使い回し前提でない：`loginPageButton` `topScreenHeaderOnly`

**判断に迷ったら**
- このComponentは「どこでも再利用できる役割」か？
- 画面名が入っていないか？

### Languageバリアント

ワーディング管理が必要なコンポーネントは、日英のLanguageバリアントを作成する。

| プロパティ | バリアント値 |
|-----------|------------|
| Language | `JP` / `EN` |

**対象の目安：** ラベル・ボタンテキスト・エラーメッセージ・空状態メッセージなど、表示テキストを持つコンポーネント全般

**例：**
```
primaryButton          Language=JP  →「公開する」
primaryButton          Language=EN  →「Publish」
emptyStateMessage      Language=JP  →「まだ配信はありません」
emptyStateMessage      Language=EN  →「No streams yet」
```

---

## 8. レイヤー設計ルール（Draft）

**基本原則（最優先）**
- 見た目ではなく「役割・構造」で作る
- **レイヤー名だけで用途が分かること** — これが唯一の絶対ルール
- 可能な限りAuto Layoutを使用（Screen / Section / Component単位）

**階層数について**
- 目安は4階層以内だが、Languageバリアントのネストなど構造上やむを得ない場合は超えてよい
- 階層が深くなるときは「名前で用途が分かるか」を都度確認する
- 意味のない中間Frameを挟んで階層を増やすことはNG

**レイヤー構造（目安）**
```
screen
├── header
├── content
│   └── section
│       └── listItem
│           ├── text
│           └── icon
└── footer
```

**レイヤー命名規則**
- 英語・camelCaseを使用（バックエンド命名規則に合わせる）
- 見た目ではなく役割で命名する
- フォーマット：`[Role][Type]_[Role]_[State]`

**命名OK例**

| カテゴリ | 例 |
|---------|-----|
| Screen & Structure | screen, header, content, section, footer |
| Text | screenTitleText, sectionTitleText, bodyText, descriptionText, errorText |
| Buttons | primaryButton, secondaryButton, textButton, iconButton |
| Buttons With State | primaryButton_disabled, primaryButton_loading |
| Form & Input | inputField, textInput, passwordInput, toggleSwitch |
| Form & Input With State | inputField_error, inputField_focused |
| Media | avatarImage, avatarVideo, thumbnailImage, previewVideo |
| Lists & Cards | list, listItem, card, cardList |

**命名NGパターン**
- Rectangle / Group / Textなどの汎用名
- 意味のないFrame・Group（階層を増やすためだけの入れ物）

**最低限チェック**
- 名前だけで用途が分かる
- 構造が画面と一致している
- Auto Layoutが論理的に使われている
- 同じ役割のUIが同じ命名になっている

---

## 9. Branch命名規則

| プレフィックス | 用途 |
|--------------|------|
| `feature/` | リリース予定の機能 |
| `Hold/` | 将来リリース予定だが現在は保留中 |

- `Hold/` のBranchはリリース準備に入ったタイミングで `feature/` に改名する

---

## 10. 未確定事項

- [ ] タイポグラフィのサイズ定義（後日追記予定）
- [ ] 限定コンテンツバッジの最終形状・シンボル（文字のみ / Unlock・Lock アイコン / Pill / 丸 — いずれかに絞り込み）


---

## 11. スクリーン命名規則

### 基本フォーマット

```
Section名 / 画面名

Section名: 画面グループ（Profile / Home / Search など）
画面名:    [View] / [State]  または  [State] / [View]
           ※文字数が短くなる方を選ぶ
```

Figmaは機能・画面単位でページが分かれているため大きく迷うことはない。
ただし検索で引っかかるよう、キーワードになる単語は省略しすぎない。

### 命名の思想

**TOP画面 — 構造が読めること**

画面を初めて見た人が、名前だけでどの画面か・何の画面かを理解できること。
Section + View + State で構造が一目でわかるようにする。

```
例: Profile / Self / Create
    Profile / Other / Create
```

**派生画面 — 状態がわかること**

TOP画面から派生する画面は、何が違うのかが名前でわかること。
TOP画面名をベースに、差分となるStateを付加する。

```
例: Profile / Self / Create Empty
    Profile / Self / LiveStream
    Profile / Self / LiveStream Empty
```

### 命名の優先順位

| 優先度 | 対象 | 基準 |
|--------|------|------|
| 1 | TOP画面 | 構造が読めること（Section / View / State） |
| 2 | 派生画面 | 状態の差分がわかること（TOP画面名 + 差分State） |
| 3 | 共通 | 検索で引っかかるキーワードを残す |

### フロー資料での画面使用ルール（推奨）

フロー説明に画面が必要な場合はスクリーンショット（静止画）を使う。
ファイル名に日付を入れることで「その時点のスナップショット」であることを明示する。

```
例: profile_self_create_20260513.png
```

- 最新デザインの正はFigmaのDesignScreen
- フロー資料に貼られた画像は「作成時点の参考」として扱う
- 遷移先の参照はスクリーン名で行うことを推奨する
- DesignScreenの複製・コピーをフロー資料に使用しない


---

## 12. 可変 / 固定の判断基準

### なぜ可変にするか

固定サイズのcomponentは将来の改修・レイアウト統合の障壁になる。
「さわれない画面」化を防ぐためのルールである。

Customizeのような「横スワイプに統合できない」問題は、
componentが固定サイズ・分離不可能な構造で作られたことが原因である可能性がある（推察）。
詳細な原因は要確認だが、設計段階での構造判断が影響している可能性が高い。

### 判断軸

**「他のcomponentを内包するか、画面レイアウトに影響を与えるか」**

| 判断 | 条件 |
|------|------|
| 可変にすべき | 他のcomponentを内包する / 画面レイアウトに影響を与える |
| 固定でよい | 最小単位で完結する（内包しない・レイアウトに影響しない） |

### 判断基準例

**固定でよいもの:**
- アイコン（機能を持つ最小単位）
- バッジ（ラベル・ステータス表示の最小単位）
- ボタン単体（固定高さで設計されているもの）

**可変であるべきもの:**
- テキストを含むコンテナ（言語・文字量で変動する）
- リスト・グリッドのコンテナ（コンテンツ量で変動する）
- 画面に占める割合が大きいcomponent（レイアウト統合の可能性がある）
- 他のcomponentを内包するコンテナ

### 固定サイズで作った場合のリスク

- 改修時に触れない画面になる
- 将来の画面統合・リファクタリングの障壁になる
- 技術的負債として残り続ける

---

## 13. Twomi設計哲学

> 「なぜその構造か」の判断基準。現状すべて実践できているわけではないが、理想形として定義する。

- **ユーザーの学習コストを下げる** — 操作パターンは主要エンタメアプリ（TikTok・Instagram等）に寄せる
- **1画面1責務を基本とする** — ただし関連操作は分割せずタブでグルーピングする
- **主役はアバター** — UIはアバターの邪魔をしない。必要なときだけ前面に出る
- **状態はユーザーに明示する** — ただし小さく・端に寄せてアバターを覆わない
- **Selfは編集者、Otherは観客** — 同じ画面構造・異なる権限。画面を分けない
- **拡張を前提に設計する** — 今ない機能はvariantで非表示にして保持する
- **設定を「作業」ではなく「体験」にする** — アバターを育てる楽しさとして設計する
- **画面遷移ではなく「空間移動」として設計する**（理想形）
  - タップで移動→タップで潜る→タップで戻る の繰り返しはエンタメアプリとして体験が損なわれる
  - 同じ階層の切り替えは横スワイプ / 詳細はタップ / 戻りはスワイプ下または＜
  - 各コマは独立したcomponent・可変サイズで設計する（横スワイプへの統合を前提とする）
  - やむを得ず別画面になる場合はBottom Sheetで「浮上感」を保つ
  - ユーザーがアバターに没頭したままアプリ内を「泳いでいる」感覚を目指す