# app.py
from flask import Flask, render_template, request, jsonify
import os, time
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool
import pandas as pd
import sqlparse  # pip install sqlparse
from pathlib import Path

# ── 0-a. JST 化 ─────────────────────────────
os.environ["TZ"] = "Asia/Tokyo"
try:
    time.tzset()
except AttributeError:
    pass

app = Flask(__name__)

# Base directory for data files (CSVs)
DATA_DIR = Path(__file__).parent / "data"

# ── 0. DB エンジン ───────────────────────────────────────────
#    初回起動時にのみ CSV → DB を生成し、以降はファイルを reuse
IS_VERCEL = os.environ.get("VERCEL") == "1"

if IS_VERCEL:
    # Use /tmp for SQLite DB on Vercel (writable, but ephemeral per instance)
    DB_PATH = Path("/tmp") / "workspace.sqlite"
else:
    # Local development path
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

# ── 1. 初期データ読み込み関数 ────────────────────────────────


def reset_db():
    """DB をまっさらにして CSV からロードし直す"""
    with engine.begin() as conn:
        for tbl in CSV_TABLES:
            conn.exec_driver_sql(f"DROP TABLE IF EXISTS {tbl}")
        for tbl, csv_path in CSV_TABLES.items():
            pd.read_csv(csv_path).to_sql(tbl, conn, index=False)
    print("DB reloaded")


# ── 1. 起動時に一度だけロード ──────────────────────────────
if not DB_PATH.exists() or DB_PATH.stat().st_size == 0:
    reset_db()  # 初回だけ CSV → SQLite


# ── 2. ルーティング ───────────────────────────────────────
# 必要なときだけ呼べるリセット用 API
@app.route("/api/reset", methods=["POST"])
def api_reset():
    reset_db()
    return {"msg": "database has been reloaded from CSV"}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/execute", methods=["POST"])
def execute_sql():
    raw_sql = request.json.get("sql", "")
    statements = [s.strip() for s in sqlparse.split(raw_sql) if s.strip()]
    if not statements:
        return jsonify({"error": "SQL が空です"}), 400

    results = []
    try:
        with engine.begin() as conn:  # 1 トランザクション
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
                        {"type": "dml", "msg": f"{res.rowcount} 行影響 ({stmt[:40]} …)"}
                    )
        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)
