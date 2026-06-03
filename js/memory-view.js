import { supabase } from './supabase.js';
import { signUrls } from './storage.js';

const CATEGORIES = [
  { key: '음식점', icon: '🍽️' },
  { key: '카페', icon: '☕' },
  { key: '소품샵', icon: '🛍️' },
  { key: '영화관', icon: '🎬' },
  { key: '공원', icon: '🌿' },
  { key: '오락실', icon: '🕹️' },
  { key: '쇼핑몰', icon: '🏬' },
  { key: '기타', icon: '📍' },
];

const params = new URLSearchParams(location.search);
const memoryId = params.get('id');

const dateLabelEl = document.getElementById('viewDateLabel');
const titleEl = document.getElementById('viewTitle');
const placeEl = document.getElementById('viewPlace');
const contentEl = document.getElementById('viewContent');
const photoListEl = document.getElementById('viewPhotoList');
const heroEl = document.getElementById('viewHero');
const editLinkEl = document.getElementById('editMemoryLink');
const routeListEl = document.getElementById('viewRouteList');
const routeEmptyEl = document.getElementById('viewRouteEmpty');
const routeMapLinkEl = document.getElementById('viewRouteMapLink');
const deleteBtn = document.getElementById('deleteMemory');

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDateLabel(dateText) {
  if (!dateText) return '데이트 상세';

  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateText;

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });
}

function kakaoPlaceUrl(place) {
  return `https://map.kakao.com/link/search/${encodeURIComponent(place)}`;
}

function kakaoRouteUrl(items) {
  if (items.length < 2) {
    return items[0]?.url || kakaoPlaceUrl(items[0]?.place || '카카오맵');
  }

  const start = encodeURIComponent(items[0].place);
  const end = encodeURIComponent(items[items.length - 1].place);
  return `https://map.kakao.com/?sName=${start}&eName=${end}`;
}

function readLocalRoutes(id) {
  try {
    return JSON.parse(localStorage.getItem(`memory-routes:${id}`) || '[]');
  } catch {
    return [];
  }
}

function categoryInfo(key) {
  return CATEGORIES.find(c => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

function renderRoutes(routes) {
  if (!routeEmptyEl || !routeListEl) return;
  routeEmptyEl.hidden = routes.length > 0;
  routeListEl.innerHTML = routes.map((item, index) => {
    const cat = categoryInfo(item.category);
    return `
      <li class="route-item">
        <span class="route-number">${index + 1}</span>
        <div class="route-content">
          <strong>${escapeHtml(item.place)}</strong>
          <span class="route-category">${cat.icon} ${escapeHtml(cat.key)}</span>
        </div>
      </li>`;
  }).join('');

  if (routes.length && routeMapLinkEl) {
    routeMapLinkEl.href = kakaoRouteUrl(routes);
    routeMapLinkEl.textContent = routes.length > 1 ? '전체 경로' : '카카오맵';
  }
}

async function loadRoutes(id) {
  try {
    const { data, error } = await supabase
      .from('memory_routes')
      .select('place,map_url,sort_order,category')
      .eq('memory_id', id)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return (data || []).map((item) => ({
      place: item.place,
      url: item.map_url || kakaoPlaceUrl(item.place),
      category: item.category || '기타',
    }));
  } catch (error) {
    console.warn('memory_routes table is unavailable. Using local route data.', error);
    return readLocalRoutes(id);
  }
}

async function deleteMemory(){

  if(!memoryId){
    return;
  }

  const confirmed =
  confirm(
    '정말 삭제할까요?'
  );

  if(!confirmed){
    return;
  }

  try{

    const { error } =
    await supabase
    .from('memories')
    .delete()
    .eq('id', memoryId);

    if(error){
      throw error;
    }

    localStorage.removeItem(
      `memory-routes:${memoryId}`
    );

    alert('삭제되었습니다.');

    location.href =
    'calendar.html';

  }catch(error){

    console.error(error);

    alert(
      error.message
    );

  }

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

async function loadMemory() {
  if (!memoryId) {
    location.href = 'calendar.html';
    return;
  }

  const { data: memory, error } = await supabase
    .from('memories')
    .select('*')
    .eq('id', memoryId)
    .single();

  if (error || !memory) {
    location.href = 'calendar.html';
    return;
  }

  const { data: photos, error: photoError } = await supabase
    .from('photos')
    .select('photo_url,id')
    .eq('memory_id', memoryId)
    .order('id', { ascending: true });

  if (photoError) console.error(photoError);

  const rawPaths = (photos || []).map(p => p.photo_url).filter(Boolean);
  const rawThumb = memory.thumbnail_url || photos?.[0]?.photo_url || '';
  const allPaths = rawThumb ? [rawThumb, ...rawPaths] : rawPaths;
  const signed = allPaths.length ? await signUrls(allPaths) : new Map();

  const thumbUrl = rawThumb ? (signed.get(rawThumb) || '') : '';
  if (thumbUrl && heroEl) {
    heroEl.style.backgroundImage = `linear-gradient(180deg, rgba(46, 46, 46, 0.08), rgba(46, 46, 46, 0.58)), url("${thumbUrl}")`;
    heroEl.classList.add('has-photo');
  }

  dateLabelEl.textContent = formatDateLabel(memory.memory_date);
  titleEl.textContent = memory.title || '데이트 기록';
  if (placeEl) placeEl.textContent = memory.place || '장소 미입력';
  contentEl.textContent = memory.content || '기록이 없습니다.';
  editLinkEl.href = `calendar_detail.html?id=${memory.id}`;

  const photoUrls = (photos || []).map(p => signed.get(p.photo_url) || '').filter(Boolean);
  if (photoListEl && photoUrls.length) {
    const photoSection = document.getElementById('photoSection');
    if (photoSection) photoSection.hidden = false;

    if (photoUrls.length === 1) {
      photoListEl.innerHTML = `<div class="photo-single"><img src="${escapeHtml(photoUrls[0])}" alt="데이트 사진"></div>`;
    } else {
      const slides = photoUrls.map(url =>
        `<div class="carousel-slide"><img src="${escapeHtml(url)}" alt="데이트 사진"></div>`
      ).join('');
      const dots = photoUrls.map((_, i) =>
        `<button class="carousel-dot${i === 0 ? ' active' : ''}" data-i="${i}" aria-label="${i + 1}번째 사진"></button>`
      ).join('');
      photoListEl.innerHTML = `
        <div class="photo-carousel">
          <div class="carousel-track">${slides}</div>
          <div class="carousel-dots">${dots}</div>
        </div>`;
      initCarousel(photoListEl.querySelector('.photo-carousel'));
    }
  }

  const routes = await loadRoutes(memoryId);
  renderRoutes(routes);

  deleteBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    deleteMemory();
  });
}

loadMemory();
