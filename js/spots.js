import { supabase } from './supabase.js';

const CATS = {
  '카페': '☕', '음식점': '🍽️', '공원': '🌿',
  '소품샵': '🛍️', '영화관': '🎬', '오락실': '🕹️',
  '쇼핑몰': '🏬', '기타': '📍',
};

let spots = [];
let activeCat = '';
let activeStatus = '';
let selectedFormCat = '카페';
let currentUserId = null;

const listEl = document.getElementById('spotsList');

async function init() {
  const { data: { user } } = await supabase.auth.getUser();
  currentUserId = user?.id;
  await loadSpots();
  setupFilters();
  setupSheet();
}

async function loadSpots() {
  const { data } = await supabase
    .from('spots')
    .select('*')
    .order('created_at', { ascending: false });
  spots = data || [];
  render();
}

function render() {
  let filtered = spots;
  if (activeCat) filtered = filtered.filter(s => s.category === activeCat);
  if (activeStatus !== '') filtered = filtered.filter(s => String(s.is_completed) === activeStatus);

  if (filtered.length === 0) {
    listEl.innerHTML = `<p class="spots-empty">아직 장소가 없어요 🗺️<br><span>+ 버튼으로 가고 싶은 곳을 추가해 보세요</span></p>`;
    return;
  }

  listEl.innerHTML = filtered.map(spot => {
    const icon = CATS[spot.category] || '📍';
    const badge = spot.is_completed
      ? `<span class="spot-badge completed">방문완료 ✓</span>`
      : `<span class="spot-badge pending">미방문</span>`;
    const countText = spot.visit_count > 0 ? `${spot.visit_count}번 방문` : '';
    return `
      <div class="spot-card">
        <div class="spot-card-top">
          <div class="spot-icon-sm">${icon}</div>
          <div class="spot-info">
            <strong>${escapeHtml(spot.name)}</strong>
            ${spot.address ? `<span class="spot-addr">📍 ${escapeHtml(spot.address)}</span>` : ''}
          </div>
          <div class="spot-card-meta">
            ${badge}
            ${countText ? `<span class="spot-visit-count">${countText}</span>` : ''}
          </div>
        </div>
        ${spot.note ? `<p class="spot-note">${escapeHtml(spot.note)}</p>` : ''}
        <div class="spot-card-actions">
          <button class="spot-toggle-btn ${spot.is_completed ? 'done' : ''}" data-id="${spot.id}" data-done="${spot.is_completed}">
            ${spot.is_completed ? '✓ 방문완료' : '방문 체크'}
          </button>
          <a class="spot-detail-link" href="spot-detail.html?id=${spot.id}">상세 →</a>
        </div>
      </div>`;
  }).join('');

  listEl.querySelectorAll('.spot-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newDone = btn.dataset.done !== 'true';
      await supabase.from('spots').update({ is_completed: newDone }).eq('id', btn.dataset.id);
      await loadSpots();
    });
  });
}

function setupFilters() {
  document.getElementById('catFilter').addEventListener('click', e => {
    const btn = e.target.closest('[data-cat]');
    if (!btn || btn.closest('#formCatChips')) return;
    document.querySelectorAll('#catFilter .cat-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCat = btn.dataset.cat;
    render();
  });

  document.getElementById('statusFilter').addEventListener('click', e => {
    const btn = e.target.closest('.spot-status-btn');
    if (!btn) return;
    document.querySelectorAll('.spot-status-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeStatus = btn.dataset.status;
    render();
  });
}

function setupSheet() {
  const overlay = document.getElementById('sheetOverlay');
  const sheet = document.getElementById('addSheet');

  document.getElementById('addSpotBtn').addEventListener('click', openSheet);
  overlay.addEventListener('click', closeSheet);

  document.getElementById('formCatChips').addEventListener('click', e => {
    const btn = e.target.closest('.cat-chip');
    if (!btn) return;
    document.querySelectorAll('#formCatChips .cat-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    selectedFormCat = btn.dataset.cat;
  });

  document.getElementById('saveSpotBtn').addEventListener('click', saveSpot);
}

function openSheet() {
  document.getElementById('sheetOverlay').hidden = false;
  document.getElementById('addSheet').classList.add('open');
}

function closeSheet() {
  document.getElementById('sheetOverlay').hidden = true;
  document.getElementById('addSheet').classList.remove('open');
}

async function saveSpot() {
  const name = document.getElementById('spotName').value.trim();
  const msg = document.getElementById('spotSaveMsg');
  if (!name) {
    msg.textContent = '장소명을 입력해 주세요.';
    msg.dataset.type = 'error';
    return;
  }

  msg.textContent = '저장 중...';
  msg.dataset.type = '';

  const { error } = await supabase.from('spots').insert({
    name,
    category: selectedFormCat,
    address: document.getElementById('spotAddress').value.trim() || null,
    kakao_map_url: document.getElementById('spotMapUrl').value.trim() || null,
    note: document.getElementById('spotNote').value.trim() || null,
    created_by: currentUserId,
  });

  if (error) {
    msg.textContent = '저장에 실패했어요.';
    msg.dataset.type = 'error';
    return;
  }

  closeSheet();
  resetForm();
  await loadSpots();
}

function resetForm() {
  ['spotName', 'spotAddress', 'spotMapUrl', 'spotNote'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('spotSaveMsg').textContent = '';
  selectedFormCat = '카페';
  document.querySelectorAll('#formCatChips .cat-chip').forEach((c, i) => {
    c.classList.toggle('active', i === 0);
  });
}

function escapeHtml(v) {
  return String(v || '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

init();
