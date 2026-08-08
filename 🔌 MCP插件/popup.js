// Check server connection
const serverInput = document.getElementById('server');
const statusEl = document.getElementById('status');

chrome.storage.local.get('serverUrl', (data) => {
  if (data.serverUrl) serverInput.value = data.serverUrl;
  checkServer();
});

document.getElementById('save').addEventListener('click', () => {
  chrome.storage.local.set({ serverUrl: serverInput.value });
  checkServer();
});

async function checkServer() {
  const url = serverInput.value;
  statusEl.textContent = '检查中...';
  statusEl.className = 'status';

  try {
    const res = await fetch(url + '/api/dashboard', { timeout: 3000 });
    const data = await res.json();
    statusEl.textContent = `✅ 已连接 · ${data.total_sessions || 0} 次课程`;
    statusEl.className = 'status online';
  } catch (e) {
    statusEl.textContent = '❌ 服务器未启动，请双击 启动.bat';
    statusEl.className = 'status offline';
  }
}
