from flask import Flask, render_template, request, jsonify
import os, time
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool
import pandas as pd
import sqlparse  # pip install sqlparse
from pathlib import Path

# ── 0. 定数・初期設定 ─────────────────────────────────

# 禁止したいコマンド一覧
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

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "workspace.sqlite"

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    future=True,
    poolclass=StaticPool,
    connect_args={"check_same_thread": False},
)

CSV_TABLES = {
    "orders": DATA_DIR / "orders.csv",
    "users": DATA_DIR / "users.csv",
    "items": DATA_DIR / "items.csv",
    "weblog": DATA_DIR / "weblog.csv",
}

app = Flask(__name__)


# ── 1. DB 初期化関数 ─────────────────────────────────
def reset_db():
    # 1) 既存の SQLite ファイルを削除する
    if DB_PATH.exists():
        DB_PATH.unlink()

    engine = create_engine(
        f"sqlite:///{DB_PATH}",
        future=True,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )

    for table_name, csv_path in CSV_TABLES.items():
        df = pd.read_csv(csv_path)
        df.to_sql(table_name, engine, index=False)  # デフォルトの if_exists='fail'
    print("DB has been completely reloaded from CSV.")


# 起動時に初期化が必要な場合
if not DB_PATH.exists() or DB_PATH.stat().st_size == 0:
    reset_db()


# ── 2. ルーティング ─────────────────────────────────
@app.route("/")
def index():
    # ページリロードで毎回初期化したい場合
    reset_db()
    return render_template("index.html")


@app.route("/execute", methods=["POST"])
def execute_sql():
    raw_sql = request.json.get("sql", "")
    # ステートメントに分割（セミコロンで区切る）
    statements = [s.strip() for s in sqlparse.split(raw_sql) if s.strip()]
    if not statements:
        return jsonify({"error": "SQL が空です"}), 400

    # --- ① 禁止コマンドチェック ---

    for stmt in statements:
        # ステートメントをパースして先頭トークンを取得
        parsed_stmt = sqlparse.parse(stmt)[0]
        first_token = parsed_stmt.token_first(skip_cm=True)  # Token オブジェクトが返る
        if first_token is None:
            # 何もトークンが取れなかった場合は空文とみなして次へ
            continue

        first_keyword = first_token.value.upper()

        # もし禁止コマンドに含まれていたらエラーを返して終了
        if first_keyword in FORBIDDEN_COMMANDS:
            return (
                jsonify({"error": f'"{first_keyword}" Command not allowed'}),
                400,
            )

    # --- ② 通常の SQL 実行処理 ---
    results = []
    try:
        with engine.begin() as conn:
            for stmt in statements:
                res = conn.execute(text(stmt))
                if res.returns_rows:
                    df = pd.DataFrame(res.fetchall(), columns=res.keys())
                    results.append(
                        {
                            "type": "select",
                            "columns": df.columns.tolist(),
                            "rows": df.astype(str).values.tolist(),
                        }
                    )
                else:
                    results.append(
                        {
                            "type": "dml",
                            "msg": f"{res.rowcount} row affected ({stmt[:40]} …)",
                        }
                    )
        return jsonify({"results": results})

    except Exception as e:
        # SQLite のエラーや構文エラーをクライアントに返す
        return jsonify({"error": str(e)}), 400


# ── 3. リセット用 API ─────────────────────────────────
@app.route("/api/reset", methods=["POST"])
def api_reset():
    reset_db()
    return {"msg": "database has been reloaded from CSV"}


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)
