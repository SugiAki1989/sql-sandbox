// query_runner.js
// クエリ実行・結果表示

export async function runQuery(editor, resultsDiv, renderQueryResult) {
  const sql = editor.getValue().trim();
  if (!sql) {
    resultsDiv.innerHTML = '<p class="text-orange-600 bg-orange-50 p-2 rounded-md font-medium">⚠ SQL query is empty.</p>';
    return;
  }
  resultsDiv.innerHTML = '<p class="text-blue-600 bg-blue-50 p-2 rounded-md font-medium animate-pulse">Executing SQL...</p>';
  try {
    const response = await fetch('/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql })
    });
    const data = await response.json();
    resultsDiv.innerHTML = '';
    if (!response.ok || data.error) {
      const errorMsg = data.error || `HTTP error! status: ${response.status}`;
      const errorP = document.createElement('p');
      errorP.className = 'text-red-700 font-semibold bg-red-50 p-3 rounded-md shadow';
      errorP.textContent = '⚠ Error: ' + errorMsg;
      resultsDiv.appendChild(errorP);
      // ヒントがあれば表示
      if (data.hint) {
        const hintP = document.createElement('p');
        hintP.className = 'text-blue-800 font-medium bg-blue-50 p-2 rounded-md mt-2 border-l-4 border-blue-400';
        hintP.textContent = 'Hint: ' + data.hint;
        resultsDiv.appendChild(hintP);
      }
      return;
    }
    if (data.results && data.results.length > 0) {
      data.results.forEach((res, index) => {
        renderQueryResult(resultsDiv, res, `Query #${index + 1}`);
      });
    } else {
      resultsDiv.innerHTML = '<p class="text-gray-500 italic">Query executed, but no results to display.</p>';
    }
  } catch (error) {
    console.error('Failed to execute SQL:', error);
    resultsDiv.innerHTML = '';
    const errorP = document.createElement('p');
    errorP.className = 'text-red-700 font-semibold bg-red-50 p-3 rounded-md shadow';
    errorP.textContent = `⚠ Network Error: Could not connect to the server. ${error.message}`;
    resultsDiv.appendChild(errorP);
  }
  resultsDiv.scrollTop = 0;
}

export function renderQueryResult(container, resultData, headerText) {
  const resultBlock = document.createElement('div');
  resultBlock.className = 'p-1';
  if (headerText) {
    const headerElement = document.createElement('h3');
    headerElement.textContent = headerText;
    headerElement.className = 'text-md font-semibold mb-2 text-gray-700 border-b pb-1';
    resultBlock.appendChild(headerElement);
  }
  if (resultData.type === 'select') {
    if (resultData.rows.length === 0) {
      const p = document.createElement('p');
      p.textContent = 'Query returned no rows.';
      p.className = 'text-gray-500 italic';
      resultBlock.appendChild(p);
    } else {
      const tableWrapper = document.createElement('div');
      tableWrapper.className = 'overflow-x-auto';
      const table = document.createElement('table');
      table.className = 'simple-table w-full border-collapse text-sm';
      const thead = table.createTHead();
      thead.className = 'bg-gray-200';
      const headerRow = thead.insertRow();
      resultData.columns.forEach(colName => {
        const th = document.createElement('th');
        th.textContent = colName;
        th.className = 'border border-gray-300 px-3 py-2 text-left font-medium text-gray-600';
        headerRow.appendChild(th);
      });
      const tbody = table.createTBody();
      resultData.rows.forEach(rowData => {
        const tr = tbody.insertRow();
        tr.className = 'hover:bg-gray-100 even:bg-white odd:bg-gray-50';
        rowData.forEach(cellData => {
          const td = tr.insertCell();
          td.textContent = cellData;
          td.className = 'border border-gray-300 px-3 py-2 text-gray-700';
        });
      });
      tableWrapper.appendChild(table);
      resultBlock.appendChild(tableWrapper);
    }
  } else if (resultData.type === 'dml') {
    const p = document.createElement('p');
    p.textContent = resultData.msg;
    p.className = 'text-green-700 font-medium bg-green-50 p-2 rounded-md';
    resultBlock.appendChild(p);
  } else {
    const p = document.createElement('p');
    p.textContent = 'Unknown result type.';
    p.className = 'text-red-700 font-medium bg-red-50 p-2 rounded-md';
    resultBlock.appendChild(p);
  }
  container.appendChild(resultBlock);
} 