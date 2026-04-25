# 介護記録テンプレート

介護記録テンプレートは、日々の食事・水分量・服薬・排泄・体温・メモをブラウザ上で記録できる無料のWebアプリです。

## 公開URL

https://yuno-lab.github.io/care-record-app/

※ GitHubユーザー名やリポジトリ構成が異なる場合は、実際のGitHub PagesのURLに置き換えてください。

## 主な機能

- 対象者名の登録・管理
- 介護記録の保存
- 保存済み記録の編集・削除
- 対象者名・日付による絞り込み
- 新しい順 / 古い順の並び替え
- JSON形式でのバックアップ
- JSON形式でのインポート
- CSV形式でのエクスポート
- 印刷用レイアウト
- 使い方ページ

## 記録できる項目

- 日付
- 対象者名
- 食事
- 水分量
- 服薬
- 排泄
- 体温
- メモ

## データ保存について

このアプリは、入力データをサーバーに送信しません。  
保存済み記録と対象者名一覧は、利用中のブラウザの localStorage に保存されます。

そのため、同じ端末・同じブラウザでは再読み込み後も記録が残りますが、別端末や別ブラウザでは共有されません。  
ブラウザデータを削除すると記録が消える可能性があるため、定期的にJSONでバックアップすることをおすすめします。

## 注意事項

このアプリは、日々の介護記録を補助するためのテンプレートです。  
医療判断、診断、治療方針の決定を目的としたものではありません。  
体調不良、異常値、緊急時には医療機関や専門職へ相談してください。

## SEO対応

以下のファイルを含めています。

- `help.html`
- `robots.txt`
- `sitemap.xml`
- title / meta description 設定済み

Search Console を使う場合は、Google Search ConsoleでURLプレフィックスプロパティを追加し、HTMLタグ認証で発行されたmetaタグを `index.html` の `<head>` 内に貼り付けてください。

## ファイル構成

```text
index.html
names.html
help.html
style.css
script.js
names.js
robots.txt
sitemap.xml
README.md
care-record-favicon.svg
project-docs/
```
