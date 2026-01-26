
document.getElementById('student-lookup-form').onsubmit = function (e) {
    e.preventDefault();
    let rollNo = document.getElementById('student-roll').value.trim();
    
    // Sanitize input: remove any special characters, allow only alphanumeric
    rollNo = rollNo.replace(/[^0-9]/g, '');
    
    if (!rollNo) {
        alert('Please enter a valid roll number (numbers only)');
        return;
    }
    
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

        // Build slots display
        let slotsHtml = '';
        if (assignedSlots && assignedSlots.length > 0) {
            slotsHtml = assignedSlots.map(slot => {
                // Handle groupName as array
                const groupDisplay = Array.isArray(slot.groupName) 
                    ? slot.groupName.join(', ') 
                    : slot.groupName;
                
                return `
                    <div class="mb-2 p-2 bg-white rounded border border-gray-300">
                        <div class="font-semibold text-black">${slot.course} - ${slot.lab}</div>
                        <div class="text-sm text-gray-700">${slot.day}, ${slot.time}</div>
                        <div class="text-sm text-gray-600">Group: ${groupDisplay}</div>
                    </div>
                `;
            }).join('');
        } else {
            slotsHtml = '<p class="text-gray-600">No slots assigned.</p>';
        }

        // Build attendance display
        let attendanceHtml = '';
        if (attendanceRecords && attendanceRecords.length > 0) {
            attendanceHtml = attendanceRecords.map(att => {
                const isPresent = att.status === 'Present';
                return `<li class="text-black">${att.date} : 
                    <span class="${isPresent ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}">${isPresent ? '✓ Present' : '✗ Absent'}</span>
                </li>`;
            }).join("");
        } else {
            attendanceHtml = '<li class="text-gray-600">No attendance records found.</li>';
        }

        let html = `
            <div class="bg-blue-100 p-4 rounded shadow">
                <div class="mb-2 text-black">Roll No: <span class="font-semibold">${student.rollNo}</span></div>
                <div class="mb-2 text-black">Name: <span class="font-semibold">${student.name}</span></div>
                <div class="mb-2 text-black">Sub-subgroup: <span class="font-semibold">${student.subSubgroup}</span></div>
                
                <div class="mt-4 mb-2 text-black font-semibold">Assigned Lab Slots:</div>
                ${slotsHtml}
                
                <div class="mt-4 mb-2 text-black font-semibold">Attendance Records:</div>
                <ul class="ml-4">
                    ${attendanceHtml}
                </ul>
            </div>`;

        displayDiv.innerHTML = html;

    } catch (error) {
        console.error('Error fetching student data:', error);
        displayDiv.innerHTML = `<p class="text-red-700">Error fetching student data. Please try again later.</p>`;
    }
}
