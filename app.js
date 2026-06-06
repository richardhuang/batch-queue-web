const STORAGE_KEY = 'batch-queue-web-config-v1';

const SAMPLE_CONFIG = {
  repo: 'open-ace/open-ace',
  batchIssue: 728,
  issues: [718, 723, 724, 722, 721, 720, 719],
  firstCheckAt: '2026-06-06T03:15',
  interval: 600,
  skipDispatch: false,
  token: '',
};

const DONE_KEYWORDS = [
  '修复完成',
  '处理完成',
  '已处理完成',
  '完成处理',
  '已修复',
  '已完成',
  'issue resolved',
  'resolved',
  'implemented',
  'fixed',
  'completed',
  '提交记录',
  '已提交',
];

const NOT_DONE_KEYWORDS = [
  '未完成',
  '还没完成',
  '尚未完成',
  '进行中',
  '处理中',
  'working on',
  'in progress',
  'not complete',
  'not completed',
  'blocked',
  'request changes',
  'code review',
];

const elements = {
  repoInput: document.querySelector('#repoInput'),
  batchIssueInput: document.querySelector('#batchIssueInput'),
  issuesInput: document.querySelector('#issuesInput'),
  firstCheckInput: document.querySelector('#firstCheckInput'),
  intervalInput: document.querySelector('#intervalInput'),
  skipDispatchInput: document.querySelector('#skipDispatchInput'),
  tokenInput: document.querySelector('#tokenInput'),
  sampleButton: document.querySelector('#sampleButton'),
  refreshButton: document.querySelector('#refreshButton'),
  copyCommandButton: document.querySelector('#copyCommandButton'),
  copyJsonButton: document.querySelector('#copyJsonButton'),
  downloadButton: document.querySelector('#downloadButton'),
  shareButton: document.querySelector('#shareButton'),
  uploadInput: document.querySelector('#uploadInput'),
  commandPreview: document.querySelector('#commandPreview'),
  jsonPreview: document.querySelector('#jsonPreview'),
  runbookList: document.querySelector('#runbookList'),
  issueBoard: document.querySelector('#issueBoard'),
  toast: document.querySelector('#toast'),
  commandHint: document.querySelector('#commandHint'),
  networkBadge: document.querySelector('#networkBadge'),
  refreshMeta: document.querySelector('#refreshMeta'),
  batchBodyPreview: document.querySelector('#batchBodyPreview'),
  batchCommentPreview: document.querySelector('#batchCommentPreview'),
  dispatchPreview: document.querySelector('#dispatchPreview'),
  verdictPreview: document.querySelector('#verdictPreview'),
  dispatchLabel: document.querySelector('#dispatchLabel'),
  activeIssueLabel: document.querySelector('#activeIssueLabel'),
  modeLabel: document.querySelector('#modeLabel'),
};

let toastTimer = null;

function showToast(message, tone = 'default') {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.style.background =
    tone === 'error'
      ? 'rgba(157, 51, 39, 0.96)'
      : tone === 'success'
        ? 'rgba(31, 122, 69, 0.96)'
        : 'rgba(29, 26, 23, 0.94)';
  elements.toast.classList.add('show');
  toastTimer = window.setTimeout(() => elements.toast.classList.remove('show'), 2200);
}

function parseIssueList(text) {
  return text
    .split(/[\n,]/)
    .map((item) => item.trim().replace(/^#/, ''))
    .filter(Boolean)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function formatOffset(date) {
  const minutes = -date.getTimezoneOffset();
  const sign = minutes >= 0 ? '+' : '-';
  const absolute = Math.abs(minutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const mins = String(absolute % 60).padStart(2, '0');
  return `${sign}${hours}:${mins}`;
}

function toOffsetTimestamp(localValue) {
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) {
    return localValue;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${formatOffset(date)}`;
}

function toLocalDatetimeInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return SAMPLE_CONFIG.firstCheckAt;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatIssueList(issues) {
  return issues.map((issue) => `#${issue}`).join('\n');
}

function readConfigFromForm() {
  return {
    repo: elements.repoInput.value.trim(),
    batchIssue: Number(elements.batchIssueInput.value),
    issues: parseIssueList(elements.issuesInput.value),
    firstCheckAt: elements.firstCheckInput.value,
    interval: Number(elements.intervalInput.value),
    skipDispatch: elements.skipDispatchInput.checked,
    token: elements.tokenInput.value.trim(),
  };
}

function validateConfig(config) {
  if (!config.repo.includes('/')) {
    throw new Error('Repository must look like owner/name.');
  }
  if (!Number.isInteger(config.batchIssue) || config.batchIssue < 1) {
    throw new Error('Batch issue number must be a positive integer.');
  }
  if (!config.issues.length) {
    throw new Error('Add at least one issue number to the ordered list.');
  }
  if (!config.firstCheckAt) {
    throw new Error('Choose a first check timestamp.');
  }
  if (!Number.isInteger(config.interval) || config.interval < 60) {
    throw new Error('Interval seconds must be at least 60.');
  }
}

function saveConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function loadStoredConfig() {
  const fromUrl = new URL(window.location.href).searchParams.get('config');
  if (fromUrl) {
    try {
      return JSON.parse(atob(fromUrl));
    } catch (_error) {
      showToast('Share link could not be parsed.', 'error');
    }
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return SAMPLE_CONFIG;
  }
  try {
    return { ...SAMPLE_CONFIG, ...JSON.parse(raw) };
  } catch (_error) {
    return SAMPLE_CONFIG;
  }
}

function writeConfigToForm(config) {
  elements.repoInput.value = config.repo || SAMPLE_CONFIG.repo;
  elements.batchIssueInput.value = String(config.batchIssue || SAMPLE_CONFIG.batchIssue);
  elements.issuesInput.value = formatIssueList(config.issues || SAMPLE_CONFIG.issues);
  elements.firstCheckInput.value = config.firstCheckAt || SAMPLE_CONFIG.firstCheckAt;
  elements.intervalInput.value = String(config.interval || SAMPLE_CONFIG.interval);
  elements.skipDispatchInput.checked = Boolean(config.skipDispatch);
  elements.tokenInput.value = config.token || '';
}

function buildCommand(config) {
  const issueArgs = config.issues.join(' ');
  const firstCheckAt = toOffsetTimestamp(config.firstCheckAt);
  return [
    'python3 /Users/rhuang/.codex/batch_queue/batch_queue_start.py',
    `  --repo ${config.repo}`,
    `  --batch-issue ${config.batchIssue}`,
    `  --issues ${issueArgs}`,
    `  --first-check-at ${firstCheckAt}`,
    `  --check-interval-seconds ${config.interval}${config.skipDispatch ? ' \\' : ''}`,
    config.skipDispatch ? '  --skip-initialize-dispatch' : '',
  ]
    .filter(Boolean)
    .join(' \\\n');
}

function buildConfigJson(config) {
  return JSON.stringify(
    {
      repo: config.repo,
      batch_issue: config.batchIssue,
      issues: config.issues,
      first_check_at: toOffsetTimestamp(config.firstCheckAt),
      check_interval_seconds: config.interval,
    },
    null,
    2
  );
}

function updateDerivedViews() {
  let config;
  try {
    config = readConfigFromForm();
    validateConfig(config);
    saveConfig(config);
    elements.commandHint.textContent = 'Ready';
    elements.commandHint.classList.remove('muted');
  } catch (error) {
    elements.commandHint.textContent = error.message;
    elements.commandHint.classList.add('muted');
    return;
  }

  elements.commandPreview.textContent = buildCommand(config);
  elements.jsonPreview.textContent = buildConfigJson(config);
  elements.runbookList.innerHTML = [
    `Open the machine that hosts your watcher scripts.`,
    `Run the generated command to update /Users/rhuang/.codex/batch_queue/config.json.`,
    `Watch the queue logs and batch issue #${config.batchIssue} for automatic dispatch updates.`,
    `Use the refresh button here to inspect live public GitHub signals.`,
  ]
    .map((item) => `<li>${item}</li>`)
    .join('');
}

function parseDispatchIssue(body) {
  const trimmed = (body || '').trim();
  if (trimmed.startsWith('请处理该issue：#')) {
    const issue = Number(trimmed.slice('请处理该issue：#'.length));
    return Number.isInteger(issue) ? issue : null;
  }
  if (trimmed.startsWith('请处理该issue：https://github.com/')) {
    const match = trimmed.match(/\/issues\/(\d+)/);
    return match ? Number(match[1]) : null;
  }
  return null;
}

function isDoneText(body) {
  const normalized = (body || '').toLowerCase();
  if (!normalized || parseDispatchIssue(body) !== null) {
    return false;
  }
  if (NOT_DONE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return false;
  }
  return DONE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function authHeaders(token) {
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

async function fetchIssue(repo, issueNumber, token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    ...authHeaders(token),
  };
  const issueResponse = await fetch(`https://api.github.com/repos/${repo}/issues/${issueNumber}`, {
    headers,
  });

  if (!issueResponse.ok) {
    throw new Error(`GitHub issue #${issueNumber} returned ${issueResponse.status}.`);
  }

  const issue = await issueResponse.json();
  let comments = [];
  if (issue.comments > 0) {
    const commentsResponse = await fetch(
      `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments?per_page=100`,
      { headers }
    );
    if (!commentsResponse.ok) {
      throw new Error(`GitHub comments for #${issueNumber} returned ${commentsResponse.status}.`);
    }
    comments = await commentsResponse.json();
  }

  return {
    issue,
    comments,
  };
}

function truncate(text, fallback = 'No signal.') {
  const value = (text || '').trim();
  if (!value) {
    return fallback;
  }
  return value.length > 220 ? `${value.slice(0, 217)}...` : value;
}

function updateSummary(config, batchData, issuesData) {
  const batchBody = batchData.issue.body || '';
  const batchComment = batchData.comments.at(-1)?.body || '';
  const dispatchBody =
    [...batchData.comments]
      .reverse()
      .map((comment) => comment.body || '')
      .find((body) => parseDispatchIssue(body) !== null) || batchBody;
  const dispatchedIssue = parseDispatchIssue(dispatchBody);
  const currentIndex = config.issues.indexOf(dispatchedIssue);
  const currentIssueNumber = currentIndex >= 0 ? config.issues[currentIndex] : null;
  const currentIssueData = currentIssueNumber ? issuesData[currentIssueNumber] : null;
  const currentIssueComment = currentIssueData?.comments.at(-1)?.body || '';
  const doneFromIssue = isDoneText(currentIssueComment);
  const doneFromBatch = isDoneText(batchComment);

  elements.batchBodyPreview.textContent = truncate(batchBody, 'Batch issue body is empty.');
  elements.batchCommentPreview.textContent = truncate(batchComment, 'Batch issue has no comments yet.');
  elements.dispatchPreview.textContent = truncate(dispatchBody, 'No dispatch signal found.');
  elements.dispatchLabel.textContent = dispatchedIssue ? `#${dispatchedIssue}` : 'Missing';
  elements.activeIssueLabel.textContent = currentIssueNumber ? `#${currentIssueNumber}` : 'Unknown';
  elements.modeLabel.textContent = config.token ? 'Authenticated API mode' : 'Public repo monitor';
  elements.verdictPreview.textContent = currentIssueNumber
    ? doneFromIssue || doneFromBatch
      ? `#${currentIssueNumber} looks complete. The watcher should dispatch the next issue soon.`
      : `#${currentIssueNumber} is still the active queue item. Waiting for a completion comment on the source issue or batch issue.`
    : 'No active dispatch could be inferred from the batch issue.';
}

function renderIssueBoard(config, batchData, issuesData) {
  const dispatchBody =
    [...batchData.comments]
      .reverse()
      .map((comment) => comment.body || '')
      .find((body) => parseDispatchIssue(body) !== null) || batchData.issue.body || '';
  const dispatchIssue = parseDispatchIssue(dispatchBody);
  const currentIndex = config.issues.indexOf(dispatchIssue);
  const batchComment = batchData.comments.at(-1)?.body || '';

  elements.issueBoard.innerHTML = config.issues
    .map((issueNumber, index) => {
      const entry = issuesData[issueNumber];
      const latestComment = entry?.comments.at(-1)?.body || '';
      const issue = entry?.issue;
      const isCurrent = index === currentIndex;
      const isPast = currentIndex >= 0 && index < currentIndex;
      const isDone = isPast || (isCurrent && (isDoneText(latestComment) || isDoneText(batchComment)));
      const state = isDone ? 'done' : isCurrent ? 'active' : currentIndex >= 0 ? 'waiting' : 'idle';
      const statusLabel = isDone
        ? 'Done'
        : isCurrent
          ? 'Active'
          : currentIndex >= 0
            ? 'Queued'
            : 'Unresolved';

      return `
        <article class="issue-card" data-state="${state}">
          <div class="issue-topline">
            <div>
              <span class="issue-number">#${issueNumber}</span>
              <h3 class="issue-title">${issue?.title || 'Issue title not loaded yet'}</h3>
            </div>
            <span class="issue-status ${state}">${statusLabel}</span>
          </div>
          <div class="issue-meta">
            <span class="issue-number">GitHub state: ${issue?.state || 'unknown'}</span>
            <span class="issue-number">Comments: ${issue?.comments ?? 0}</span>
          </div>
          <p class="issue-snippet">${truncate(
            latestComment,
            isCurrent
              ? 'No source-issue completion comment yet.'
              : 'Waiting for this issue to become active.'
          )}</p>
          <div class="issue-links">
            <a href="${issue?.html_url || `https://github.com/${config.repo}/issues/${issueNumber}`}" target="_blank" rel="noreferrer">Open issue</a>
          </div>
        </article>
      `;
    })
    .join('');
}

async function refreshLiveStatus() {
  let config;
  try {
    config = readConfigFromForm();
    validateConfig(config);
  } catch (error) {
    showToast(error.message, 'error');
    return;
  }

  elements.networkBadge.textContent = 'Refreshing';
  elements.refreshButton.disabled = true;

  try {
    const batchData = await fetchIssue(config.repo, config.batchIssue, config.token);
    const issuesData = {};
    await Promise.all(
      config.issues.map(async (issueNumber) => {
        issuesData[issueNumber] = await fetchIssue(config.repo, issueNumber, config.token);
      })
    );

    updateSummary(config, batchData, issuesData);
    renderIssueBoard(config, batchData, issuesData);
    const timestamp = new Date().toLocaleString();
    elements.networkBadge.textContent = 'GitHub OK';
    elements.networkBadge.classList.remove('muted');
    elements.refreshMeta.textContent = `Refreshed ${timestamp}`;
    showToast('Live status refreshed.', 'success');
  } catch (error) {
    elements.networkBadge.textContent = 'GitHub error';
    elements.networkBadge.classList.remove('muted');
    elements.refreshMeta.textContent = 'Last refresh failed';
    showToast(error.message, 'error');
  } finally {
    elements.refreshButton.disabled = false;
  }
}

async function copyToClipboard(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage, 'success');
  } catch (_error) {
    showToast('Clipboard write failed.', 'error');
  }
}

function downloadConfig() {
  try {
    const config = readConfigFromForm();
    validateConfig(config);
    const blob = new Blob([buildConfigJson(config)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'batch-queue-config.json';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Config JSON downloaded.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function copyShareLink() {
  try {
    const config = readConfigFromForm();
    validateConfig(config);
    const encoded = btoa(
      JSON.stringify({
        ...config,
        token: '',
      })
    );
    const url = new URL(window.location.href);
    url.searchParams.set('config', encoded);
    copyToClipboard(url.toString(), 'Share link copied.');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function importConfigFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const normalized = {
    repo: parsed.repo || SAMPLE_CONFIG.repo,
    batchIssue: parsed.batch_issue || parsed.batchIssue || SAMPLE_CONFIG.batchIssue,
    issues: parsed.issues || SAMPLE_CONFIG.issues,
    firstCheckAt: toLocalDatetimeInput(
      parsed.first_check_at || parsed.firstCheckAt || `${SAMPLE_CONFIG.firstCheckAt}:00+08:00`
    ),
    interval:
      parsed.check_interval_seconds || parsed.checkIntervalSeconds || SAMPLE_CONFIG.interval,
    skipDispatch: Boolean(parsed.skipDispatch),
    token: '',
  };
  writeConfigToForm(normalized);
  updateDerivedViews();
  showToast('Config imported.', 'success');
}

function bindEvents() {
  const formInputs = [
    elements.repoInput,
    elements.batchIssueInput,
    elements.issuesInput,
    elements.firstCheckInput,
    elements.intervalInput,
    elements.skipDispatchInput,
    elements.tokenInput,
  ];

  for (const input of formInputs) {
    input.addEventListener('input', updateDerivedViews);
    input.addEventListener('change', updateDerivedViews);
  }

  elements.sampleButton.addEventListener('click', () => {
    writeConfigToForm(SAMPLE_CONFIG);
    updateDerivedViews();
    showToast('Sample queue loaded.');
  });

  elements.refreshButton.addEventListener('click', refreshLiveStatus);
  elements.copyCommandButton.addEventListener('click', () =>
    copyToClipboard(elements.commandPreview.textContent, 'Start command copied.')
  );
  elements.copyJsonButton.addEventListener('click', () =>
    copyToClipboard(elements.jsonPreview.textContent, 'JSON copied.')
  );
  elements.downloadButton.addEventListener('click', downloadConfig);
  elements.shareButton.addEventListener('click', copyShareLink);
  elements.uploadInput.addEventListener('change', async (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }
    try {
      await importConfigFile(file);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      event.target.value = '';
    }
  });
}

function init() {
  writeConfigToForm(loadStoredConfig());
  bindEvents();
  updateDerivedViews();
}

init();
