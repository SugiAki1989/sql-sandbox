document.addEventListener("DOMContentLoaded", () => {
  const editor = ace.edit("editor", {
    mode: "ace/mode/sql",
    theme: "ace/theme/textmate"
  });

  // Ctrl/⌘ + Enter で実行
  editor.commands.addCommand({
    name: "run",
    bindKey: { win: "Ctrl-Enter", mac: "Command-Enter" },
    exec: runQuery
  });
  document.getElementById("run").onclick = runQuery;

  async function runQuery() {
    const sql = editor.getValue();
    const res = await fetch("/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql })
    });
    const data = await res.json();
    const msg = document.getElementById("msg");
    const results = document.getElementById("results");
    msg.textContent = ""; results.innerHTML = "";

    if (!res.ok) { msg.textContent = "⚠ " + data.error; return; }

    data.results.forEach((r, i) => {
      const h = document.createElement("h4");
      h.textContent = `#${i + 1}`;
      results.appendChild(h);

      if (r.type === "select") {
        const tbl = document.createElement("table");
        tbl.className = "simple-table";  // ★ ここを追加
        const thead = tbl.createTHead().insertRow();
        r.columns.forEach(c => thead.insertCell().textContent = c);
        const tbody = tbl.createTBody();
        r.rows.forEach(row => {
          const tr = tbody.insertRow();
          row.forEach(v => tr.insertCell().textContent = v);
        });
        results.appendChild(tbl);
      } else {
        const p = document.createElement("p");
        p.textContent = r.msg;
        results.appendChild(p);
      }
    });
  }
});