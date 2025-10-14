// student.html - Student slot and attendance lookup

document.getElementById('student-lookup-form').onsubmit = function (e) {
    e.preventDefault();
    const rollNo = document.getElementById('student-roll').value.trim();
    showStudentSlot(rollNo);
}

function showStudentSlot(rollNo) {
    let html = "";
    const slots = JSON.parse(localStorage.getItem('labSlots')) || [];
    let found = false;

    for (let slot of slots) {
        for (let sub of slot.subgroups) {
            for (let ssub of sub.subsubgroups) {
                for (let student of ssub.students) {
                    if (student.rollNo.toLowerCase() === rollNo.toLowerCase()) {
                        html = `
                <div class="bg-blue-100 p-4 rounded shadow">
                <div class="mb-2 text-black">Roll No: <span class="font-semibold">${student.rollNo}</span></div>
                <div class="mb-2 text-black">Name: <span class="font-semibold">${student.name}</span></div>
                <div class="mb-2 text-black">Slot: <span class="font-semibold">${slot.slotName} (${slot.time})</span></div>
                <div class="mb-2 text-black">Group: <span class="font-semibold">${slot.groupName} → ${sub.name} → ${ssub.name}</span></div>
                <div class="mb-2 text-black">Attendance:</div>
                <ul class="ml-4">
                ${ssub.attendance.map(att =>
                            `<li class="text-black">${att.date} : 
                        <span class="${att.marked[student.rollNo] ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}">${att.marked[student.rollNo] ? '✓' : '✗'}</span>
                    </li>`).join("")}
                </ul>
                </div>`;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
            if (found) break;
        }
        if (found) break;
    }
    if (!found) {
        html = `<p class="text-red-700">Student with Roll No. <b>${rollNo}</b> not found.</p>`;
    }
    document.getElementById('student-slot-display').innerHTML = html;
}