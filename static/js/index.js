
document.addEventListener('DOMContentLoaded', () => {
    renderPublicSchedule();
    setInterval(renderPublicSchedule, 30000);
});

async function renderPublicSchedule() {
    const scheduleBody = document.getElementById('schedule-table-body');
    scheduleBody.innerHTML = ''; 

    try {
        const response = await fetch('/api/public_schedule');
        // const response = await fetch('http://127.0.0.1:5000/api/public_schedule');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const slots = await response.json(); 

        const timeSlots = generateTimeSlots(); 

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

        timeSlots.forEach(time => {
            const row = document.createElement('tr');
            row.classList.add('hover:bg-light-blue-100'); 

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
                    daySlots.forEach((s, index) => {
                        const div = document.createElement('div');
                        // Add margin between multiple entries, but not after the last one
                        const marginClass = index < daySlots.length - 1 ? 'mb-3' : 'mb-0';
                        div.classList.add(marginClass, 'p-2', 'bg-light-sky-blue', 'rounded', );
                        // Force block display and full width to stack vertically
                        div.style.display = 'block';
                        div.style.width = '100%';
                        
                        // Handle groupName as array
                        const groups = Array.isArray(s.groupName) ? s.groupName : [s.groupName];
                        
                        // Group sub-subgroups by their parent group
                        const groupedSubSubgroups = {};
                        groups.forEach(group => {
                            groupedSubSubgroups[group] = [];
                        });
                        
                        // Match sub-subgroups to their parent groups
                        if (s.subSubgroups && s.subSubgroups.length > 0) {
                            s.subSubgroups.forEach(ssg => {
                                // Extract the group prefix (e.g., "2C23-A" -> "2C23")
                                const parts = ssg.split('-');
                                const groupPrefix = parts.slice(0, -1).join('-'); // Everything except last part
                                const suffix = parts[parts.length - 1]; // Last part (A, B, C, etc.)
                                
                                // Find matching group (case-insensitive)
                                const matchingGroup = groups.find(g => 
                                    g.toUpperCase() === groupPrefix.toUpperCase()
                                );
                                
                                if (matchingGroup && groupedSubSubgroups[matchingGroup]) {
                                    groupedSubSubgroups[matchingGroup].push(suffix);
                                }
                            });
                        }
                        
                        // Build display HTML with each group on a separate line
                        let groupLines = groups.map(group => {
                            const suffixes = groupedSubSubgroups[group];
                            if (suffixes && suffixes.length > 0) {
                                // Sort suffixes alphabetically
                                const sortedSuffixes = suffixes.sort();
                                return `${group} - ${sortedSuffixes.join(', ')}`;
                            }
                            return group;
                        }).join('<br>');
                        
                        div.innerHTML = `
                            <span class="font-semibold text-black-700 text-xs sm:text-sm md:text-base">${groupLines}</span><br>
                            <span class="text-xs sm:text-sm font-medium">${s.lab}</span> - <span class="text-xs sm:text-sm text-gray-600">${s.course}</span>
                        `;
                        cell.appendChild(div);
                    });
                } else {
                    cell.textContent = '-'; 
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
 * @returns {string[]} 
 */
function generateTimeSlots() {
    const slots = [];
    let startMinutes = 8 * 60; 
    const slotDuration = 50;   
    const buffer = 10;         
    const numberOfSlots = 9;   

    for (let i = 0; i < numberOfSlots; i++) {
        const endMinutes = startMinutes + slotDuration;

        const formatTime = (totalMinutes) => {
            let hour = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            const ampm = hour >= 12 ? "PM" : "AM";
            hour = hour % 12;
            if (hour === 0) hour = 12;
            return `${hour}:${String(minutes).padStart(2, "0")} ${ampm}`;
        };

        const startTime = formatTime(startMinutes);
        const endTime = formatTime(endMinutes);
        slots.push(`${startTime} - ${endTime}`);

        startMinutes = endMinutes + buffer; 
    }

    return slots;
}
