const projectsElement = document.querySelector('#projects');
const errorElement = document.querySelector('#load-error');
const filterButtons = [...document.querySelectorAll('.filters button')];
let projects = [];

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const safeUrl = (value = '') => { const url = String(value).trim(); return /^(https?:|mailto:|\.\/|\.\.\/|\/|media\/)/i.test(url) ? url : '#'; };

function projectCard(project, index) {
  const layout = ['large', 'wide'].includes(project.layout) ? ` project-${project.layout}` : '';
  const media = project.mediaType === 'video'
    ? `<video src="${escapeHtml(safeUrl(project.media))}" ${project.poster ? `poster="${escapeHtml(safeUrl(project.poster))}"` : ''} muted loop playsinline controls preload="metadata"></video>`
    : `<img src="${escapeHtml(safeUrl(project.media))}" alt="${escapeHtml(project.alt || project.title)}" loading="lazy" />`;
  const number = String(index + 1).padStart(2, '0');
  return `<article class="project${layout}" data-category="${escapeHtml(project.category || 'editorial')}"><a href="${escapeHtml(safeUrl(project.link || '#contact'))}"><div class="project-image">${media}</div><div class="project-meta"><span>${number} / ${escapeHtml(project.label || 'PROJECT')}</span><span>${escapeHtml(project.year || '')}</span></div><h3>${escapeHtml(project.title || '未命名作品')}</h3>${project.description ? `<p class="project-description">${escapeHtml(project.description)}</p>` : ''}</a></article>`;
}

function renderProjects(filter = 'all') {
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

function applySiteContent(data) {
  const site = data.site || {};
  document.title = site.title || document.title;
  const description = document.querySelector('meta[name="description"]');
  if (description && site.description) description.content = site.description;
  setHtml('[data-hero-title]', site.heroTitle); setHtml('[data-about-title]', site.aboutTitle);
  document.querySelector('[data-eyebrow]').textContent = site.eyebrow || 'PORTFOLIO';
  document.querySelector('[data-intro]').textContent = site.intro || '';
  document.querySelector('[data-about-copy]').textContent = site.aboutCopy || '';
  document.querySelector('[data-name]').textContent = site.name || 'LIN RAN';
  document.querySelector('[data-year]').textContent = new Date().getFullYear();
  document.querySelectorAll('[data-email-link]').forEach((link) => { link.href = `mailto:${site.email || ''}`; });
  const emailText = document.querySelector('[data-email]'); if (emailText) emailText.textContent = site.email || '';
  document.querySelector('#social-links').innerHTML = (site.socials || []).map((item) => `<a href="${escapeHtml(safeUrl(item.url))}" target="_blank" rel="noreferrer">${escapeHtml(item.label)}</a>`).join('');
  projects = Array.isArray(data.projects) ? data.projects.filter((project) => project.published !== false) : [];
  document.querySelector('[data-project-count]').textContent = `(${String(projects.length).padStart(2, '0')})`;
  renderProjects();
}

filterButtons.forEach((button) => button.addEventListener('click', () => { filterButtons.forEach((item) => item.classList.toggle('active', item === button)); renderProjects(button.dataset.filter); }));
fetch(`data/content.json?v=${Date.now()}`).then((response) => { if (!response.ok) throw new Error('Content unavailable'); return response.json(); }).then(applySiteContent).catch(() => { errorElement.hidden = false; });
