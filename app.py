from flask import Flask, render_template, request, jsonify
from error_map import ERROR_MAP
from db_utils import reset_db, get_schema, DB_PATH
import sqlparse
import sqlite3

# ── Flask アプリ本体 ─────────────────────────────
app = Flask(__name__, static_folder="public/static", static_url_path="/static")

# 起動（Cold Start）時に一度だけ初期化を行う
reset_db()


@app.route("/")
def index():
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
    if not request.is_json:
        return jsonify({"error": "リクエストは JSON 形式で送ってください"}), 400
    data = request.get_json(silent=True)
    if data is None or "sql" not in data:
        return jsonify({"error": "`sql` キーが指定されていません"}), 400
    raw_sql = data["sql"].strip()
    if not raw_sql:
        return jsonify({"error": "SQL が空です"}), 400
    statements = [s.strip() for s in sqlparse.split(raw_sql) if s.strip()]
    if not statements:
        return jsonify({"error": "有効な SQL 文が検出できませんでした"}), 400
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
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        results = []
        for stmt in statements:
            cur.execute(stmt)
            if cur.description:
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
    tables = get_schema()
    return jsonify({"tables": tables})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)
