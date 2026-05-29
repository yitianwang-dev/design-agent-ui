# Twomi 画面分析サマリー
> 2026-05-13 分析済み画面の構造・設計思想まとめ

| 項目 | 内容 |
|------|------|
| 最終更新 | 2026-05-13 |
| ステータス | 分析済み（Wip — 全画面の分析は未完了） |
| 参照元 | `twomi_design_master.md` / `twomi_ai_design_prompt.md` |

> このファイルは分析済み画面の設計思想・component構造・フラグ定義を記録したものです。
> 新規画面の分析・レビュー時にこのファイルを参照することで、既存の設計との整合性を確認できます。

---

## 分析済み画面一覧

| 画面名 | 画面タイプ | 分析種別 |
|--------|-----------|---------|
| Profile / Self / Create | Header + Scroll | 詳細分析 |
| Profile / Self / Create Empty | Header + Scroll | 詳細分析 |
| Home - Self / Other | フルスクリーン | 詳細分析 |
| Avatar TOP / Self | フルスクリーン + 下部タブ | 詳細分析 |
| Avatar TOP / Other | フルスクリーン | 詳細分析 |
| ExclusiveContent / Creator・FAN | Bottom Sheet / PageSheet | 詳細分析 |
| Notification | Header + Scroll | 詳細分析 |
| Avatar Create フロー | Header + Scroll | 参考・チェックのみ |
| Studio / Outfit | Header + Scroll | 参考・チェックのみ |
| Customize | フルスクリーン + 下部タブ | 詳細分析 |

---

## 1. Profile / Self / Create・Create Empty

### レイヤー構造（確定）
```
Profile / Self / Create
├── 固定
│   ├── Header（110px）
│   └── Footer（BottomNav / Float 102px）
└── スクロール
    └── Container
        ├── userHeader（component）
        └── Contents
            └── UserProfile - TabContents（component）
                ├── Profile search tab（visibility制御）
                └── Table
                    └── ProfileThumbnail → Carousel
                        ├── SelfUserTable
                        ├── StreamingTable（非表示）
                        └── FavoriteTable（非表示）
```

### variantフラグ（確定）
```
userType: self / other
verifiedBadgeState: notVerified / verified
badgeType: partner / standard / premium / vip
exclusiveContentStatus: idle / pending / approved / rejected
activeTab: create / liveStream / favorite
avatarStatus: public / private / generating / creating / error / reject / memberLock / memberUnlock
```

### 設計上の重要ポイント
- タブ切り替えは `visibility制御`（screen copyなし）
- `Create Empty` は `State=Empty` variantで吸収（screen copyなし）
- `exclusiveContentManage CTA` はボタン自体がStatusを持つ（idle/pending/approvedで見た目が変わる）
- Self / Other は `userHeader` の `userType` variantで吸収

### conditional rendering
- `avatarCount === 0` → Empty状態表示
- `profileText.length > 閾値` → 「続きを読む」表示
- `userType === self` → プロフィール編集・限定コンテンツ管理表示

---

## 2. Home Feed（Self / Other-following / Other-follow）

### 画面タイプ
フルスクリーン。縦スワイプでページング（スクロールではない）。BottomNav Float。

### Avatar Card variantプロパティ（確定）
```
Model: selfVideo / selfInCallVideo / otherVideo / otherInCallVideo
Status: publicGenerating / placeholder / MemberLock / MemberUnlock / ...
ViewStatus: True / False（旧: Stasus — スペルミス修正済み）
Tag: True / False
VideoGenerationStatus: False / True
CreatorUserIcon View: False / True
Language: JP / EN
UseCase: Home / Home Pre-trans... / ...
User: Self / Other
ImageType: User Set / Video Com... / ...
ExclusiveContent: False / True
AvatarTOPFunction: True / False
LiveBadge(Single) view: False / True
```

### HomeFeed LiveStream variantプロパティ（確定）
```
ExclusiveContent: Lock / Unlock
ExclusiveContent View: True / False
```

### 設計上の重要ポイント
- タップ → UI非表示（Tap transition）→ Prototype + variantで表現
- Self / Other の分岐は `User` variantで1componentに統合
- `AvatarTOPFunction` プロパティでFunction Menuの表示制御
- `UseCase: Home Pre-trans` でタップ後の状態もvariantで吸収
- 背景グラデーションはアバター画像の代表色から動的生成（固定値ではない）
- Avatar動画 / Live配信が混在してフィードに流れる

### conditional rendering
```
isOwnAvatar: boolean → 投稿者情報エリアの表示制御
hasAudio: boolean → ミュートボタンの表示制御
tags.length > 0 → ハッシュタグ表示
```

---

## 3. Avatar TOP / Self

### 画面タイプ
フルスクリーン + 下部タブ（横スワイプ連動）。BottomNavなし。

### 構造
```
Avatar TOP（Self）
├── FunctionContent（variantで4State管理）
│   ├── Screen=EditTop
│   ├── Screen=LiveStreaming（Beta版バッジあり）
│   ├── Screen=VideoGallery
│   └── Screen=Customize（AIチャット形式）
└── AvatarTOP / FunctionMenuSection（W403×H80 / メンテナンスコスト削減component）
    ├── menu: EditTop / LiveStream / Publish / Customize
    ├── State: Old / feature（旧デザイン管理）
    └── Language: JP / EN
```

### AvatarTOP / Video Gallery variantプロパティ（確定）
```
Language: JP / EN
State: Default / Preview / Empty
ViewUpload: False / True
```

### 設計上の重要ポイント
- `FunctionContent` と `FunctionMenuSection` は別componentだが横スワイプで連動
- `State=Old` で旧デザインをvariantとして保持（リリース後に削除予定）
- `Beta版バッジ` はvariantで表示制御（正式リリース後に削除）
- `FunctionMenuSection` はメンテナンスコスト削減のためのcomponent（無意味なネスト禁止ルールの例外）

### variantフラグ
```
functionScreen: editTop / liveStreaming / videoGallery / customize
menuState: old / feature
betaVersion: true / false
videoGalleryState: default / preview / empty
viewUpload: boolean
```

---

## 4. Avatar TOP / Other

### Self / Other 差分（確定）

| 要素 | Self | Other |
|------|------|-------|
| 右上ボタン | `...`（Function Menu） | なし |
| 公開中トグル | あり | なし |
| ハッシュタグボタン | あり | なし |
| フォローボタン | なし | あり |
| 下部タブ | あり | なし |
| LiveBadge | 共通 | 共通 |

- Self / Other の差分は `User` variantで1componentに統合
- 編集系UIはOther側でvisibility=false

---

## 5. ExclusiveContent / Creator・FAN

### Creator側 variantフラグ
```
tierStatus: notSet / published / suspended
avatarCount: number（1〜3、表示枚数に影響）
language: JP / EN
```

### FAN側 variantフラグ
```
tierMemberStatus: expiringSoon / lockedRecommended / locked / expired / unlocked / reUnlock
daysUntilExpiry: number
isRecommended: boolean
ticketCount: number
periodDays: number
language: JP / EN
```

### 申請フロー variantフラグ
```
exclusiveContentStatus: idle / pending / approved / rejected
```

### 設計上の重要ポイント
- CTAボタン自体がStatusを持つ（idle/pending/approvedで見た目・ラベルが変わる）
- Lock状態タップ時はPaywallへの導線以外すべて非活性（迷わせない設計）
- Paywallは自動表示（ユーザーが探す必要なし）
- Bottom Sheetで申請フローを完結（Profile画面から遷移させない）
- `Beta版` バッジはvariantで制御

### 開発連携フラグ（Live配信設定フロー）
```
hasMembership: boolean
isAvatarMemberOnly: boolean
avatarCount: number（2未満でNot Enough Avatars）
```

---

## 6. Notification

### 画面タイプ
Header + Scroll。BottomNav Float。

### Notification Card variantプロパティ（確定）
```
Type: Activity-SingleFollower / multiFollow / avatarFavorite / multiAvatarFavorite /
      comment / multiComment / like / multiLike / featuredEvent / trendingAvatar /
      recommendedAvatar / recommendedUser / fastGrowingUser / topConversation /
      tierExpiringSoon / tierExpired
Language: EN / JP
State: Read / Unread
```
合計62バリアント。

### variantフラグ
```
notificationType: singleFollow / multiFollow / avatarFavorite / comment / like / 
                  featuredEvent / trendingAvatar / recommendedAvatar / tierExpiringSoon / ...
notificationState: read / unread
userCount: number
displayMode: single / multi / aggregated（3名以上）
dateGroup: today / yesterday / last7days / last30days / earlier
```

### 設計上の重要ポイント
- 3名以上は「他が〜」と集約 → タップでBottom Sheetにユーザーリスト表示
- 未読は背景色で表示（タップまたは3秒後に自動解除）
- Date headerは5段階（today / yesterday / last7days / last30days / earlier）
- iOSバージョンによってUIが微妙に異なる（要確認）

---

## 7. Avatar Create フロー（参考・チェックのみ）

### 構成（3ステップ）
```
Step1: UPLOAD PHOTO → Step2: PROMPT → Step3: VOICE
```

### チェック結果
- variantで状態管理 ✅
- CTAボタンがStatusを持つ ✅（Continue / Next が入力状態で活性化）
- SURPRISE ME / AI自動入力で設計哲学「設定を体験に」を実践 ✅

### 要確認
- エラー表示がDialog / インライン混在していないか（master.md §4.3 適用確認）
- Voice系エラーに共通化できる種別がないか

### エラーvariantフラグ
```
uploadError: wrongFormat / invalidImage / fileTooLarge
voiceError: noSpeech / fileTooLarge / invalidFile / languageMismatch / wrongDuration / error
permission: photoLibraryDenied / photoLibraryNotDetermined
credit: noCredit
```

---

## 8. Studio / Outfit（参考・チェックのみ）

### チェック結果
- CTAボタンがStatusを持つ ✅
- Dialog vs Bottom Sheet: master.md §4.3 準拠 ✅

### 問題点（MUST）
- スクリーン名がルール違反（`iPhone 16 Pro - 204` など）
- 正しい命名例: `Studio / Outfit / Default` / `Studio / Outfit / Generating` / `Studio / Outfit / Error / WrongFormat`

---

## 9. Customize

### 画面タイプ
フルスクリーン + 下部タブ（OUTFIT / PROMPT / VOICE）。

### 構造上の注意点
- Avatar TOPの横スワイプに統合できていない（現状の技術的制約 — 推察）
- 原因: componentが固定サイズ・分離不可能な構造で作られている可能性（推察・要確認）
- 改修時は「将来的に横スワイプに統合できる構造」を想定して設計すること
- 各タブ（Outfit / Prompt / Voice）を独立した小さなcomponent・可変サイズで設計すれば統合可能なはず

### 設計哲学との関係
- 「画面遷移ではなく空間移動として設計する」（理想形）に現状は未達
- 改修時はこの理想形に近づける構造を意識する

---

## 横断的な設計パターン（全画面共通）

### 差分吸収の3手段
| 手段 | 使う場面 |
|------|---------|
| variant | 状態・言語・ユーザー種別による見た目の差分 |
| visibility制御 | タブ切り替え・スコープアウト・条件表示 |
| Prototype | ユーザー操作によるインタラクティブな状態変化 |

### Self / Other パターン（全画面で一貫）
- Profile → `userHeader` の `userType` variantで吸収
- Home feed → `Avatar Card` の `User` variantで吸収
- Avatar TOP → `User` variantで編集系UIをvisibility制御

### CTAボタンがStatusを持つパターン
- `exclusiveContentManage CTA Status`（idle / pending / approved）
- `avatarStatus`（public / private / generating...）
- `Continue / Next ボタン`（入力完了で活性化）

### スコープアウト・旧デザインの扱い
- 過渡期はvariantで非表示（`State=Old` / `Beta版バッジ`）
- 正式リリース・実装完了後にvariantを削除
- 別componentとして作成するとメンテナンスコストが発生するためvariantで統合する