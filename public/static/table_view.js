// table_view.js
// テーブルタブとテーブルデータ表示

export function setupTableTabs(tableTabsContainer, tableContentDiv, renderQueryResult) {
  const TABLE_NAMES = ['users', 'orders', 'items', 'weblog'];
  let activeTableButton = null;
  TABLE_NAMES.forEach(tableName => {
    const button = document.createElement('button');
    button.textContent = tableName;
    button.className = 'px-3 py-1 text-sm bg-gray-200 rounded-t hover:bg-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500';
    button.onclick = () => loadTableData(tableName, button);
    tableTabsContainer.appendChild(button);
    if (tableName === TABLE_NAMES[0]) {
      loadTableData(tableName, button);
    }
  });

  async function loadTableData(tableName, buttonElement) {
    if (activeTableButton) {
      activeTableButton.classList.remove('bg-white', 'shadow-inner', 'text-blue-600');
      activeTableButton.classList.add('bg-gray-200');
    }
    buttonElement.classList.add('bg-white', 'shadow-inner', 'text-blue-600');
    buttonElement.classList.remove('bg-gray-200');
    activeTableButton = buttonElement;
    tableContentDiv.innerHTML = '<p class="text-gray-500 animate-pulse">Loading table data...</p>';
    try {
      const response = await fetch('/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: `SELECT * FROM ${tableName} LIMIT 100;` })
      });
      const data = await response.json();
      tableContentDiv.innerHTML = '';
      if (!response.ok || data.error) {
        tableContentDiv.textContent = '⚠ Error: ' + (data.error || 'Failed to load table data.');
        return;
      }
      if (data.results && data.results.length > 0) {
        renderQueryResult(tableContentDiv, data.results[0], `Preview Table(only 100 rows) : ${tableName}`);
      } else {
        tableContentDiv.textContent = 'No data to display for this table.';
      }
    } catch (error) {
      console.error('Failed to load table:', error);
      tableContentDiv.textContent = '⚠ Error: Could not connect to server or other network issue.';
    }
  }
} 