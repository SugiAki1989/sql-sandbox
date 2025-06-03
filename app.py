from flask import Flask, render_template, request, jsonify
import os
from pathlib import Path
import sqlite3
import csv
import sqlparse  # pip install sqlparse
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool
from error_map import ERROR_MAP
import json  # 追加

# ── 0. 環境判定 ────────────────────────────────────────
VERCEL_ENV = os.environ.get("VERCEL", "").lower()
IS_VERCEL = VERCEL_ENV in ("1", "true", "True")

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"

# Vercel 上では /tmp に SQLite ファイルを置く
if IS_VERCEL:
    DB_PATH = Path("/tmp/workspace.sqlite")
else:
    DB_PATH = DATA_DIR / "workspace.sqlite"


# ── 1. SQLAlchemy Engine をグローバルに１つだけ作成 ────────────────────
engine = create_engine(
    f"sqlite:///{DB_PATH}",
    future=True,
    poolclass=StaticPool,
    connect_args={"check_same_thread": False},
)


# ── 2. CSV → SQLite テーブル省略（標準ライブラリ版例） ───────────────────

CSV_TABLES = {
    "orders": DATA_DIR / "orders.csv",
    "users": DATA_DIR / "users.csv",
    "items": DATA_DIR / "items.csv",
    "weblog": DATA_DIR / "weblog.csv",
}

# テーブル定義ファイルのパス
TABLE_DEFINITION_PATH = DATA_DIR / "table_definitions.json"


def load_table_definitions():
    with open(TABLE_DEFINITION_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def reset_db():
    """
    CSV から SQLite ファイルを (再)生成する関数。
    Vercel 上では /tmp/workspace.sqlite に作るので、書き込みに失敗しない。
    """
    # 1) 既存の SQLite ファイルを削除
    if DB_PATH.exists():
        DB_PATH.unlink()

    # 2) sqlite3 を使って CSV からテーブルを作成
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # テーブル定義を読み込む
    table_definitions = load_table_definitions()

    for table_name, csv_path in CSV_TABLES.items():
        with open(csv_path, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            headers = next(reader)  # ex: ["user_id", "purchase_ts", ...]

            # JSONからカラム定義を取得
            columns_def = ", ".join(
                f'"{h}" {table_definitions[table_name][h]}' for h in headers
            )
            create_sql = f'CREATE TABLE "{table_name}" ({columns_def});'
            cur.execute(create_sql)

            # INSERT 文を作成
            placeholders = ", ".join("?" for _ in headers)
            insert_sql = f'INSERT INTO "{table_name}" ({",".join(headers)}) VALUES ({placeholders});'
            for row in reader:
                cur.execute(insert_sql, row)

    conn.commit()
    conn.close()
    print("DB has been completely reloaded from CSV (path:", DB_PATH, ")")


# ── 3. Flask アプリ本体 ───────────────────────────────────
app = Flask(__name__, static_folder="public/static", static_url_path="/static")

# 起動（Cold Start）時に一度だけ初期化を行う
reset_db()


@app.route("/")
def index():
    # トップページを開くたびに再初期化したい場合はここに reset_db() を呼ぶ
    return render_template("index.html")


# 禁止キーワードリスト（先頭キーワードでチェックする例）
FORBIDDEN_COMMANDS = {
    "DROP",
    "CREATE",
    "INSERT",
    "UPDATE",
    "DELETE",
    "ALTER",
    "TRUNCATE",
    "GRANT",
    "REVOKE",
    "COMMIT",
    "ROLLBACK",
    "BEGIN",
    "SET",
}


@app.route("/execute", methods=["POST"])
def execute_sql():
    # JSON かどうかチェック
    if not request.is_json:
        return jsonify({"error": "リクエストは JSON 形式で送ってください"}), 400

    data = request.get_json(silent=True)
    if data is None or "sql" not in data:
        return jsonify({"error": "`sql` キーが指定されていません"}), 400

    raw_sql = data["sql"].strip()
    if not raw_sql:
        return jsonify({"error": "SQL が空です"}), 400

    # セミコロン区切りで文ごとに分割
    statements = [s.strip() for s in sqlparse.split(raw_sql) if s.strip()]
    if not statements:
        return jsonify({"error": "有効な SQL 文が検出できませんでした"}), 400

    # ① 禁止キーワードチェック
    for stmt in statements:
        parsed = sqlparse.parse(stmt)[0]
        first_token = parsed.token_first(skip_cm=True)
        if first_token:
            first_kw = first_token.value.upper()
            if first_kw in FORBIDDEN_COMMANDS:
                return (
                    jsonify({"error": f'"{first_kw}" コマンドは禁止されています'}),
                    400,
                )

    # ② sqlite3 で実行して結果を JSON 化
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        results = []
        for stmt in statements:
            cur.execute(stmt)
            if cur.description:
                # SELECT の場合
                columns = [d[0] for d in cur.description]
                rows = cur.fetchall()
                results.append(
                    {
                        "type": "select",
                        "columns": columns,
                        "rows": [list(map(str, r)) for r in rows],
                    }
                )
            else:
                # DML・DDL の場合
                results.append(
                    {
                        "type": "dml",
                        "msg": f"{cur.rowcount} row affected ({stmt[:40]}…)",
                    }
                )
        conn.commit()
        conn.close()
        return jsonify({"results": results})
    except Exception as e:
        error_message = str(e)
        hint = None
        for err in ERROR_MAP:
            m = err["pattern"].search(error_message)
            if m:
                hint = err["hint"](m)
                break
        if hint:
            return jsonify({"error": error_message, "hint": hint}), 400
        else:
            return jsonify({"error": error_message}), 400


@app.route("/api/reset", methods=["POST"])
def api_reset():
    reset_db()
    return {"msg": "database has been reloaded from CSV"}


@app.route("/api/schema")
def api_schema():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    tables = []
    for (tbl,) in cur.execute("SELECT name FROM sqlite_master WHERE type='table'"):
        cols = [row[1] for row in cur.execute(f"PRAGMA table_info('{tbl}')")]
        tables.append({"name": tbl, "columns": cols})
    conn.close()
    return jsonify({"tables": tables})


if __name__ == "__main__":
    # ローカル開発時にのみ Flask 開発サーバーを起動
    app.run(debug=True, host="0.0.0.0", port=8000)
