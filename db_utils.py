import os
from pathlib import Path
import sqlite3
import csv
import json

# ── 設定 ─────────────────────────────
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"

VERCEL_ENV = os.environ.get("VERCEL", "").lower()
IS_VERCEL = VERCEL_ENV in ("1", "true", "True")

if IS_VERCEL:
    DB_PATH = Path("/tmp/workspace.sqlite")
else:
    DB_PATH = DATA_DIR / "workspace.sqlite"

CSV_TABLES = {
    "orders": DATA_DIR / "orders.csv",
    "users": DATA_DIR / "users.csv",
    "items": DATA_DIR / "items.csv",
    "weblog": DATA_DIR / "weblog.csv",
}

TABLE_DEFINITION_PATH = DATA_DIR / "table_definitions.json"


def load_table_definitions():
    """
    テーブル定義（カラム型情報）をJSONから読み込む
    """
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


def get_schema():
    """
    DBのテーブル・カラム情報を取得
    """
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    tables = []
    for (tbl,) in cur.execute("SELECT name FROM sqlite_master WHERE type='table'"):
        cols = [row[1] for row in cur.execute(f"PRAGMA table_info('{tbl}')")]
        tables.append({"name": tbl, "columns": cols})
    conn.close()
    return tables


# DB_PATH, reset_db, load_table_definitions, get_schema を外部から利用可能に
