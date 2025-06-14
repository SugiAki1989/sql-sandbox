import { initEditor, makeResizable } from './editor.js';
import { setupTableTabs } from './table_view.js';
import { runQuery, renderQueryResult } from './query_runner.js';

// Ace Editorの初期化と設定（グローバルで一度だけ）
window.addEventListener('DOMContentLoaded', () => {
  const runButton = document.getElementById('run');
  const resetButton = document.getElementById('reset');
  const resultsDiv = document.getElementById('results');
  const tableTabsContainer = document.getElementById('tableTabs');
  const tableContentDiv = document.getElementById('tableContent');

  // エディタ初期化
  const editor = initEditor(() => runQuery(editor, resultsDiv, renderQueryResult));

  // カラムリサイズ
  makeResizable(document.getElementById('resizer1'));
  makeResizable(document.getElementById('resizer2'));

  // テーブルタブ初期化
  setupTableTabs(tableTabsContainer, tableContentDiv, renderQueryResult);

  // ボタンイベント
  runButton.onclick = () => runQuery(editor, resultsDiv, renderQueryResult);
  resetButton.onclick = () => {
    resultsDiv.innerHTML = '<p class="text-gray-500">Results cleared.</p>';
    resultsDiv.scrollTop = 0;
  };

  // 初期表示メッセージ
  resultsDiv.innerHTML = '<p class="text-gray-500">Enter SQL in the editor and click "Run" or press Ctrl/Cmd+Enter.</p>';

  // SQLite用キーワード定義
  const SQLITE_KEYWORDS = [
    "SELECT","FROM","WHERE","GROUP BY","HAVING","ORDER BY","PARTITION BY","OVER",
    "LIMIT","OFFSET","WITH","RECURSIVE",
    "UNION","UNION ALL","EXCEPT","INTERSECT",
    "JOIN","INNER JOIN","LEFT JOIN","CROSS JOIN","NATURAL JOIN",
    "ON","USING","AS","DISTINCT",
    "CASE","WHEN","THEN","ELSE","END",
    "COUNT","SUM","AVG","MIN","MAX","TOTAL","GROUP_CONCAT",
    "STDDEV","STDDEV_POP","STDDEV_SAMP","VAR_POP","VAR_SAMP","VARIANCE",
    "MEDIAN","MODE",
    "PERCENTILE","PERCENTILE_CONT","PERCENTILE_DISC",
    "ROW_NUMBER","RANK","DENSE_RANK","PERCENT_RANK","CUME_DIST","NTILE",
    "LAG","LEAD","FIRST_VALUE","LAST_VALUE","NTH_VALUE",
    "ABS","ROUND","CEIL","FLOOR","TRUNC",
    "EXP","LN","LOG","LOG10","POW","POWER","SQRT","MOD","SIGN",
    "RANDOM","PI",
    "SIN","COS","TAN","ASIN","ACOS","ATAN","ATAN2",
    "SINH","COSH","TANH","DEGREES","RADIANS",
    "LENGTH","LOWER","UPPER","SUBSTR","SUBSTRING",
    "TRIM","LTRIM","RTRIM","REPLACE","INSTR",
    "HEX","QUOTE","CHAR","PRINTF","SOUNDEX","UNICODE",
    "LIKE","GLOB","REGEXP",
    "DATE","TIME","DATETIME","STRFTIME",
    "COALESCE","IFNULL","NULLIF",
    "LIKELY","UNLIKELY",
    "CAST","TYPEOF"
  ];

  // スキーマ情報取得
  let tables = [];
  let columnsByTable = {};
  async function loadSchemaMeta() {
    try {
      const res = await fetch("/api/schema");
      const data = await res.json();
      tables = data.tables.map(t => t.name);
      data.tables.forEach(t => {
        columnsByTable[t.name] = t.columns;
      });
    } catch (err) {
      console.error("スキーマ情報の取得に失敗しました:", err);
    }
  }
  loadSchemaMeta();

  // Aceエディタ用コンプリータ定義
  const sqlCompleter = {
    identifierRegexps: [/[ 0-\w\.\-]+/],
    getCompletions: function(editorInstance, session, pos, prefix, callback) {
      if (!prefix) {
        callback(null, []);
        return;
      }
      const kw = SQLITE_KEYWORDS
        .filter(k => k.startsWith(prefix.toUpperCase()))
        .map(k => ({ value: k, meta: "keyword" }));
      const tbl = tables
        .filter(t => t.startsWith(prefix))
        .map(t => ({ value: t, meta: "table" }));
      let col = [];
      const line = session.getLine(pos.row);
      const m = line.match(/(?:from|join)\s+(\w+)$/i);
      if (m && columnsByTable[m[1]]) {
        col = columnsByTable[m[1]]
          .filter(c => c.startsWith(prefix))
          .map(c => ({ value: c, meta: `${m[1]}.column` }));
      }
      callback(null, [...kw, ...tbl, ...col]);
    }
  };
  const langTools = ace.require("ace/ext/language_tools");
  langTools.addCompleter(sqlCompleter);
});
