// Собирает index.html из template.html + content/order.yml + content/words/*.yml
// Запуск: node build.js  (или npm run build)
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = __dirname;
const CONTENT_DIR = path.join(ROOT, 'content', 'words');
const ORDER_FILE = path.join(ROOT, 'content', 'order.yml');
const TEMPLATE_FILE = path.join(ROOT, 'template.html');
const OUTPUT_FILE = path.join(ROOT, 'index.html');

const KIND_LABELS = {
  canon: 'Рулбук',
  anathema: 'Анафема',
  supplement: 'Дополнение',
  homebrew: 'Самописное',
};

const NAV_KIND_LABELS = {
  canon: 'Рулбук',
  anathema: 'Анафема',
  supplement: 'Дополнение',
  homebrew: 'Самописные',
};

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadWord(slug) {
  const file = path.join(CONTENT_DIR, `${slug}.yml`);
  const data = yaml.load(fs.readFileSync(file, 'utf8'));
  data.slug = slug;
  return data;
}

function renderIcon(iconPath, className, size) {
  if (!iconPath) return '';
  return `<img class="${className}" src="${esc(iconPath)}" width="${size}" height="${size}" alt="">`;
}

function renderBadges(badges) {
  if (!badges || !badges.length) return '';
  const items = badges.map((b) => {
    const type = esc(b.type || '');
    return `<span class="badge b-${type}">${esc(b.text)}</span>`;
  }).join('');
  return `<div class="badges">${items}</div>`;
}

function renderGift(wordSlug, gift) {
  const tierLabel = gift.tier === 'greater' ? 'Большой Дар' : 'Малый Дар';
  const icon = renderIcon(gift.icon, 'gift-icon', 40);
  const badges = renderBadges(gift.badges);
  const body = esc(gift.body);
  const articleClass = gift.tier === 'greater' ? 'gift greater' : 'gift';
  return `<article class="${articleClass}" data-name="${esc(gift.name.toLowerCase())}" data-tier="${esc(gift.tier)}">` +
    `<div class="gift-head">${icon}<div class="gift-title"><h3>${esc(gift.name)}</h3>` +
    `<span class="tier">${tierLabel}</span></div></div>` +
    `${badges}` +
    `<div class="gift-body"><p>${body}</p></div>` +
    `</article>`;
}

function renderWord(word) {
  const { slug, name, kind, colors, icon, description, gifts } = word;
  const id = `w-${slug}`;
  const style = `--w-glow:${colors.glow};--w-deep:${colors.deep};--w-dark:${colors.dark}`;
  const kindLabel = KIND_LABELS[kind] || kind;
  const lesser = gifts.filter((g) => g.tier === 'lesser').length;
  const greater = gifts.filter((g) => g.tier === 'greater').length;

  const wordIcon = renderIcon(icon, 'word-icon', 72);
  const descParas = description
    ? description.split(/\n\n+/).map((p) => `<p>${esc(p)}</p>`).join('')
    : '';
  const giftsHtml = gifts.map((g) => renderGift(slug, g)).join('');

  return `<section class="word" id="${id}" data-kind="${esc(kind)}" data-name="${esc(name.toLowerCase())}" style="${style}">` +
    `<header class="word-head">${wordIcon}<div class="word-meta">` +
    `<span class="kind k-${esc(kind)}">${esc(kindLabel)}</span>` +
    `<h2>${esc(name)}</h2>` +
    `<p class="counts"><span>${lesser}</span> малых · <span>${greater}</span> больших</p>` +
    `</div></header>` +
    `<div class="word-desc">${descParas}</div>` +
    `<div class="gifts">${giftsHtml}</div>` +
    `<a class="to-top" href="#top">наверх ↑</a>` +
    `</section>`;
}

function renderNav(words) {
  const groups = { canon: [], anathema: [], supplement: [], homebrew: [] };
  for (const w of words) groups[w.kind].push(w);

  return Object.keys(groups).map((kind) => {
    const list = groups[kind];
    if (!list.length) return '';
    const items = list.map((w) => {
      const id = `w-${w.slug}`;
      return `<li><a href="#${id}" data-nav="${id}" data-name="${esc(w.name.toLowerCase())}">` +
        `<span>${esc(w.name)}</span><em>${w.gifts.length}</em></a></li>`;
    }).join('');
    return `<div class="nav-group"><h4>${esc(NAV_KIND_LABELS[kind])}<span>${list.length}</span></h4><ul>${items}</ul></div>`;
  }).join('');
}

function renderTally(words) {
  const totalGifts = words.reduce((sum, w) => sum + w.gifts.length, 0);
  const lesser = words.reduce((sum, w) => sum + w.gifts.filter((g) => g.tier === 'lesser').length, 0);
  const greater = words.reduce((sum, w) => sum + w.gifts.filter((g) => g.tier === 'greater').length, 0);
  return `<p class="tally"><b>${words.length}</b> Слов · <b>${totalGifts}</b> Даров<br>${lesser} малых · ${greater} больших</p>`;
}

function main() {
  const order = yaml.load(fs.readFileSync(ORDER_FILE, 'utf8')).order;
  const words = order.map(loadWord);

  const template = fs.readFileSync(TEMPLATE_FILE, 'utf8');
  const output = template
    .replace('{{TALLY}}', renderTally(words))
    .replace('{{NAV}}', renderNav(words))
    .replace('{{WORDS}}', words.map(renderWord).join('\n'));

  fs.writeFileSync(OUTPUT_FILE, output, 'utf8');
  console.log(`Собрано: ${words.length} слов, ${words.reduce((s, w) => s + w.gifts.length, 0)} даров -> ${OUTPUT_FILE}`);
}

main();
