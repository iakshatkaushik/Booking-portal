// Initial load of the schedule
document.addEventListener('DOMContentLoaded', () => {
    renderPublicSchedule();
    // Auto-refresh every 30 seconds
    setInterval(renderPublicSchedule, 30000);
});

/**
 * Renders the public schedule table on index.html.
 * Fetches slots from the backend API and displays them by day and time.
 */
async function renderPublicSchedule() {
    const scheduleBody = document.getElementById('schedule-table-body');
    scheduleBody.innerHTML = ''; // Clear existing schedule

    try {
        const response = await fetch('http://127.0.0.1:5000/api/public_schedule');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const slots = await response.json(); // Backend returns array of slot objects

        const timeSlots = generateTimeSlots(); // Get the predefined time slots using a helper function that creates time intervals like: ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", ...] which ensures that the table always has the same rows (one per time period)

        // Prepare a map for easy lookup: timeSlot -> day -> [slot details]
        const scheduleMap = {};
        timeSlots.forEach(time => {
            scheduleMap[time] = {
                'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [], 'Friday': []
            };
        });

        slots.forEach(slot => {
            if (scheduleMap[slot.time] && scheduleMap[slot.time][slot.day]) {
                scheduleMap[slot.time][slot.day].push(slot);
            }
        });

        // Populate the table
        timeSlots.forEach(time => {
            const row = document.createElement('tr');
            row.classList.add('hover:bg-light-blue-100'); // Tailwind class for hover effect

            const timeCell = document.createElement('td');
            timeCell.classList.add('py-2', 'px-4', 'border-b', 'border-gray-200', 'font-medium');
            timeCell.textContent = time;
            row.appendChild(timeCell);

            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
            days.forEach(day => {
                const cell = document.createElement('td');
                cell.classList.add('py-2', 'px-4', 'border-b', 'border-gray-200');

                const daySlots = scheduleMap[time][day];
                if (daySlots.length > 0) {
                    // Display details for each slot in this cell
                    daySlots.forEach(s => {
                        const div = document.createElement('div');
                        div.classList.add('mb-1');
                        div.innerHTML = `<span class="font-semibold">${s.groupName}</span> (${s.lab}) <br> <span class="text-sm text-gray-600">${s.course}</span>`;
                        cell.appendChild(div);
                    });
                } else {
                    cell.textContent = '-'; // No slot
                }
                row.appendChild(cell);
            });
            scheduleBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error fetching public schedule:', error);
        scheduleBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-red-600">Failed to load schedule. Please try again later.</td></tr>`;
    }
}

/**
 * Generates the fixed one-hour time slots with 10-min buffer.
 * @returns {string[]} An array of time slot strings (e.g., "09:00 - 10:00").
 */
function generateTimeSlots() {
    const slots = [];
    let startMinutes = 9 * 60; // Start at 9:00 AM
    const slotDuration = 50;   // 50-minute slot
    const buffer = 10;         // 10-minute break
    const numberOfSlots = 9;   // total number of slots

    for (let i = 0; i < numberOfSlots; i++) {
        const endMinutes = startMinutes + slotDuration;

        // --- Inline time formatting (no helper) ---
        const formatTime = (totalMinutes) => {
            let hour = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            const ampm = hour >= 12 ? "PM" : "AM";
            hour = hour % 12;
            if (hour === 0) hour = 12;
            return `${hour}:${String(minutes).padStart(2, "0")} ${ampm}`;
        };
        // ------------------------------------------

        const startTime = formatTime(startMinutes);
        const endTime = formatTime(endMinutes);
        slots.push(`${startTime} - ${endTime}`);

        startMinutes = endMinutes + buffer; // move ahead by 60 minutes total
    }

    return slots;
}
