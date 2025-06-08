// editor.js
// Aceエディタの初期化と補完機能

export function initEditor(onRunQuery) {
  const editor = ace.edit("editor", {
    mode: "ace/mode/sql",
    theme: "ace/theme/textmate",
    fontSize: 14,
    showPrintMargin: false,
    highlightActiveLine: true,
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    enableSnippets: true
  });
  // デフォルト値
  editor.setValue(`
-- Query #1
WITH order_gender AS (
  SELECT
    o.user_id,
    CASE WHEN gender = '' THEN -99 ELSE gender END AS gender,
    purchase_ts,
    purchase_id,
    quantity,
    price
  FROM orders AS o
  LEFT JOIN users AS u
    ON o.user_id = u.user_id
)
SELECT *
FROM order_gender
LIMIT 10;

-- Query #2
WITH order_gender AS (
  SELECT
    o.user_id,
    CASE WHEN gender = '' THEN -99 ELSE gender END AS gender,
    purchase_ts,
    purchase_id,
    quantity,
    price
  FROM orders AS o
  LEFT JOIN users AS u
    ON o.user_id = u.user_id
)
SELECT
  gender,
  COUNT(DISTINCT purchase_id) AS purchase_num,
  SUM(price * quantity) AS total_price
FROM order_gender
GROUP BY gender
ORDER BY gender ASC
;`.trim(), 1);

  // SQL補完
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

  const sqlCompleter = {
    identifierRegexps: [/[\0-\x7f\w\.\-]+/],
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

  // クエリ実行ショートカット
  editor.commands.addCommand({
    name: "runQueryCommand",
    bindKey: { win: "Ctrl-Enter", mac: "Command-Enter" },
    exec: onRunQuery
  });

  return editor;
}

// カラムリサイズ機能
export function makeResizable(resizerElement) {
  const prevSibling = resizerElement.previousElementSibling;
  const nextSibling = resizerElement.nextElementSibling;
  const minWidth = 150;
  let startX, prevWidth, nextWidth;
  resizerElement.addEventListener('mousedown', (e) => {
    startX = e.clientX;
    prevWidth = prevSibling.getBoundingClientRect().width;
    nextWidth = nextSibling.getBoundingClientRect().width;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.userSelect = 'none';
    if (prevSibling) prevSibling.style.pointerEvents = 'none';
    if (nextSibling) nextSibling.style.pointerEvents = 'none';
    document.getElementById('editor').style.pointerEvents = 'none';
  });
  function onMouseMove(e) {
    const dx = e.clientX - startX;
    const newPrevWidth = prevWidth + dx;
    const newNextWidth = nextWidth - dx;
    if (newPrevWidth > minWidth && newNextWidth > minWidth) {
      prevSibling.style.width = newPrevWidth + 'px';
      nextSibling.style.width = newNextWidth + 'px';
    }
  }
  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.userSelect = '';
    if (prevSibling) prevSibling.style.pointerEvents = '';
    if (nextSibling) nextSibling.style.pointerEvents = '';
    document.getElementById('editor').style.pointerEvents = '';
  }
} 