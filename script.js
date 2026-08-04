const projectsElement = document.querySelector('#projects');
const errorElement = document.querySelector('#load-error');
const filterButtons = [...document.querySelectorAll('.filters button')];
let projects = [];
let siteContent = {};
let currentFilter = 'all';
let contentFingerprint = '';
const contentChannel = 'BroadcastChannel' in window ? new BroadcastChannel('portfolio-content') : null;

const REPOSITORY_RAW_ROOT = 'https://raw.githubusercontent.com/KEHAN077/-/main/';
const CONTENT_URL = `${REPOSITORY_RAW_ROOT}data/content.json`;
const CONTENT_API_URL = 'https://api.github.com/repos/KEHAN077/-/contents/data/content.json?ref=main';

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const safeUrl = (value = '') => { const url = String(value).trim(); return /^(https?:|mailto:|#|\.\/|\.\.\/|\/|media\/)/i.test(url) ? url : '#'; };
const base64ToUtf8 = (base64) => {
  const binary = atob(String(base64).replace(/\n/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
};
const liveMediaUrl = (value = '') => {
  const url = String(value).trim();
  const repositoryPath = url.replace(/^\.\//, '');
  return repositoryPath.startsWith('media/') ? `${REPOSITORY_RAW_ROOT}${repositoryPath}` : url;
};

function projectCard(project, index) {
  const layout = ['large', 'wide'].includes(project.layout) ? ` project-${project.layout}` : '';
  const media = project.mediaType === 'video'
    ? `<video src="${escapeHtml(safeUrl(liveMediaUrl(project.media)))}" ${project.poster ? `poster="${escapeHtml(safeUrl(liveMediaUrl(project.poster)))}"` : ''} muted loop playsinline controls preload="metadata"></video>`
    : `<img src="${escapeHtml(safeUrl(liveMediaUrl(project.media)))}" alt="${escapeHtml(project.alt || project.title)}" loading="lazy" />`;
  const number = String(index + 1).padStart(2, '0');
  const rawLink = String(project.link || '').trim();
  const link = rawLink && rawLink !== '#' ? safeUrl(rawLink) : '';
  const external = /^https?:/i.test(link);
  const tag = link ? 'a' : 'div';
  const attributes = link ? ` href="${escapeHtml(link)}"${external ? ' target="_blank" rel="noreferrer"' : ''}` : '';
  const linkLabel = link ? (siteContent.projectLinkLabel || 'VIEW PROJECT ↗') : '';
  return `<article class="project${layout}${link ? '' : ' project-no-link'}" data-category="${escapeHtml(project.category || 'editorial')}"><${tag} class="project-card"${attributes}><div class="project-image" data-link-label="${escapeHtml(linkLabel)}">${media}</div><div class="project-meta"><span>${number} / ${escapeHtml(project.label || 'PROJECT')}</span><span>${escapeHtml(project.year || '')}</span></div><h3>${escapeHtml(project.title || '未命名作品')}</h3>${project.description ? `<p class="project-description">${escapeHtml(project.description)}</p>` : ''}</${tag}></article>`;
}

function renderProjects(filter = 'all') {
  currentFilter = filter;
  const visible = filter === 'all' ? projects : projects.filter((project) => project.category === filter);
  projectsElement.innerHTML = visible.length ? visible.map(projectCard).join('') : '<p class="empty-state">这个分类还没有作品。</p>';
}

function safeRichText(value) {
  const template = document.createElement('template'); template.innerHTML = String(value || '');
  template.content.querySelectorAll('*').forEach((element) => {
    if (!['EM', 'BR'].includes(element.tagName)) element.replaceWith(document.createTextNode(element.textContent));
    else [...element.attributes].forEach((attribute) => element.removeAttribute(attribute.name));
  });
  return template.innerHTML;
}
function setHtml(selector, value) { const element = document.querySelector(selector); if (element && value) element.innerHTML = safeRichText(value); }
function setText(selector, value, fallback = '') { const element = document.querySelector(selector); if (element) element.textContent = value ?? fallback; }

function applySiteContent(data) {
  const site = data.site || {};
  siteContent = site;
  document.title = site.title || document.title;
  const description = document.querySelector('meta[name="description"]');
  if (description && site.description) description.content = site.description;
  setHtml('[data-hero-title]', site.heroTitle); setHtml('[data-about-title]', site.aboutTitle);
  const textFields = {
    '[data-brand-primary]': ['brandPrimary', 'KH'], '[data-brand-secondary]': ['brandSecondary', '//HW'],
    '[data-nav-work]': ['navWork', '项目'], '[data-nav-about]': ['navAbout', '方法'], '[data-nav-contact]': ['navContact', '联系'], '[data-nav-status]': ['navStatus', 'HARDWARE ENGINEER'],
    '[data-eyebrow]': ['eyebrow', 'HARDWARE ENGINEER / 2026'], '[data-intro]': ['intro', ''], '[data-hero-cta]': ['heroCta', '查看项目'],
    '[data-profile-label]': ['profileLabel', 'PROFILE_01'], '[data-profile-status]': ['profileStatus', 'ONLINE'], '[data-chip-mark]': ['chipMark', 'KH'], '[data-revision]': ['revision', 'REV.26'],
    '[data-role-label]': ['roleLabel', 'ROLE'], '[data-role]': ['role', 'HARDWARE ENGINEER'], '[data-workflow-label]': ['workflowLabel', 'WORKFLOW'], '[data-workflow]': ['workflow', 'BUILD / TEST / ITERATE'], '[data-output-label]': ['outputLabel', 'OUTPUT'], '[data-output]': ['output', 'WORKING PROTOTYPES'],
    '[data-projects-eyebrow]': ['projectsEyebrow', 'ENGINEERING LOG'], '[data-projects-title]': ['projectsTitle', '项目记录'],
    '[data-filter-all]': ['filterAll', '全部'], '[data-filter-brand]': ['filterBrand', '产品硬件'], '[data-filter-digital]': ['filterDigital', '嵌入式'], '[data-filter-editorial]': ['filterEditorial', '研发记录'],
    '[data-about-eyebrow]': ['aboutEyebrow', 'HOW I WORK'], '[data-about-code]': ['aboutCode', 'SYS / 04'], '[data-about-copy]': ['aboutCopy', ''],
    '[data-contact-eyebrow]': ['contactEyebrow', 'START A PROJECT'], '[data-contact-status]': ['contactStatus', 'AVAILABLE / 2026'], '[data-contact-title]': ['contactTitle', '有个硬件想法？'], '[data-contact-cta]': ['contactCta', '一起把它做出来。'], '[data-name]': ['name', 'KEHAN']
  };
  Object.entries(textFields).forEach(([selector, [key, fallback]]) => setText(selector, site[key], fallback));
  const capabilities = Array.isArray(site.capabilities) ? site.capabilities : [];
  document.querySelectorAll('.capability-grid > div').forEach((item, index) => { const value = capabilities[index]; if (!value) return; setText.call(null, `.capability-grid > div:nth-child(${index + 1}) strong`, value.title, ''); setText.call(null, `.capability-grid > div:nth-child(${index + 1}) small`, value.code, ''); });
  const processSteps = Array.isArray(site.processSteps) ? site.processSteps : [];
  document.querySelectorAll('.process-list li').forEach((item, index) => { const value = processSteps[index]; if (!value) return; item.querySelector('b').textContent = value.title || ''; item.querySelector('small').textContent = value.code || ''; });
  const profileImage = document.querySelector('[data-profile-image]');
  const chip = document.querySelector('[data-chip]');
  const profileImageUrl = safeUrl(liveMediaUrl(site.profileImage || ''));
  if (profileImage && site.profileImage && profileImageUrl !== '#') {
    profileImage.src = profileImageUrl;
    profileImage.alt = site.profileImageAlt || `${site.name || 'KEHAN'} 的头像`;
    profileImage.hidden = false;
    if (chip) chip.hidden = true;
  } else {
    if (profileImage) { profileImage.hidden = true; profileImage.removeAttribute('src'); }
    if (chip) chip.hidden = false;
  }
  document.querySelector('[data-year]').textContent = new Date().getFullYear();
  document.querySelectorAll('[data-email-link]').forEach((link) => { link.href = `mailto:${site.email || ''}`; });
  const emailText = document.querySelector('[data-email]'); if (emailText) emailText.textContent = site.email || '';
  document.querySelector('#social-links').innerHTML = (site.socials || []).map((item) => `<a href="${escapeHtml(safeUrl(item.url))}" target="_blank" rel="noreferrer">${escapeHtml(item.label)}</a>`).join('');
  projects = Array.isArray(data.projects) ? data.projects.filter((project) => project.published !== false) : [];
  document.querySelector('[data-project-count]').textContent = `(${String(projects.length).padStart(2, '0')})`;
  renderProjects(currentFilter);
}

filterButtons.forEach((button) => button.addEventListener('click', () => { filterButtons.forEach((item) => item.classList.toggle('active', item === button)); renderProjects(button.dataset.filter); }));

async function loadContent() {
  const urls = [`${CONTENT_URL}?v=${Date.now()}`, `data/content.json?v=${Date.now()}`];
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) return await response.json();
    } catch (error) {
      // Try the next public source.
    }
  }
  try {
    const apiResponse = await fetch(`${CONTENT_API_URL}&v=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (apiResponse.ok) {
      const file = await apiResponse.json();
      if (file.content) return JSON.parse(base64ToUtf8(file.content));
    }
  } catch (error) {
    // All content sources are temporarily unavailable.
  }
  throw new Error('Content unavailable');
}

async function refreshContent() {
  if (document.visibilityState === 'hidden') return;
  try {
    const data = await loadContent();
    const nextFingerprint = JSON.stringify(data);
    if (nextFingerprint !== contentFingerprint) {
      contentFingerprint = nextFingerprint;
      applySiteContent(data);
    }
    errorElement.hidden = true;
  } catch (error) {
    if (!contentFingerprint) errorElement.hidden = false;
  }
}

refreshContent();
setInterval(refreshContent, 5000);
window.addEventListener('focus', refreshContent);
window.addEventListener('storage', (event) => { if (event.key === 'portfolio-content-updated') refreshContent(); });
if (contentChannel) contentChannel.addEventListener('message', refreshContent);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshContent(); });
