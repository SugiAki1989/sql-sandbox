import re

ERROR_MAP = [
    {
        "pattern": re.compile(r"no such table: (\w+)", re.IGNORECASE),
        "hint": lambda m: f"テーブル「{m.group(1)}」が見つかりません。画面右側の Tables タブでテーブル名を確認してください。",
    },
    {
        "pattern": re.compile(r"table (\w+) has no column named (\w+)", re.IGNORECASE),
        "hint": lambda m: f"テーブル「{m.group(1)}」にカラム「{m.group(2)}」は存在しません。カラム名を確認してください。",
    },
    {
        "pattern": re.compile(r"no such column: (\w+)", re.IGNORECASE),
        "hint": lambda m: f"カラム「{m.group(1)}」が見つかりません。カラム名のスペルをチェックしてください。",
    },
    {
        "pattern": re.compile(r"syntax error near \"?(\w+)\"?", re.IGNORECASE),
        "hint": lambda m: f"文法エラーが「{m.group(1)}」付近で起きています。SQL 構文（SELECT, WHERE, FROM, JOIN など）を再度確認してください。",
    },
    {
        "pattern": re.compile(r"near \"([^\"]+)\": syntax error", re.IGNORECASE),
        "hint": lambda m: f"「{m.group(1)}」付近で構文エラーです。SQL文の直前・直後を確認してください。",
    },
    {
        "pattern": re.compile(r"malformed\s+SQL", re.IGNORECASE),
        "hint": lambda m: "SQL文の構文が正しくありません。カンマや括弧、キーワードの抜け漏れがないか確認してください。",
    },
    {
        "pattern": re.compile(r"database is locked", re.IGNORECASE),
        "hint": lambda m: "データベースがロックされています。しばらく待ってから再実行してください。",
    },
    {
        "pattern": re.compile(r"no such function: (\w+)", re.IGNORECASE),
        "hint": lambda m: f"関数「{m.group(1)}」は存在しません。スペルやサポートされている関数か確認してください。",
    },
    {
        "pattern": re.compile(r"misuse of aggregate", re.IGNORECASE),
        "hint": lambda m: "集約関数（SUM, COUNT など）の使い方に誤りがあります。GROUP BY句や集約関数の使い方を確認してください。",
    },
    {
        "pattern": re.compile(r"UNIQUE constraint failed: (\w+)\.(\w+)", re.IGNORECASE),
        "hint": lambda m: f"一意制約(UNIQUE) エラー：テーブル「{m.group(1)}」のカラム「{m.group(2)}」で重複する値が挿入されています。重複を避けてください。",
    },
    {
        "pattern": re.compile(r"UNIQUE constraint failed", re.IGNORECASE),
        "hint": lambda m: "一意制約(UNIQUE)エラーです。重複する値が挿入されています。",
    },
    {
        "pattern": re.compile(
            r"NOT NULL constraint failed: (\w+)\.(\w+)", re.IGNORECASE
        ),
        "hint": lambda m: f"テーブル「{m.group(1)}」のカラム「{m.group(2)}」はNULLを許容しません。値を必ず指定してください。",
    },
    {
        "pattern": re.compile(r"FOREIGN KEY constraint failed", re.IGNORECASE),
        "hint": lambda m: "外部キー制約違反です。参照元／参照先テーブルのデータ整合性を確認してください。",
    },
    {
        "pattern": re.compile(r"datatype mismatch", re.IGNORECASE),
        "hint": lambda m: "データ型の不一致です。数値系カラムに文字列を挿入しようとしていないか、または型キャストを確認してください。",
    },
    {
        "pattern": re.compile(r"ambiguous column name: (\w+)", re.IGNORECASE),
        "hint": lambda m: f"カラム「{m.group(1)}」が複数のテーブルに存在するためあいまいです。テーブル名をプレフィックスとして指定してください。例：`users.{m.group(1)}`。",
    },
    {
        "pattern": re.compile(r"too many SQL variables", re.IGNORECASE),
        "hint": lambda m: "変数（? プレースホルダ）が多すぎます。クエリを分割するか、バッチサイズを小さくしてください。",
    },
    {
        "pattern": re.compile(r"division by zero", re.IGNORECASE),
        "hint": lambda m: "ゼロ除算エラーです。計算式中に 0 で除算しようとしていないか確認してください。",
    },
]
