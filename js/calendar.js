
import { supabase } from './supabase.js';

const calendarEl = document.getElementById('calendar');

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
    dateClick(info){
        location.href =
        'calendar_detail.html?date='
        + info.dateStr;
    },
    eventClick(info){
        location.href =
        'calendar_detail.html?id='
        + info.event.id;
    }
});

calendar.render();

async function loadEvents(){
    const { data, error } = await supabase
        .from('memories')
        .select('*')
        .order('memory_date');

    if(error){
        console.error(error);
        return;
    }

    data.forEach(memory => {
        calendar.addEvent({
            id: memory.id,
            title: memory.title,
            start: memory.memory_date
        });
    });
}

loadEvents();
