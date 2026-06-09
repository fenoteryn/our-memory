import { supabase } from './supabase.js';

const CATS = {
  '카페': '☕', '음식점': '🍽️', '공원': '🌿',
  '소품샵': '🛍️', '영화관': '🎬', '오락실': '🕹️',
  '쇼핑몰': '🏬', '기타': '📍',
};

const params = new URLSearchParams(location.search);
const spotId = params.get('id');
let currentUserId = null;
let spot = null;

async function init() {
  if (!spotId) { location.href = 'spots.html'; return; }
  const { data: { user } } = await supabase.auth.getUser();
  currentUserId = user?.id;
  await loadSpot();
}

async function loadSpot() {
  const { data, error } = await supabase.from('spots').select('*').eq('id', spotId).single();
  if (error || !data) {
    document.getElementById('spotDetail').innerHTML = '<p style="text-align:center;color:var(--subtext);margin-top:60px;font-weight:700">장소를 찾을 수 없어요.</p>';
    return;
  }
  spot = data;
  renderSpot();
  await loadReviews();
}

function renderSpot() {
  const icon = CATS[spot.category] || '📍';
  const container = document.getElementById('spotDetail');

  container.innerHTML = `
    <div class="memory-card">
      <div class="spot-detail-header">
        <div class="spot-icon-lg">${icon}</div>
        <div style="min-width:0">
          <h1 style="font-size:clamp(20px,5vw,28px);margin-bottom:6px">${escapeHtml(spot.name)}</h1>
          <span class="route-category">${escapeHtml(spot.category)}</span>
        </div>
      </div>

      ${spot.address ? `<p class="spot-detail-addr">📍 ${escapeHtml(spot.address)}</p>` : ''}
      ${spot.note ? `<p class="spot-detail-note">${escapeHtml(spot.note)}</p>` : ''}

      ${spot.kakao_map_url ? `
        <a class="map-open-btn" href="${escapeHtml(spot.kakao_map_url)}" target="_blank" rel="noopener noreferrer">
          🗺️ 카카오맵에서 보기
        </a>` : ''}

      <div class="visit-counter-section">
        <div class="visit-info">
          <div class="visit-count-row">
            <span class="visit-count-big">${spot.visit_count}</span>
            <span class="visit-label">번 방문</span>
          </div>
          ${spot.last_visited_at ? `<span class="visit-last">최근 ${formatDate(spot.last_visited_at)}</span>` : '<span class="visit-last">아직 방문 전</span>'}
        </div>
        <div class="visit-actions">
          <button class="visit-inc-btn" id="visitIncBtn">방문 +1</button>
          <button class="visit-toggle-btn ${spot.is_completed ? 'done' : ''}" id="visitToggleBtn">
            ${spot.is_completed ? '✓ 방문완료' : '미방문'}
          </button>
        </div>
      </div>
    </div>

    <div class="memory-card">
      <h2 style="margin-bottom:12px">후기 💬</h2>
      <div class="comment-list" id="reviewList"></div>
      <div class="comment-form" style="margin-top:12px">
        <textarea id="reviewInput" placeholder="후기를 남겨 보세요" style="min-height:72px"></textarea>
        <button id="reviewSubmitBtn">등록</button>
      </div>
    </div>

    <button class="spot-delete-btn" id="deleteSpotBtn">장소 삭제</button>
  `;

  document.getElementById('visitIncBtn').addEventListener('click', incrementVisit);
  document.getElementById('visitToggleBtn').addEventListener('click', toggleComplete);
  document.getElementById('reviewSubmitBtn').addEventListener('click', submitReview);
  document.getElementById('deleteSpotBtn').addEventListener('click', deleteSpot);
}

async function incrementVisit() {
  const { data } = await supabase
    .from('spots')
    .update({
      visit_count: (spot.visit_count || 0) + 1,
      last_visited_at: new Date().toISOString().split('T')[0],
      is_completed: true,
    })
    .eq('id', spotId)
    .select()
    .single();
  if (data) { spot = data; renderSpot(); await loadReviews(); }
}

async function toggleComplete() {
  const { data } = await supabase
    .from('spots')
    .update({ is_completed: !spot.is_completed })
    .eq('id', spotId)
    .select()
    .single();
  if (data) { spot = data; renderSpot(); await loadReviews(); }
}

async function loadReviews() {
  const el = document.getElementById('reviewList');
  if (!el) return;

  const { data } = await supabase
    .from('spot_reviews')
    .select('*')
    .eq('spot_id', spotId)
    .order('created_at');

  if (!data || data.length === 0) {
    el.innerHTML = `<p style="color:var(--subtext);font-size:13px;font-weight:700;text-align:center;padding:12px 0">아직 후기가 없어요. 첫 번째 후기를 남겨 보세요!</p>`;
    return;
  }

  el.innerHTML = data.map(r => {
    const mine = r.user_id === currentUserId;
    const delBtn = mine
      ? `<button class="comment-delete" data-id="${r.id}" aria-label="삭제">×</button>`
      : '';
    return `
      <div class="comment-item ${mine ? 'mine' : 'theirs'}">
        <div class="comment-bubble">${escapeHtml(r.content)}${delBtn}</div>
        <span class="comment-time">${formatTime(r.created_at)}</span>
      </div>`;
  }).join('');

  el.querySelectorAll('.comment-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabase.from('spot_reviews').delete().eq('id', btn.dataset.id);
      await loadReviews();
    });
  });
}

async function submitReview() {
  const input = document.getElementById('reviewInput');
  const content = input.value.trim();
  if (!content) return;
  const btn = document.getElementById('reviewSubmitBtn');
  btn.disabled = true;
  await supabase.from('spot_reviews').insert({
    spot_id: spotId,
    user_id: currentUserId,
    content,
  });
  input.value = '';
  btn.disabled = false;
  await loadReviews();
}

async function deleteSpot() {
  if (!confirm('이 장소를 삭제할까요?\n후기도 모두 삭제됩니다.')) return;
  await supabase.from('spots').delete().eq('id', spotId);
  location.href = 'spots.html';
}

function escapeHtml(v) {
  return String(v || '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatTime(ts) {
  return new Date(ts).toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

init();
