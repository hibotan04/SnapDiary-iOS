# Snap Diary - 写真カレンダー日記

1日1枚の写真と短い日記をカレンダーに表示します。写真と日記は端末内に保存します。

[App Storeで見る](https://apps.apple.com/jp/app/id6759642632)

## 技術構成

TypeScript、React Native、Expo。ジェスチャーと写真の切り抜きにはGesture HandlerとReanimatedを使用しています。

## 実装

- [src/hooks/useDiaryData.ts](src/hooks/useDiaryData.ts)
- [src/components/ImageCropper.tsx](src/components/ImageCropper.tsx)

## 開発環境での起動

iOSのビルドにはmacOS、Xcode、CocoaPodsを使用します。

```sh
npm ci --legacy-peer-deps
npx expo run:ios
```

このリポジトリは開発版のソースをポートフォリオ用に整理したものです。
