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
let memoryDate = params.get('date');

const titleEl = document.getElementById('title');
const contentEl = document.getElementById('content');
const photosEl = document.getElementById('photos');
const photoListEl = document.getElementById('photoList');
const selectedFilesEl = document.getElementById('selectedFiles');
const saveBtn = document.getElementById('saveBtn');
const messageEl = document.getElementById('formMessage');
const dateLabelEl = document.getElementById('memoryDateLabel');
const routePlaceEl = document.getElementById('routePlace');
const routeListEl = document.getElementById('routeList');
const routeEmptyEl = document.getElementById('routeEmpty');
const routeMapLinkEl = document.getElementById('routeMapLink');
const addRouteBtn = document.getElementById('addRouteBtn');
const categoryChipsEl = document.getElementById('categoryChips');

let routeItems = [];
let selectedCategory = CATEGORIES[0].key;

function setMessage(msg, type = '') {
  if (!messageEl) return;
  messageEl.textContent = msg;
  messageEl.dataset.type = type;
}

function formatDateLabel(dateText) {
  if (!dateText) return '데이트 기록';
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateText;
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function kakaoPlaceUrl(place) {
  return `https://map.kakao.com/link/search/${encodeURIComponent(place)}`;
}

function kakaoRouteUrl(items) {
  if (items.length < 2) return items[0]?.url || kakaoPlaceUrl(items[0]?.place || '카카오맵');
  return `https://map.kakao.com/?sName=${encodeURIComponent(items[0].place)}&eName=${encodeURIComponent(items[items.length - 1].place)}`;
}

function routeStorageKey(id = memoryId) {
  return id ? `memory-routes:${id}` : `memory-routes:date:${memoryDate || 'draft'}`;
}

function saveRoutesToLocal(id = memoryId) {
  localStorage.setItem(routeStorageKey(id), JSON.stringify(routeItems));
}

function readLocalRoutes(id = memoryId) {
  try { return JSON.parse(localStorage.getItem(routeStorageKey(id)) || '[]'); }
  catch { return []; }
}

function categoryInfo(key) {
  return CATEGORIES.find(c => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

function renderCategoryChips() {
  if (!categoryChipsEl) return;
  categoryChipsEl.innerHTML = CATEGORIES.map(({ key, icon }) =>
    `<button type="button" class="cat-chip${key === selectedCategory ? ' active' : ''}" data-cat="${escapeHtml(key)}">${icon} ${escapeHtml(key)}</button>`
  ).join('');
}

function renderSelectedFiles() {
  if (!selectedFilesEl || !photosEl) return;
  selectedFilesEl.innerHTML = Array.from(photosEl.files || [])
    .map(f => `<span>${escapeHtml(f.name)}</span>`).join('');
}

function renderRoutes() {
  if (!routeEmptyEl || !routeListEl) return;
  routeEmptyEl.hidden = routeItems.length > 0;
  routeListEl.innerHTML = routeItems.map((item, i) => {
    const cat = categoryInfo(item.category);
    return `
      <li class="route-item">
        <span class="route-number">${i + 1}</span>
        <div class="route-content">
          <strong>${escapeHtml(item.place)}</strong>
          <span class="route-category">${cat.icon} ${escapeHtml(cat.key)}</span>
        </div>
        <button type="button" class="route-remove" data-index="${i}" aria-label="삭제">×</button>
      </li>`;
  }).join('');

  if (routeMapLinkEl) {
    routeMapLinkEl.href = routeItems.length ? kakaoRouteUrl(routeItems) : 'https://map.kakao.com';
    routeMapLinkEl.textContent = routeItems.length > 1 ? '전체 경로' : '카카오맵';
  }

  saveRoutesToLocal();
}

function addRouteItem() {
  const place = routePlaceEl?.value.trim();
  if (!place) {
    setMessage('장소명을 입력해 주세요.', 'error');
    routePlaceEl?.focus();
    return;
  }
  routeItems.push({ place, url: kakaoPlaceUrl(place), category: selectedCategory });
  routePlaceEl.value = '';
  setMessage('');
  renderRoutes();
}

async function loadPhotos(id) {
  const { data, error } = await supabase.from('photos').select('*').eq('memory_id', id).order('id', { ascending: false });
  if (error) { console.error(error); return; }
  if (!data?.length || !photoListEl) return;

  const signed = await signUrls(data.map(p => p.photo_url));
  photoListEl.innerHTML = data.map(p => {
    const url = signed.get(p.photo_url) || '';
    return url ? `<img src="${escapeHtml(url)}" alt="데이트 사진">` : '';
  }).join('');
}

async function loadRoutesFromSupabase(id) {
  const { data, error } = await supabase
    .from('memory_routes')
    .select('place,map_url,sort_order,category')
    .eq('memory_id', id)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map(item => ({
    place: item.place,
    url: item.map_url || kakaoPlaceUrl(item.place),
    category: item.category || '기타',
  }));
}

async function loadMemory() {
  if (!memoryId) {
    if (dateLabelEl) dateLabelEl.textContent = formatDateLabel(memoryDate);
    routeItems = readLocalRoutes();
    renderCategoryChips();
    renderRoutes();
    return;
  }

  const { data, error } = await supabase.from('memories').select('*').eq('id', memoryId).single();
  if (error) { setMessage(error.message, 'error'); return; }
  if (!data) return;

  memoryDate = data.memory_date;
  if (dateLabelEl) dateLabelEl.textContent = formatDateLabel(memoryDate);
  if (titleEl) titleEl.value = data.title || '';
  if (contentEl) contentEl.value = data.content || '';

  routeItems = readLocalRoutes();
  try {
    const remote = await loadRoutesFromSupabase(memoryId);
    if (remote.length) { routeItems = remote; saveRoutesToLocal(); }
  } catch (e) {
    console.warn('memory_routes 테이블 사용 불가, 로컬 데이터 사용.', e);
  }

  renderCategoryChips();
  renderRoutes();
  await loadPhotos(memoryId);
}

function makeStoragePath(userId, memId, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  return `${userId}/${memId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
}

async function uploadPhotos(userId, memId) {
  for (const file of Array.from(photosEl?.files || [])) {
    const path = makeStoragePath(userId, memId, file);
    const { error: upErr } = await supabase.storage.from('photos').upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    // path만 저장 (signed URL은 표시 시점에 생성)
    const { error: insErr } = await supabase.from('photos').insert({ memory_id: memId, user_id: userId, photo_url: path });
    if (insErr) throw insErr;
  }
}

async function syncRoutesToSupabase(userId, memId) {
  saveRoutesToLocal(memId);
  try {
    await supabase.from('memory_routes').delete().eq('memory_id', memId);
    if (!routeItems.length) return;
    const { error } = await supabase.from('memory_routes').insert(
      routeItems.map((item, i) => ({
        memory_id: memId,
        user_id: userId,
        place: item.place,
        map_url: item.url,
        category: item.category || '기타',
        sort_order: i + 1,
      }))
    );
    if (error) throw error;
  } catch (e) {
    console.warn('경로는 로컬에만 저장됩니다.', e);
  }
}

async function saveMemory() {
  setMessage('');
  saveBtn.disabled = true;
  saveBtn.textContent = '저장 중...';
  try {
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    if (!user) throw new Error('로그인이 필요합니다.');
    if (!memoryDate) throw new Error('캘린더에서 날짜를 다시 선택해 주세요.');

    const payload = {
      user_id: user.id,
      title: titleEl?.value.trim() || '',
      content: contentEl?.value.trim() || '',
      memory_date: memoryDate,
    };

    let currentId = memoryId;
    if (memoryId) {
      const { error } = await supabase.from('memories').update(payload).eq('id', memoryId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from('memories').insert(payload).select().single();
      if (error) throw error;
      currentId = data.id;
    }

    await syncRoutesToSupabase(user.id, currentId);
    await uploadPhotos(user.id, currentId);

    setMessage('저장되었습니다.', 'success');
    location.href = 'calendar.html';
  } catch (e) {
    console.error(e);
    setMessage(e.message || '저장 중 문제가 발생했습니다.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '저장하기';
  }
}

categoryChipsEl?.addEventListener('click', e => {
  const chip = e.target.closest('.cat-chip');
  if (!chip) return;
  selectedCategory = chip.dataset.cat;
  renderCategoryChips();
});

routeListEl?.addEventListener('click', e => {
  const btn = e.target.closest('.route-remove');
  if (!btn) return;
  routeItems.splice(Number(btn.dataset.index), 1);
  renderRoutes();
});

addRouteBtn?.addEventListener('click', addRouteItem);
routePlaceEl?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); addRouteItem(); }
});
photosEl?.addEventListener('change', renderSelectedFiles);
saveBtn?.addEventListener('click', saveMemory);

loadMemory();
