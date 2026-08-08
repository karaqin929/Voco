// LingoTrace Chrome Extension — ChatGPT 日报自动同步
let SERVER_URL = 'http://localhost:8765';

// Read server URL from extension storage
chrome.storage.local.get('serverUrl', (data) => {
  if (data.serverUrl) SERVER_URL = data.serverUrl;
});

// Add send button to ChatGPT messages
function addSendButtons() {
  // Find all assistant messages
  const messages = document.querySelectorAll('[data-message-author-role="assistant"]');

  messages.forEach(msg => {
    // Already added?
    if (msg.querySelector('.lingotrace-btn')) return;

    // Find the action bar
    const actions = msg.querySelector('.flex.items-center') ||
                    msg.querySelector('[class*="action"]') ||
                    msg.querySelector('.flex');

    if (!actions) return;

    const btn = document.createElement('button');
    btn.className = 'lingotrace-btn';
    btn.innerHTML = '📤 同步到 LingoTrace';
    btn.title = '一键发送日报到 LingoTrace';
    btn.addEventListener('click', () => sendToLingoTrace(msg));

    actions.appendChild(btn);
  });
}

// Extract message text
function getMessageText(msgElement) {
  // Try to find the markdown content
  const md = msgElement.querySelector('.markdown') ||
             msgElement.querySelector('[data-message-content]') ||
             msgElement.querySelector('.prose') ||
             msgElement;

  return md.textContent.trim();
}

// Send to LingoTrace server
async function sendToLingoTrace(msgElement) {
  const text = getMessageText(msgElement);

  if (!text) {
    showToast('❌ 无法提取消息内容', 'error');
    return;
  }

  // Check if it looks like a daily report
  if (!text.includes('发音纠正') && !text.includes('语法纠正') &&
      !text.includes('今日生词') && !text.includes('表现总结')) {
    showToast('⚠️ 不像日报格式，确定要发送吗？', 'error');
    // Still send anyway
  }

  try {
    const res = await fetch(`${SERVER_URL}/api/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();

    if (data.ok) {
      const s = data.stats;
      showToast(`✅ 已同步: ${s.total_errors || 0} 纠正 + ${s.vocabulary || 0} 单词 + ${s.patterns || 0} 句型`, 'success');
    } else {
      showToast('❌ 同步失败: ' + (data.error || '未知错误'), 'error');
    }
  } catch (e) {
    showToast('❌ 无法连接到 LingoTrace。请确保服务已启动。', 'error');
  }
}

// Toast notification
function showToast(message, type) {
  // Remove existing
  const existing = document.querySelector('.lingotrace-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'lingotrace-toast';
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 99999;
    background: ${type === 'success' ? '#2ecc71' : '#e74c3c'};
    color: white; padding: 12px 20px; border-radius: 8px;
    font-size: 14px; font-family: system-ui; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: lingotraceFadeIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add animation style
const style = document.createElement('style');
style.textContent = `
  @keyframes lingotraceFadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .lingotrace-btn {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 10px; background: #e94560; color: white;
    border: none; border-radius: 6px; font-size: 12px; cursor: pointer;
    transition: opacity 0.2s; margin-left: 4px;
  }
  .lingotrace-btn:hover { opacity: 0.85; }
  .lingotrace-btn:active { transform: scale(0.97); }
`;
document.head.appendChild(style);

// Watch for new messages (DOM observer)
const observer = new MutationObserver(() => {
  addSendButtons();
});
observer.observe(document.body, { childList: true, subtree: true });

// Initial run
addSendButtons();
