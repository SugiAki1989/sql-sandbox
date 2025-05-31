# sql-sandbox

App URL: https://sql-sandbox.vercel.app/

![SQL Sandbox](https://raw.githubusercontent.com/SugiAki1989/sql-sandbox/refs/heads/main/SQL%20Sandbox.png)

※ For an explanation of the English version, see end of this document.

## 概要
SQL Sandboxは、ブラウザ上で手軽にSQL(SQLite)を学習・実行できるWebアプリケーションです。
ECサイトのデータベースのテーブルを模したサンプルデータを利用して、SQLクエリを入力してその結果を確認できます。

## 使い方
1. 画面右端のサイドバーからテーブル内容を確認できます(タブでテーブルの内容を切り替え可能)。
2. 画面左端のエディタ部分にSQLクエリを入力し、RUNボタンを押して実行します。
3. 画面中央にSQLクエリの結果テーブルが表示されます。

## 主な機能
- クエリ実行（`SELECT`）
  - エディタにSQLクエリを入力し、RUNボタンを押すとで実行できます(Ctrl/Cmd + Enter)。
  - 結果はテーブル形式で返却し、列名と行データを見やすく表示します。
  - 複数のSQLも順次実行して結果をまとめて表示します。
  - データベースの構造やデータを更新、削除するコマンドは利用できません。

## 問題点
ローカル環境では問題が発生しない一方で、vercel環境だと、jsの読み込みタイミングが変わってしまうため、アプリが上手く動かない。
そして、修正できるほどの知識と技術が足りておらず、.htmlにjsを記述せざるを負えない状態。

## Overview.
SQL Sandbox is a web application that allows you to learn and execute SQL (SQLite) easily in your browser.
Using sample data that mimic the database tables of an e-commerce site, you can enter SQL queries and check the results.

## How to use.
1. the table contents can be viewed from the sidebar on the right-hand side of the screen (the table contents can be switched using tabs). 
2. Enter your SQL query in the editor section on the left-hand side of the screen and press the RUN button to execute it. 
3. The result table of the SQL query is displayed in the centre of the screen.

## Main functions.
- Query execution (`SELECT`)
  - Enter the SQL query in the editor and press RUN to execute it (Ctrl/Cmd + Enter).
  - The results are returned in table format, with column names and row data displayed for easy viewing.
  - Multiple SQLs can also be executed sequentially and the results are displayed together.
  - Commands to update or delete database structure or data are not available.