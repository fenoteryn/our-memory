
import { supabase } from './supabase.js';

const calendarEl = document.getElementById('calendar');

const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'ko',
    dateClick(info){
        location.href =
        'memory-detail.html?date='
        + info.dateStr;
    },
    eventClick(info){
        location.href =
        'memory-detail.html?id='
        + info.event.id;
    }
});

calendar.render();

let selectedDate = null;

function openModal(date){
    selectedDate = date;
    document.getElementById('memoryModal').style.display = 'block';
}

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

document.getElementById('saveBtn').onclick = async () => {

    const { data:userData } = await supabase.auth.getUser();

    const { error } = await supabase
        .from('memories')
        .insert({
            user_id: userData.user.id,
            title: document.getElementById('title').value,
            place: document.getElementById('place').value,
            content: document.getElementById('content').value,
            memory_date: selectedDate
        });

    if(error){
        alert(error.message);
        return;
    }

    location.reload();
};
