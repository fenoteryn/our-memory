import { supabase } from './supabase.js';
import { signUrls } from './storage.js';

const calendarEl = document.getElementById('calendar');
const memoriesByDate = new Map();

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function firstPhotoByMemory(photos = []) {
  return photos.reduce((map, photo) => {
    if (!map.has(photo.memory_id)) {
      map.set(photo.memory_id, photo.photo_url);
    }
    return map;
  }, new Map());
}

const calendar = new FullCalendar.Calendar(calendarEl, {
  initialView: 'dayGridMonth',
  locale: 'ko',
  height: '100%',
  expandRows: true,
  fixedWeekCount: true,
  showNonCurrentDates: true,
  dayMaxEvents: 1,
  moreLinkText: '더보기',
  headerToolbar: {
    left: 'prev',
    center: 'title',
    right: 'next'
  },
  buttonText: {
    today: '오늘'
  },
  dateClick(info) {
    const memory = memoriesByDate.get(info.dateStr);

    if (memory) {
      location.href = `calendar_view.html?id=${memory.id}`;
      return;
    }

    location.href = `calendar_detail.html?date=${info.dateStr}`;
  },
  eventClick(info) {
    location.href = `calendar_view.html?id=${info.event.id}`;
  },
  eventContent(info) {
    const thumbnailUrl = info.event.extendedProps.thumbnailUrl;
    const title = escapeHtml(info.event.title || '데이트 기록');

    if (!thumbnailUrl) {
      return { html: `<div class="memory-event-title">${title}</div>` };
    }

    return {
      html: `
        <div class="memory-event-card">
          <img src="${escapeHtml(thumbnailUrl)}" alt="">
          <span>${title}</span>
        </div>
      `
    };
  }
});

calendar.render();

async function loadEvents() {
  const { data: memories, error } = await supabase
    .from('memories')
    .select('*')
    .order('memory_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const memoryIds = (memories || []).map((memory) => memory.id);
  let photoMap = new Map();

  if (memoryIds.length) {
    const { data: photos, error: photoError } = await supabase
      .from('photos')
      .select('memory_id,photo_url,id')
      .in('memory_id', memoryIds)
      .order('id', { ascending: true });

    if (photoError) {
      console.error(photoError);
    } else {
      photoMap = firstPhotoByMemory(photos || []);
    }
  }

  const rawThumbs = (memories || []).map(m => m.thumbnail_url || photoMap.get(m.id) || '').filter(Boolean);
  const signed = rawThumbs.length ? await signUrls(rawThumbs) : new Map();

  (memories || []).forEach((memory) => {
    if (memoriesByDate.has(memory.memory_date)) return;

    const raw = memory.thumbnail_url || photoMap.get(memory.id) || '';
    memoriesByDate.set(memory.memory_date, memory);

    calendar.addEvent({
      id: memory.id,
      title: memory.title || '데이트 기록',
      start: memory.memory_date,
      allDay: true,
      extendedProps: {
        thumbnailUrl: raw ? (signed.get(raw) || '') : ''
      }
    });
  });
}

loadEvents();
