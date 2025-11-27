
document.getElementById('student-lookup-form').onsubmit = function (e) {
    e.preventDefault();
    const rollNo = document.getElementById('student-roll').value.trim();
    showStudentSlot(rollNo);
}

async function showStudentSlot(rollNo) {
    const displayDiv = document.getElementById('student-slot-display');
    displayDiv.innerHTML = `<p class="text-gray-600">Fetching student data...</p>`;

    try {
        const response = await fetch(`http://172.16.75.46:5000/api/student_lookup/${rollNo}`);
        if (response.status === 404) {
            displayDiv.innerHTML = `<p class="text-red-700">Student with Roll No. <b>${rollNo}</b> not found.</p>`;
            return;
        }
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        const { student, assignedSlots, attendanceRecords } = data;

        let html = `
            <div class="bg-blue-100 p-4 rounded shadow">
                <div class="mb-2 text-black">Roll No: <span class="font-semibold">${student.rollNo}</span></div>
                <div class="mb-2 text-black">Name: <span class="font-semibold">${student.name}</span></div>
                <div class="mb-2 text-black">Slot: <span class="font-semibold">${assignedSlots.slotName} (${assignedSlots.time})</span></div>
                <div class="mb-2 text-black">Group: <span class="font-semibold">${assignedSlots.groupHierarchy}</span></div>
                <div class="mb-2 text-black">Attendance:</div>
                <ul class="ml-4">
                    ${attendanceRecords.map(att =>
                        `<li class="text-black">${att.date} : 
                            <span class="${att.marked ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}">${att.marked ? '✓' : '✗'}</span>
                        </li>`).join("")}
                </ul>
            </div>`;

        displayDiv.innerHTML = html;

    } catch (error) {
        console.error('Error fetching student data:', error);
        displayDiv.innerHTML = `<p class="text-red-700">Error fetching student data. Please try again later.</p>`;
    }
}
