import { supabase } from './supabase.js';

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

function renderRoutes(routes) {
  routeEmptyEl.hidden = routes.length > 0;
  routeListEl.innerHTML = routes.map((item, index) => `
    <li class="route-item">
      <span class="route-number">${index + 1}</span>
      <div class="route-content">
        <strong>${escapeHtml(item.place)}</strong>
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">카카오맵에서 보기</a>
      </div>
    </li>
  `).join('');

  if (routes.length) {
    routeMapLinkEl.href = kakaoRouteUrl(routes);
    routeMapLinkEl.textContent = routes.length > 1 ? '전체 경로' : '카카오맵';
  }
}

async function loadRoutes(id) {
  try {
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

  const firstPhoto = memory.thumbnail_url || photos?.[0]?.photo_url || '';
  if (firstPhoto) {
    heroEl.style.backgroundImage = `linear-gradient(180deg, rgba(46, 46, 46, 0.08), rgba(46, 46, 46, 0.58)), url("${firstPhoto}")`;
    heroEl.classList.add('has-photo');
  }

  dateLabelEl.textContent = formatDateLabel(memory.memory_date);
  titleEl.textContent = memory.title || '데이트 기록';
  placeEl.textContent = memory.place || '장소 미입력';
  contentEl.textContent = memory.content || '기록이 없습니다.';
  editLinkEl.href = `calendar_detail.html?id=${memory.id}`;

  photoListEl.innerHTML = (photos || []).map((photo) => (
    `<img src="${escapeHtml(photo.photo_url)}" alt="데이트 사진">`
  )).join('');

  const routes = await loadRoutes(memoryId);
  renderRoutes(routes);

  deleteBtn.addEventListener(
  'click',
  (event)=>{

      event.preventDefault();

      deleteMemory();

  });
}

loadMemory();
