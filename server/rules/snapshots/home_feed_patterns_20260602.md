# Home Feed — 設計構造パターン
> feed表示するデザインの設計構造。個別Avatarの状態説明ではない。

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-06-02 |
| ステータス | Snapshot（更新しない） |
| 参照元Figma | Sandbox-Profile-test_20260601 / node-id: 53022-20455 |

---

## ⚠️ このドキュメントについて

- これはfeed表示するデザインの設計構造であって、個別Avatarの状態説明ではない
- 2026-06-02時点のスナップショット。**Figmaデザインが正**
- Figmaで一次データを確認し、自分またはAIに分解させる手間を惜しまないこと
- このmdはFigmaデザインの代替ではない

---

## 1. 画面の基本構造

```
Home（screen W402 × H874）
├── Container（縦スクロール）
│   └── Contents（5パターンが縦に積み上げ）
│       ├── Avatar Card / Self Normal
│       ├── Avatar Card / Other Normal
│       ├── Exclusive Content Avatar / R1 CarouselContainer
│       ├── HomeFeed LiveStream
│       └── R2 AvatarBlurCard
├── Footer（float・高さに影響しない）
│   └── navigation_liquid（BottomNav h:102px）
└── Header（Transparent・headMenu=false）
```

**スクロール・スワイプはスナップ（1枚単位で切り替わる）**
スナップの実装は要件定義でカバーすべき事項。

---

## 2. 共通ルール

**カードサイズ**
全パターン共通：W402 × H874（画面全体）

**情報エリアの位置**
全パターン共通：`bottom: 132px`（BottomNav 102px + 余白 30px）

**なぜ下詰めか**
主役はAvatarの顔。情報を上に置くと顔に被る。下詰めにすることでAvatarを邪魔しない。親指の操作範囲（画面下部）とも一致する。

---

## 3. パターン別構造

---

### Pattern 1 — Avatar Card / Self Normal

**いつ使うか**
ログインユーザー自身のAvatarをフィードに表示する時。

**他パターンとの関係**
SelfとOtherは同じ構造。`creator-name-follow` の `type` で権限を切り替えるだけ。別カードにしない。

**レイヤー構造**

```
Avatar Card / Self Normal（h:874px）
├── Avatar image（フルスクリーン背景）
│   ├── Background（グラデーション）
│   └── shadow（下部グラデーション h:382px top:492px）
├── Sound toggle（絶対位置 left:26px top:122px）
├── LiveBadge for Home AvatarCard（絶対位置 X:254.73 Y:109）
│   → Live配信中のAvatarCardに表示
│   → 非表示時はvisibility=false
└── information（絶対位置 bottom:132px px:20px 下詰め）
    ├── Avatar infomation
    │   ├── Hash（ハッシュタグ）
    │   └── Avatar Profile Header
    │       ├── ExclusiveContentBadge（AvatarCardインスタンスのBoolean）
    │       │   → True: 表示（限定バッジ）/ False: 非表示
    │       │   → Variant（Lock/Unlock）の細かい設定はしていない
    │       ├── MainSection
    │       │   ├── Name(アバター名 w:281px）
    │       │   └── buttonCall（size:48px）
    │       └── ActionEngagement（gap:24px）
    │           ├── BookmarkButton
    │           └── Share
    └── creator-name-follow（type: Self Home）
```

**設計意図**
タップでZoom表示 → UIが消えてAvatarだけになる逃げ道がある。情報量が増えてAvatarに被っても視聴者はZoomで回避できる。

---

### Pattern 2 — Avatar Card / Other Normal

**いつ使うか**
他ユーザーのAvatarをフィードに表示する時。

**他パターンとの関係**
Pattern 1（Self）と同じ構造。`creator-name-follow` の `type: other` に変えるだけ。フォローボタン（followSettings）が追加される。

**レイヤー構造**

```
Avatar Card / Other Normal（h:874px）
├── Avatar image（フルスクリーン背景）
│   ├── Background（グラデーション）
│   └── shadow（下部グラデーション）
├── Sound toggle（絶対位置 left:26px top:122px）
├── LiveBadge for Home AvatarCard（絶対位置 X:254.73 Y:109）
│   → Live配信中のAvatarCardに表示
│   → 非表示時はvisibility=false
└── information（絶対位置 bottom:132px px:20px 下詰め）
    ├── Avatar infomation
    │   ├── Hash（ハッシュタグ）
    │   └── Avatar Profile Header
    │       ├── ExclusiveContentBadge（AvatarCardインスタンスのBoolean）
    │       │   → True: 表示（限定バッジ）/ False: 非表示
    │       │   → Variant（Lock/Unlock）の細かい設定はしていない
    │       ├── MainSection
    │       │   ├── Name（アバター名 w:281px）
    │       │   └── buttonCall（size:48px）
    │       └── ActionEngagement（gap:24px）
    │           ├── BookmarkButton
    │           └── Share
    └── creator-name-follow（type: other）
        ├── Creator info（max-w:234px 半透明Pill）
        │   ├── user（UserIcon + ユーザー名）
        │   └── follower（Follower数）
        └── followSettings（Follow / Following）
```

**設計意図**
SelfとOtherで画面を分けない。同じ構造・異なる権限。Selfは編集者、Otherは観客。

---

### Pattern 3 — Exclusive Content Avatar / R1 CarouselContainer

**いつ使うか**
Creatorが限定コンテンツを運営中 かつ 閲覧ユーザーが未購入の時。R1（Promotion）を横スワイプで見せる。

**他パターンとの関係**
AvatarCard（Pattern 2と同じ構造）+ FeedCarousel_Rail が横に並ぶ。合計幅はW402（画面幅と同じ）。横スワイプでRailに切り替わる。

**レイヤー構造**

```
Exclusive Content Avatar / R1 CarouselContainer（w:402px）
├── Avatar Card（w:402px）← Pattern 2と同じ構造
│   ├── （Avatar Card内省略）
│   └── AvatarCardIndicatorSection（絶対位置 bottom:107px）
│       ├── AvatarCardIndicator（ON）
│       └── AvatarCardIndicator（OFF）
└── FeedCarousel_Rail（w:402px）← 横スワイプで表示
    ├── EdgeRecommendationCard（フルスクリーン）
    │   ├── Background（blur:25px 半透明）
    │   ├── R1PromotionMessage（language: JP）
    │   │   ├── UserNameIcon（CreatorアイコンとCreator名）
    │   │   ├── LockText（限定コンテンツ訴求テキスト）
    │   │   └── ctaButton（「チェックする」Teal）
    │   └── PR-StackingCards_Video（積み上げカードアニメーション）
    └── AvatarCardIndicatorSection（絶対位置 bottom:107px）
        ├── AvatarCardIndicator（OFF）
        └── AvatarCardIndicator（ON）
```

**設計意図**
横スワイプで複数Avatarの存在を見せて解放（購入）を促す。縦スクロール（Creator間移動）と横スワイプ（Promotion表示）で動線を分離する。

---

### Pattern 4 — HomeFeed LiveStream

**いつ使うか**
Live配信中のAvatarをフィードに表示する時。Avatarではなく「配信というイベント」を見せる。

**他パターンとの関係**
通常カード（Pattern 1/2）と異なり、タイトルが上部に来る。情報順序が「何か（配信内容）→ 誰か（Creator）」。

**レイヤー構造**

```
HomeFeed LiveStream（h:874px）
├── Background（NeonBar画像 ステージと連動）
├── Container（pt:102px px:26px）
│   ├── Title（配信タイトル画像 + SubTitle）
│   └── Cast（h:244px）
│       ├── Host（左半分 flex:1）
│       └── Guest（右半分 flex:1）
├── StreamInformation（絶対位置 top:596px px:20px）
│   ├── New（星アイコン + テキスト）
│   └── LiveStreamingButton
├── CreatorInformation（絶対位置 bottom:132px 下詰め）
│   ├── ExclusiveContentBadge（Lock / Unlock）
│   └── creator-name-follow
│       ├── Creator info（半透明Pill）
│       └── followSettings
└── Sound toggle（絶対位置 left:20px top:192px）
```

**設計意図**
Host + Guest 2分割構造は配信の性質（対談・会話）をそのまま画面構造に反映。背景はステージ選択と連動し「設定を体験にする」Twomi設計哲学の実践。

---

### Pattern 5 — R2 AvatarBlurCard

**いつ使うか**
Creatorが限定コンテンツを運営中 かつ 閲覧ユーザーが未購入の時。R1とは異なるPromotion手法。Avatar映像をblurでLocked状態を表現しCTAに集中させる。

**他パターンとの関係**
Pattern 3（R1）と目的は同じ（解放を促す）が手法が異なる。R1は横スワイプで存在を見せる。R2はblurでCTAに集中させる。

**レイヤー構造**

```
R2 AvatarBlurCard（h:874px）
├── Avatar image（blur:5px Locked状態を表現）
│   ├── Background（グラデーション）
│   ├── image/other-userSetVideo（blur:5px）
│   └── Exclude（マスクレイヤー mix-blend-multiply）
├── ExclusiveContentInformation（絶対位置 bottom:132px px:20px）
│   └── creator-name-follow（type: other）
└── R2PromotionMessage（絶対位置 bottom:208px 中央）
    ├── UserNameIcon（CreatorアイコンとCreator名）
    ├── LockText（限定コンテンツ訴求テキスト）
    └── ctaButton（「チェックする」半透明）
        └── h:55px（ルール策定前の既存値を踏襲）
```

**設計意図**
「存在するが見えない」状態をblur + Excludeマスクで表現。この画面の唯一のアクションがCTAのため中央配置。通常カードと同じフルスクリーン構造をvariantで吸収。

---

## 4. スペーシング早見表

| 場所 | 値 | 用途 |
|------|-----|------|
| information bottom | 132px | 全パターン共通・BottomNav考慮 |
| information px | 20px | 全パターン共通・optical値 |
| AvatarCardIndicatorSection bottom | 107px | R1のみ・BottomNavとのgap |
| R2PromotionMessage bottom | 208px | R2のみ・情報エリアより上 |
| ActionEngagement gap | 24px | タップ領域確保のため意図的に広め |
| Shadow top | 492px | 下部グラデーション開始位置 |
| Shadow h | 382px | 下部グラデーション高さ |
