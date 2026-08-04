const state = { owner: '', repo: '', branch: 'main', token: '', content: null, contentSha: '', selectedId: null, dirty: false };
const $ = (selector) => document.querySelector(selector);
const loginView = $('#login-view');
const editorView = $('#editor-view');
const statusEl = $('#status');
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const utf8ToBase64 = (text) => { const bytes = new TextEncoder().encode(text); let binary = ''; bytes.forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary); };
const base64ToUtf8 = (base64) => { const binary = atob(base64.replace(/\n/g, '')); const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0)); return new TextDecoder().decode(bytes); };
const apiPath = (path) => `https://api.github.com/repos/${encodeURIComponent(state.owner)}/${encodeURIComponent(state.repo)}/contents/${path}`;
const DEFAULT_SITE = {
  brandPrimary: 'KH', brandSecondary: '//HW', navWork: '项目', navAbout: '方法', navContact: '联系', navStatus: 'HARDWARE ENGINEER',
  heroCta: '查看项目', profileLabel: 'PROFILE_01', profileStatus: 'ONLINE', chipMark: 'KH', revision: 'REV.26',
  roleLabel: 'ROLE', role: 'HARDWARE ENGINEER', workflowLabel: 'WORKFLOW', workflow: 'BUILD / TEST / ITERATE', outputLabel: 'OUTPUT', output: 'WORKING PROTOTYPES',
  projectsEyebrow: 'ENGINEERING LOG', projectsTitle: '项目记录', filterAll: '全部', filterBrand: '产品硬件', filterDigital: '嵌入式', filterEditorial: '研发记录', projectLinkLabel: 'VIEW PROJECT ↗',
  aboutEyebrow: 'HOW I WORK', aboutCode: 'SYS / 04', contactEyebrow: 'START A PROJECT', contactStatus: 'AVAILABLE / 2026', contactTitle: '有个硬件想法？', contactCta: '一起把它做出来。',
  profileImage: '', profileImageAlt: 'KEHAN 的头像',
  capabilities: [{ title: '电路与硬件', code: 'CIRCUIT' }, { title: '快速原型', code: 'PROTOTYPE' }, { title: '测试调试', code: 'DEBUG' }, { title: '持续迭代', code: 'ITERATE' }],
  processSteps: [{ title: '定义问题', code: 'DEFINE' }, { title: '搭建原型', code: 'BUILD' }, { title: '测试验证', code: 'TEST' }, { title: '迭代交付', code: 'ITERATE' }]
};

async function github(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${state.token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.headers || {})
      }
    });
  } catch (error) {
    throw new Error('无法连接 GitHub API，请检查网络后重试。');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messages = {
      401: 'Token 无效或已经失效，请重新生成。',
      403: 'Token 没有写入权限。请确认 Contents 权限为 Read and write。',
      404: '找不到仓库或内容文件。请检查仓库名、分支及 token 授权范围。',
      409: '线上内容刚被其他操作修改，请刷新后台后重新编辑。',
      422: 'GitHub 拒绝了此次写入。请检查文件大小、格式或 token 权限。'
    };
    const error = new Error(messages[response.status] || body.message || `GitHub 请求失败 (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}

function setStatus(message, type = '') { statusEl.textContent = message; statusEl.className = type; }
function markDirty() { state.dirty = true; setStatus('有未发布的修改'); }
function selectedProject() { return state.content.projects.find((project) => project.id === state.selectedId); }

async function connect(form) {
  state.owner = form.owner.value.trim(); state.repo = form.repo.value.trim(); state.branch = form.branch.value.trim(); state.token = form.token.value.trim();
  const file = await github(`${apiPath('data/content.json')}?ref=${encodeURIComponent(state.branch)}`);
  state.content = JSON.parse(base64ToUtf8(file.content)); state.content.site = { ...DEFAULT_SITE, ...(state.content.site || {}) }; state.contentSha = file.sha;
  localStorage.setItem('portfolio-repo', JSON.stringify({ owner: state.owner, repo: state.repo, branch: state.branch }));
  sessionStorage.setItem('portfolio-token', state.token);
  loginView.hidden = true; editorView.hidden = false; $('#logout').hidden = false;
  fillSiteForm(); renderList(); setStatus('仓库连接成功，可以开始编辑', 'success');
}

function fillSiteForm() {
  document.querySelectorAll('[data-site]').forEach((input) => {
    input.value = state.content.site[input.dataset.site] || '';
    input.addEventListener('input', () => { state.content.site[input.dataset.site] = input.value; markDirty(); });
  });
  $('#socials').value = (state.content.site.socials || []).map((item) => `${item.label} | ${item.url}`).join('\n');
  $('#socials').addEventListener('input', () => {
    state.content.site.socials = $('#socials').value.split('\n').map((line) => { const [label, ...url] = line.split('|'); return { label: label.trim(), url: url.join('|').trim() }; }).filter((item) => item.label && item.url);
    markDirty();
  });
  const bindPairList = (selector, key) => {
    const input = $(selector);
    input.value = (state.content.site[key] || []).map((item) => `${item.title} | ${item.code}`).join('\n');
    input.addEventListener('input', () => {
      state.content.site[key] = input.value.split('\n').map((line) => { const [title, ...code] = line.split('|'); return { title: title.trim(), code: code.join('|').trim() }; }).filter((item) => item.title || item.code).slice(0, 4);
      markDirty();
    });
  };
  bindPairList('#capabilities', 'capabilities');
  bindPairList('#process-steps', 'processSteps');
  const profileImageInput = $('[data-site="profileImage"]');
  const updateAvatarPreview = () => {
    const preview = $('#avatar-preview');
    const url = profileImageInput.value.trim();
    preview.hidden = !url;
    if (url) preview.src = url;
    else preview.removeAttribute('src');
  };
  profileImageInput.addEventListener('input', updateAvatarPreview);
  updateAvatarPreview();
}

function renderList() {
  $('#project-list').innerHTML = state.content.projects.map((project) => {
    const media = project.mediaType === 'video' ? `<video src="${escapeHtml(project.media)}" muted></video>` : project.media ? `<img src="${escapeHtml(project.media)}" alt="" />` : '<span class="media-placeholder"></span>';
    return `<div class="project-list-item ${project.id === state.selectedId ? 'active' : ''}" data-select="${escapeHtml(project.id)}" role="button" tabindex="0">${media}<span><strong>${escapeHtml(project.title || '未命名作品')}</strong><small>${escapeHtml(project.category || '')} · ${escapeHtml(project.year || '')}${project.published === false ? ' · 未发布' : ''}</small></span><span class="order-buttons"><button type="button" data-move="up" data-id="${escapeHtml(project.id)}" aria-label="上移">↑</button><button type="button" data-move="down" data-id="${escapeHtml(project.id)}" aria-label="下移">↓</button></span></div>`;
  }).join('');
  document.querySelectorAll('[data-select]').forEach((button) => button.addEventListener('click', (event) => { if (event.target.closest('[data-move]')) return; state.selectedId = button.dataset.select; renderList(); renderProjectEditor(); }));
  document.querySelectorAll('[data-select]').forEach((item) => item.addEventListener('keydown', (event) => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); state.selectedId = item.dataset.select; renderList(); renderProjectEditor(); } }));
  document.querySelectorAll('[data-move]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); moveProject(button.dataset.id, button.dataset.move === 'up' ? -1 : 1); }));
}

function moveProject(id, direction) {
  const index = state.content.projects.findIndex((item) => item.id === id); const target = index + direction;
  if (target < 0 || target >= state.content.projects.length) return;
  [state.content.projects[index], state.content.projects[target]] = [state.content.projects[target], state.content.projects[index]];
  markDirty(); renderList();
}

function renderProjectEditor() {
  const project = selectedProject(); if (!project) return;
  $('#project-editor').innerHTML = `<div class="editor-title"><div><p class="kicker">PROJECT DETAILS</p><h3>${escapeHtml(project.title || '未命名作品')}</h3></div><label class="publish-toggle"><input type="checkbox" data-field="published" ${project.published !== false ? 'checked' : ''}/> 在网站发布</label></div>
  <div class="media-box"><div>${project.mediaType === 'video' ? `<video class="media-preview" src="${escapeHtml(project.media)}" muted controls></video>` : project.media ? `<img class="media-preview" src="${escapeHtml(project.media)}" alt="" />` : '<span class="media-preview"></span>'}</div><div class="media-actions"><button id="upload-media" class="button secondary">上传图片或视频</button><p>支持 JPG、PNG、WebP、GIF、MP4、WebM，单个文件不超过 45 MB。</p><label>或填写媒体网址<input data-field="media" value="${escapeHtml(project.media || '')}" /></label></div></div>
  <div class="field-row"><label>作品标题<input data-field="title" value="${escapeHtml(project.title || '')}" /></label><label>年份<input data-field="year" value="${escapeHtml(project.year || '')}" /></label></div>
  <label>作品简介<textarea data-field="description" rows="3">${escapeHtml(project.description || '')}</textarea></label>
  <div class="field-row"><label>分类<select data-field="category"><option value="brand">产品硬件</option><option value="digital">嵌入式</option><option value="editorial">研发记录</option></select></label><label>英文类别<input data-field="label" value="${escapeHtml(project.label || '')}" /></label></div>
  <div class="field-row"><label>版式<select data-field="layout"><option value="normal">标准</option><option value="large">通栏大图</option><option value="wide">右侧宽图</option></select></label><label>点击跳转链接 <small>可留空；支持 https://…、mailto:… 或 #页面区域</small><input data-field="link" placeholder="https://example.com/project" value="${escapeHtml(project.link || '')}" /></label></div>
  <label>图片说明（无障碍文本）<input data-field="alt" value="${escapeHtml(project.alt || '')}" /></label>
  <div class="editor-footer"><button id="delete-project" class="button danger">删除作品</button><span class="muted">修改后点击页面右上角“保存并发布”</span></div>`;
  $('[data-field="category"]').value = project.category || 'editorial'; $('[data-field="layout"]').value = project.layout || 'normal';
  document.querySelectorAll('[data-field]').forEach((input) => input.addEventListener('input', () => {
    const value = input.type === 'checkbox' ? input.checked : input.value; project[input.dataset.field] = value;
    if (input.dataset.field === 'media') project.mediaType = /\.(mp4|webm)(\?|$)/i.test(value) ? 'video' : 'image';
    markDirty(); if (['title', 'year', 'category', 'published'].includes(input.dataset.field)) renderList();
  }));
  $('#upload-media').addEventListener('click', () => $('#media-file').click());
  $('#delete-project').addEventListener('click', () => {
    if (!confirm(`确定删除“${project.title || '未命名作品'}”吗？媒体文件不会自动删除。`)) return;
    state.content.projects = state.content.projects.filter((item) => item.id !== project.id); state.selectedId = null; markDirty(); renderList();
    $('#project-editor').innerHTML = '<div class="empty-editor"><span>←</span><p>选择一个作品开始编辑，或新增作品。</p></div>';
  });
}

async function uploadMedia(file) {
  if (!file || !selectedProject()) return;
  if (file.size > 45 * 1024 * 1024) throw new Error('文件超过 45 MB，请压缩后再上传。');
  const button = $('#upload-media'); button.disabled = true; button.textContent = '正在上传…'; setStatus('正在上传媒体，请勿关闭页面');
  const extension = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanStem = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'upload';
  const cleanName = `${cleanStem}.${extension || (file.type.startsWith('video/') ? 'mp4' : 'jpg')}`;
  const path = `media/${Date.now()}-${cleanName}`;
  const content = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
  const uploaded = await github(apiPath(path), { method: 'PUT', body: JSON.stringify({ message: `Upload ${cleanName}`, content, branch: state.branch }) });
  if (!uploaded.content?.path) throw new Error('GitHub 没有返回上传后的文件路径，请重试。');
  const project = selectedProject(); project.media = uploaded.content.path; project.mediaType = file.type.startsWith('video/') ? 'video' : 'image'; markDirty(); renderList(); renderProjectEditor(); setStatus('媒体上传成功，请点击“保存并发布”完成作品更新', 'success');
}

async function uploadAvatar(file) {
  if (!file) return;
  if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) throw new Error('请选择 JPG、PNG、WebP 或 GIF 图片。');
  if (file.size > 15 * 1024 * 1024) throw new Error('头像图片不能超过 15 MB。');
  const button = $('#upload-avatar'); button.disabled = true; button.textContent = '正在上传…'; setStatus('正在上传头像，请勿关闭页面');
  const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `media/${Date.now()}-avatar.${extension || 'jpg'}`;
  const content = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
  const uploaded = await github(apiPath(path), { method: 'PUT', body: JSON.stringify({ message: 'Upload profile image', content, branch: state.branch }) });
  state.content.site.profileImage = uploaded.content.path;
  $('[data-site="profileImage"]').value = uploaded.content.path;
  $('#avatar-preview').src = uploaded.content.path;
  $('#avatar-preview').hidden = false;
  markDirty(); setStatus('头像上传成功，请点击“保存并发布”使前台显示', 'success');
  button.disabled = false; button.textContent = '上传头像图片';
}

async function saveAll() {
  const button = $('#save-all'); button.disabled = true; setStatus('正在发布…');
  try {
    const path = apiPath('data/content.json');
    state.content.updatedAt = new Date().toISOString();
    const payload = () => ({ message: `Update portfolio content ${new Date().toISOString()}`, content: utf8ToBase64(`${JSON.stringify(state.content, null, 2)}\n`), sha: state.contentSha, branch: state.branch });
    const latest = await github(`${path}?ref=${encodeURIComponent(state.branch)}&v=${Date.now()}`);
    state.contentSha = latest.sha;
    let result;
    try {
      result = await github(path, { method: 'PUT', body: JSON.stringify(payload()) });
    } catch (error) {
      if (error.status !== 409) throw error;
      const refreshed = await github(`${path}?ref=${encodeURIComponent(state.branch)}&v=${Date.now()}`);
      state.contentSha = refreshed.sha;
      result = await github(path, { method: 'PUT', body: JSON.stringify(payload()) });
    }
    state.contentSha = result.content.sha; state.dirty = false;
    localStorage.setItem('portfolio-latest-content', JSON.stringify(state.content));
    localStorage.setItem('portfolio-content-updated', String(Date.now()));
    if ('BroadcastChannel' in window) { const channel = new BroadcastChannel('portfolio-content'); channel.postMessage({ sha: state.contentSha, content: state.content }); channel.close(); }
    setStatus('发布成功，已通知前台；打开的前台页面会在 5 秒内自动更新', 'success');
  } catch (error) { setStatus(error.message, 'error'); alert(`发布失败：${error.message}`); } finally { button.disabled = false; }
}

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true; button.textContent = '正在连接…';
  try { await connect(event.currentTarget.elements); } catch (error) { alert(`连接失败：${error.message}\n\n请检查仓库名、分支和 token 权限。`); } finally { button.disabled = false; button.textContent = '连接并进入后台'; }
});
$('#add-project').addEventListener('click', () => {
  const project = { id: `project-${Date.now()}`, title: '新作品', description: '', category: 'editorial', label: 'PROJECT', year: String(new Date().getFullYear()), mediaType: 'image', media: '', alt: '', link: '', layout: 'normal', published: false };
  state.content.projects.unshift(project); state.selectedId = project.id; markDirty(); renderList(); renderProjectEditor();
});
$('#upload-avatar').addEventListener('click', () => $('#avatar-file').click());
$('#avatar-file').addEventListener('change', async (event) => { try { await uploadAvatar(event.target.files[0]); } catch (error) { setStatus(error.message, 'error'); alert(`头像上传失败：${error.message}`); const button = $('#upload-avatar'); button.disabled = false; button.textContent = '上传头像图片'; } event.target.value = ''; });
$('#media-file').addEventListener('change', async (event) => { try { await uploadMedia(event.target.files[0]); } catch (error) { setStatus(error.message, 'error'); alert(`上传失败：${error.message}`); const button = $('#upload-media'); if (button) { button.disabled = false; button.textContent = '上传图片或视频'; } } event.target.value = ''; });
$('#save-all').addEventListener('click', saveAll);
$('#logout').addEventListener('click', () => { sessionStorage.removeItem('portfolio-token'); location.reload(); });
window.addEventListener('beforeunload', (event) => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });

const savedRepo = JSON.parse(localStorage.getItem('portfolio-repo') || 'null');
if (savedRepo) Object.entries(savedRepo).forEach(([key, value]) => { if ($('#login-form').elements[key]) $('#login-form').elements[key].value = value; });
const savedToken = sessionStorage.getItem('portfolio-token');
if (savedToken) { $('#login-form').elements.token.value = savedToken; $('#login-form').requestSubmit(); }
