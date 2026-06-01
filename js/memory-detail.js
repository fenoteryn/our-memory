import { supabase } from './supabase.js';

const params = new URLSearchParams(location.search);
const memoryId = params.get('id');
let memoryDate = params.get('date');

const titleEl = document.getElementById('title');
const placeEl = document.getElementById('place');
const contentEl = document.getElementById('content');
const ratingEl = document.getElementById('rating');
const photosEl = document.getElementById('photos');
const photoListEl = document.getElementById('photoList');
const selectedFilesEl = document.getElementById('selectedFiles');
const saveBtn = document.getElementById('saveBtn');
const messageEl = document.getElementById('formMessage');
const dateLabelEl = document.getElementById('memoryDateLabel');
const routePlaceEl = document.getElementById('routePlace');
const routeUrlEl = document.getElementById('routeUrl');
const addRouteBtn = document.getElementById('addRouteBtn');
const routeListEl = document.getElementById('routeList');
const routeEmptyEl = document.getElementById('routeEmpty');
const routeMapLinkEl = document.getElementById('routeMapLink');

let routeItems = [];

function setMessage(message, type = '') {
  if (!messageEl) return;
  messageEl.textContent = message;
  messageEl.dataset.type = type;
}

function formatDateLabel(dateText) {
  if (!dateText) return '데이트 기록';

  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateText;

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeUrl(url) {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
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

function routeStorageKey(id = memoryId) {
  return id ? `memory-routes:${id}` : `memory-routes:date:${memoryDate || 'draft'}`;
}

function saveRoutesToLocal(id = memoryId) {
  localStorage.setItem(routeStorageKey(id), JSON.stringify(routeItems));
}

function readLocalRoutes(id = memoryId) {
  try {
    return JSON.parse(localStorage.getItem(routeStorageKey(id)) || '[]');
  } catch {
    return [];
  }
}

function setRating(value) {
  const rating = Number(value) || 5;
  ratingEl.value = String(rating);

  document.querySelectorAll('#ratingWrap .rating-star').forEach((star) => {
    star.classList.toggle('active', Number(star.dataset.rate) <= rating);
  });
}

function renderSelectedFiles() {
  const files = Array.from(photosEl.files || []);

  selectedFilesEl.innerHTML = files.map((file) => (
    `<span>${escapeHtml(file.name)}</span>`
  )).join('');
}

function renderRoutes() {
  routeEmptyEl.hidden = routeItems.length > 0;
  routeListEl.innerHTML = routeItems.map((item, index) => `
    <li class="route-item">
      <span class="route-number">${index + 1}</span>
      <div class="route-content">
        <strong>${escapeHtml(item.place)}</strong>
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">카카오맵에서 보기</a>
      </div>
      <button type="button" class="route-remove" data-index="${index}" aria-label="경로 삭제">×</button>
    </li>
  `).join('');

  if (routeItems.length) {
    routeMapLinkEl.href = kakaoRouteUrl(routeItems);
    routeMapLinkEl.textContent = routeItems.length > 1 ? '전체 경로' : '카카오맵';
  } else {
    routeMapLinkEl.href = 'https://map.kakao.com';
    routeMapLinkEl.textContent = '카카오맵';
  }

  saveRoutesToLocal();
}

function addRouteItem() {
  const place = routePlaceEl.value.trim();
  const customUrl = normalizeUrl(routeUrlEl.value);

  if (!place) {
    setMessage('경로에 추가할 장소명을 입력해 주세요.', 'error');
    routePlaceEl.focus();
    return;
  }

  routeItems.push({
    place,
    url: customUrl || kakaoPlaceUrl(place)
  });

  routePlaceEl.value = '';
  routeUrlEl.value = '';
  setMessage('');
  renderRoutes();
}

async function loadPhotos(id) {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('memory_id', id)
    .order('id', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  photoListEl.innerHTML = (data || []).map((photo) => (
    `<img src="${escapeHtml(photo.photo_url)}" alt="업로드한 데이트 사진">`
  )).join('');
}

async function loadRoutesFromSupabase(id) {
  const { data, error } = await supabase
    .from('memory_routes')
    .select('place,map_url,sort_order')
    .eq('memory_id', id)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  return (data || []).map((item) => ({
    place: item.place,
    url: item.map_url || kakaoPlaceUrl(item.place)
  }));
}

async function loadMemory() {
  if (!memoryId) {
    dateLabelEl.textContent = formatDateLabel(memoryDate);
    routeItems = readLocalRoutes();
    renderRoutes();
    return;
  }

  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('id', memoryId)
    .single();

  if (error) {
    setMessage(error.message, 'error');
    return;
  }

  if (!data) return;

  memoryDate = data.memory_date;
  dateLabelEl.textContent = formatDateLabel(memoryDate);
  titleEl.value = data.title || '';
  placeEl.value = data.place || '';
  contentEl.value = data.content || '';
  setRating(data.rating || 5);

  routeItems = readLocalRoutes();

  try {
    const remoteRoutes = await loadRoutesFromSupabase(memoryId);
    if (remoteRoutes.length) {
      routeItems = remoteRoutes;
      saveRoutesToLocal();
    }
  } catch (routeError) {
    console.warn('memory_routes table is unavailable. Using local route data.', routeError);
  }

  renderRoutes();
  await loadPhotos(memoryId);
}

function makeStoragePath(userId, memoryRecordId, file) {
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const uniqueName = `${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

  return `${userId}/${memoryRecordId}/${uniqueName}`;
}

async function uploadPhotos(userId, memoryRecordId) {
  const files = Array.from(photosEl.files || []);

  for (const file of files) {
    const filePath = makeStoragePath(userId, memoryRecordId, file);

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase
      .from('photos')
      .insert({
        memory_id: memoryRecordId,
        user_id: userId,
        photo_url: urlData.publicUrl
      });

    if (insertError) throw insertError;
  }
}

async function syncRoutesToSupabase(userId, memoryRecordId) {
  saveRoutesToLocal(memoryRecordId);

  try {
    await supabase
      .from('memory_routes')
      .delete()
      .eq('memory_id', memoryRecordId);

    if (!routeItems.length) return;

    const rows = routeItems.map((item, index) => ({
      memory_id: memoryRecordId,
      user_id: userId,
      place: item.place,
      map_url: item.url,
      sort_order: index + 1
    }));

    const { error } = await supabase
      .from('memory_routes')
      .insert(rows);

    if (error) throw error;
  } catch (routeError) {
    console.warn('Route data was saved locally only.', routeError);
  }
}

async function saveMemory() {
  setMessage('');
  saveBtn.disabled = true;
  saveBtn.textContent = '저장 중...';

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!userData.user) throw new Error('로그인이 필요합니다.');
    if (!memoryDate) throw new Error('캘린더에서 날짜를 다시 선택해 주세요.');

    const payload = {
      user_id: userData.user.id,
      title: titleEl.value.trim(),
      place: placeEl.value.trim(),
      content: contentEl.value.trim(),
      rating: Number(ratingEl.value),
      memory_date: memoryDate
    };

    let currentMemoryId = memoryId;

    if (memoryId) {
      const { error } = await supabase
        .from('memories')
        .update(payload)
        .eq('id', memoryId);

      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('memories')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      currentMemoryId = data.id;
    }

    await syncRoutesToSupabase(userData.user.id, currentMemoryId);
    await uploadPhotos(userData.user.id, currentMemoryId);

    setMessage('저장되었습니다.', 'success');
    location.href = 'calendar.html';
  } catch (error) {
    console.error(error);
    setMessage(error.message || '저장 중 문제가 발생했습니다.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '저장하기';
  }
}

document.querySelectorAll('#ratingWrap .rating-star').forEach((star) => {
  star.addEventListener('click', () => {
    setRating(star.dataset.rate);
  });
});

routeListEl.addEventListener('click', (event) => {
  const removeBtn = event.target.closest('.route-remove');
  if (!removeBtn) return;

  routeItems.splice(Number(removeBtn.dataset.index), 1);
  renderRoutes();
});

addRouteBtn.addEventListener('click', addRouteItem);
routePlaceEl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addRouteItem();
  }
});

photosEl.addEventListener('change', renderSelectedFiles);
saveBtn.addEventListener('click', saveMemory);

setRating(ratingEl.value);
loadMemory();
