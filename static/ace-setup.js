document.addEventListener('DOMContentLoaded', function() {
  window.editor = ace.edit("editor", {
    mode: "ace/mode/sql",
    theme: "ace/theme/textmate",
    fontSize: 14,
    showPrintMargin: false, 
    highlightActiveLine: true,
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    enableSnippets: true
  });
  editor.setValue("-- Query #1\nWITH order_gender AS (\nSELECT\n    o.user_id\n  , CASE WHEN gender IS '' THEN -99 ELSE gender END AS gender\n  , purchase_ts\n  , purchase_id\n  , quantity\n  , price\nFROM orders AS o\nLEFT JOIN users AS u\nON o.user_id = u.user_id\n)\nSELECT * FROM order_gender LIMIT 10;\n\n-- Query #2\nWITH order_gender AS (\nSELECT\n    o.user_id\n  , CASE WHEN gender IS '' THEN -99 ELSE gender END AS gender\n  , purchase_ts\n  , purchase_id\n  , quantity\n  , price\nFROM orders AS o\nLEFT JOIN users AS u\nON o.user_id = u.user_id\n)\nSELECT\n    gender\n  , COUNT(DISTINCT purchase_id) AS purchase_num\n  , SUM(price*quantity) AS total_price\nFROM\n    order_gender\nGROUP BY\n    gender\nORDER BY\n    gender ASC\n;", 1);


// --- ① SQLite キーワード ---
// --- 分析・可視化まで視野に入れた SQLite キーワード＆関数 ---
const SQLITE_KEYWORDS = [
  /*── 基本句 ──*/
  "SELECT","FROM","WHERE","GROUP BY","HAVING","ORDER BY","PARTITION BY", "OVER",
  "LIMIT","OFFSET","INSERT","UPDATE","DELETE",
  "WITH","RECURSIVE",
  "UNION","UNION ALL","EXCEPT","INTERSECT",
  "JOIN","INNER JOIN","LEFT JOIN","CROSS JOIN","NATURAL JOIN",
  "ON","USING","AS","DISTINCT",
  "CASE","WHEN","THEN","ELSE","END",
  /*── 集計・統計関数 ──*/
  "COUNT","SUM","AVG","MIN","MAX","TOTAL","GROUP_CONCAT",
  "STDDEV","STDDEV_POP","STDDEV_SAMP","VAR_POP","VAR_SAMP","VARIANCE",
  "MEDIAN","MODE",
  "PERCENTILE","PERCENTILE_CONT","PERCENTILE_DISC",
  /*── ウィンドウ／分析関数 ──*/
  "ROW_NUMBER","RANK","DENSE_RANK","PERCENT_RANK","CUME_DIST","NTILE",
  "LAG","LEAD","FIRST_VALUE","LAST_VALUE","NTH_VALUE",
  /*── 数値・数学 ──*/
  "ABS","ROUND","CEIL","FLOOR","TRUNC",
  "EXP","LN","LOG","LOG10","POW","POWER","SQRT","MOD","SIGN",
  "RANDOM","PI",
  "SIN","COS","TAN","ASIN","ACOS","ATAN","ATAN2",
  "SINH","COSH","TANH","DEGREES","RADIANS",
  /*── 文字列 ──*/
  "LENGTH","LOWER","UPPER","SUBSTR","SUBSTRING",
  "TRIM","LTRIM","RTRIM","REPLACE","INSTR",
  "HEX","QUOTE","CHAR","PRINTF","SOUNDEX","UNICODE",
  "LIKE","GLOB","REGEXP",
  /*── 日時 ──*/
  "DATE","TIME","DATETIME","STRFTIME",
  /*── NULL／制御 ──*/
  "COALESCE","IFNULL","NULLIF",
  "LIKELY","UNLIKELY",
  "CAST","TYPEOF"
]
// --- ② スキーマ情報をバックエンドから取得 ---
let tables = [];       
let columnsByTable = {}; 
async function loadSchemaMeta(){
  const res = await fetch("/api/schema");  
  const data = await res.json();
  tables = data.tables.map(t=>t.name);
  data.tables.forEach(t => { columnsByTable[t.name] = t.columns });
}
loadSchemaMeta()
// --- ③ コンプリータ本体 ---
const sqlCompleter = {
  identifierRegexps: [/[\w\.\-]+/],
  getCompletions: function(editor, session, pos, prefix, callback) {
    if (!prefix) { callback(null, []); return; }
  
    // a) SQLite キーワード
    const kw = SQLITE_KEYWORDS
      .filter(k => k.startsWith(prefix.toUpperCase()))
      .map(k => ({value:k, meta:"keyword"}));
  
    // b) テーブル名
    const tbl = tables
      .filter(t => t.startsWith(prefix))
      .map(t => ({value:t, meta:"table"}));
  
    // c) カラム名 (直前のテーブルを簡易判定)
    let col = [];
    const line = session.getLine(pos.row);
    const m = line.match(/from\s+(\w+)$/i) || line.match(/join\s+(\w+)$/i);
    if (m && columnsByTable[m[1]]) {
      col = columnsByTable[m[1]]
        .filter(c => c.startsWith(prefix))
        .map(c => ({value:c, meta:`${m[1]}.column`}));
    }
    callback(null, [...kw, ...tbl, ...col]);
  }
}
// --- ④ Editor に登録 ---
const langTools = ace.require("ace/ext/language_tools");
// The 'keywordCompleter' was not defined in the provided snippet.
// Assuming sqlCompleter handles keywords, tables, and columns as implemented.
// If a separate keywordCompleter exists elsewhere, this comment might not apply.
// langTools.addCompleter(keywordCompleter);  // SQLite キーワード＆関数
langTools.addCompleter(sqlCompleter);      // スキーマ（テーブル／カラム）
}); 