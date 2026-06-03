import { supabase } from './supabase.js';
import { signUrls } from './storage.js';

const grid = document.getElementById('galleryGrid');

function escapeHtml(v) {
  return String(v || '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(dateText) {
  if (!dateText) return '';
  const d = new Date(`${dateText}T00:00:00`);
  if (isNaN(d)) return dateText;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

function initCarousel(el) {
  const track = el.querySelector('.carousel-track');
  const dots = Array.from(el.querySelectorAll('.carousel-dot'));
  let current = 0;

  function goTo(index) {
    current = Math.max(0, Math.min(index, dots.length - 1));
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  let startX = 0;
  el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) goTo(current + (diff > 0 ? 1 : -1));
  });
}

const [{ data: memories }, { data: photos, error }] = await Promise.all([
  supabase.from('memories').select('id,title,memory_date').order('memory_date', { ascending: false }),
  supabase.from('photos').select('photo_url,memory_id').order('id', { ascending: true }),
]);

if (error) console.error(error);

const photosByMemory = new Map();
for (const p of photos || []) {
  if (!photosByMemory.has(p.memory_id)) photosByMemory.set(p.memory_id, []);
  photosByMemory.get(p.memory_id).push(p.photo_url);
}

const allPaths = (photos || []).map(p => p.photo_url);
const signed = allPaths.length ? await signUrls(allPaths) : new Map();

const memoriesWithPhotos = (memories || []).filter(m => photosByMemory.has(m.id));

if (!memoriesWithPhotos.length) {
  grid.innerHTML = '<p class="route-empty">아직 사진이 없습니다.</p>';
} else {
  grid.innerHTML = memoriesWithPhotos.map(m => {
    const urls = (photosByMemory.get(m.id) || [])
      .map(p => signed.get(p) || '').filter(Boolean);
    if (!urls.length) return '';

    const header = `
      <div class="gallery-card-header">
        <span class="page-kicker">${escapeHtml(formatDate(m.memory_date))}</span>
        <strong>${escapeHtml(m.title || '데이트 기록')}</strong>
      </div>`;

    if (urls.length === 1) {
      return `<div class="gallery-card">${header}
        <div class="photo-single"><img src="${escapeHtml(urls[0])}" alt="데이트 사진" loading="lazy"></div>
      </div>`;
    }

    const slides = urls.map(url =>
      `<div class="carousel-slide"><img src="${escapeHtml(url)}" alt="데이트 사진" loading="lazy"></div>`
    ).join('');
    const dots = urls.map((_, i) =>
      `<span class="carousel-dot${i === 0 ? ' active' : ''}" data-i="${i}" role="button" tabindex="0" aria-label="${i + 1}번째 사진">♥</span>`
    ).join('');

    return `<div class="gallery-card">${header}
      <div class="photo-carousel">
        <div class="carousel-track">${slides}</div>
        <div class="carousel-dots">${dots}</div>
      </div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.photo-carousel').forEach(initCarousel);
}
