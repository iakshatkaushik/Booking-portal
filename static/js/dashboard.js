document.addEventListener('DOMContentLoaded', () => {
            const API_BASE_URL = 'https://booking-portal-2-ueub.onrender.com/api';

            // Admin authentication check - Frontend redirection only
            if (localStorage.getItem('isAdminLoggedIn') !== 'true') {
                window.location.href = 'login.html'; // Redirect to login if not authenticated
            }

            // Logout functionality
            document.getElementById('logoutBtn').addEventListener('click', () => {
                localStorage.removeItem('isAdminLoggedIn');
                window.location.href = 'login.html';
            });

            // --- Admin Dashboard Section Navigation ---
            window.showSection = function(sectionId) {
                document.querySelectorAll('.admin-section').forEach(section => {
                    section.classList.add('hidden');
                });
                document.getElementById(sectionId).classList.remove('hidden');

                // Re-render specific sections when shown
                if (sectionId === 'slotManagementSection') {
                    renderSlots();
                    populateSlotGroupSelect();
                    populateTimeSlotsSelect();
                    clearSlotForm();
                } else if (sectionId === 'groupManagementSection') {
                    renderGroups();
                    clearGroupForm();
                } else if (sectionId === 'studentManagementSection') {
                    renderStudents();
                    document.getElementById('uploadStatus').classList.add('hidden');
                    document.getElementById('uploadError').classList.add('hidden');
                    document.getElementById('studentCsvUpload').value = '';
                } else if (sectionId === 'attendanceMarkingSection') {
                    populateAttendanceSlots();
                    document.getElementById('attendanceSlot').value = '';
                    document.getElementById('attendanceSubSubgroup').innerHTML = '<option value="">Select a Slot first</option>';
                    document.getElementById('attendanceSubSubgroup').disabled = true;
                    document.getElementById('attendanceTableBody').innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">Select a slot and sub-subgroup to load students.</td></tr>';
                    document.getElementById('saveAttendanceBtn').disabled = true;
                }
            };

            // --- Helper Functions ---

            /**
             * Generates the fixed one-hour time slots with 10-min buffer for selects.
             * @returns {string[]} An array of time slot strings (e.g., "09:00 - 10:00").
             */
            function generateTimeSlots() {
                const slots = [];
                let startHour = 9;
                for (let i = 0; i < 6; i++) {
                    const endHour = startHour + 1;
                    const startTime = `${String(startHour).padStart(2, '0')}:00`;
                    const endTime = `${String(endHour).padStart(2, '0')}:00`;
                    slots.push(`${startTime} - ${endTime}`);
                    startHour = endHour;
                }
                return slots;
            }

            // --- Slot Management ---
            const slotForm = document.getElementById('slotForm');
            const slotsTableBody = document.getElementById('slotsTableBody');
            const slotCourseInput = document.getElementById('slotCourse');
            const slotLabInput = document.getElementById('slotLab');
            const slotDaySelect = document.getElementById('slotDay');
            const slotTimeSelect = document.getElementById('slotTime');
            const slotGroupSelect = document.getElementById('slotGroup');
            const subSubgroupCheckboxesDiv = document.getElementById('subSubgroupCheckboxes');
            const slotIdInput = document.getElementById('slotId');
            const addSlotBtn = document.getElementById('addSlotBtn');
            const cancelEditSlotBtn = document.getElementById('cancelEditSlotBtn');

            /**
             * Populates the time slots dropdown in the slot form.
             */
            function populateTimeSlotsSelect() {
                const timeSlots = generateTimeSlots();
                slotTimeSelect.innerHTML = '<option value="">Select Time</option>';
                timeSlots.forEach(time => {
                    const option = document.createElement('option');
                    option.value = time;
                    option.textContent = time;
                    slotTimeSelect.appendChild(option);
                });
            }

            /**
             * Populates the main group dropdown in the slot form.
             */
            async function populateSlotGroupSelect() {
                try {
                    const response = await fetch(`${API_BASE_URL}/groups`);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const groups = await response.json();

                    slotGroupSelect.innerHTML = '<option value="">Select Main Group</option>';
                    groups.forEach(group => {
                        const option = document.createElement('option');
                        option.value = group.name;
                        option.textContent = group.name;
                        slotGroupSelect.appendChild(option);
                    });
                    populateSubSubgroupCheckboxes(); // Trigger after groups are loaded
                } catch (error) {
                    console.error('Error fetching groups for slot select:', error);
                    alert('Failed to load groups for slot management.');
                }
            }

            /**
             * Populates sub-subgroup checkboxes based on the selected main group.
             */
            slotGroupSelect.addEventListener('change', populateSubSubgroupCheckboxes);
            async function populateSubSubgroupCheckboxes() {
                const selectedGroup = slotGroupSelect.value;
                subSubgroupCheckboxesDiv.innerHTML = ''; // Clear existing checkboxes

                if (!selectedGroup) {
                    subSubgroupCheckboxesDiv.innerHTML = '<p class="text-gray-500">Select a main group to see sub-subgroups.</p>';
                    return;
                }

                try {
                    const response = await fetch(`${API_BASE_URL}/groups/${selectedGroup}/subsubgroups`);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const subSubgroups = await response.json();

                    if (subSubgroups.length > 0) {
                        subSubgroups.forEach(subSubgroup => {
                            const div = document.createElement('div');
                            div.classList.add('flex', 'items-center', 'mr-4');
                            div.innerHTML = `
                                <input type="checkbox" id="subSubgroup-${subSubgroup}" value="${subSubgroup}" class="h-4 w-4 text-red-700 border-gray-300 rounded focus:ring-red-700">
                                <label for="subSubgroup-${subSubgroup}" class="ml-2 text-sm text-gray-700">${subSubgroup}</label>
                            `;
                            subSubgroupCheckboxesDiv.appendChild(div);
                        });
                    } else {
                        subSubgroupCheckboxesDiv.innerHTML = '<p class="text-gray-500">No sub-subgroups found for this group. Create groups first.</p>';
                    }
                } catch (error) {
                    console.error('Error fetching sub-subgroups:', error);
                    subSubgroupCheckboxesDiv.innerHTML = '<p class="text-red-500">Failed to load sub-subgroups.</p>';
                }
            }


            /**
             * Renders the list of lab slots in the table.
             */
            async function renderSlots() {
                try {
                    const response = await fetch(`${API_BASE_URL}/slots`);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const slots = await response.json();

                    slotsTableBody.innerHTML = '';

                    if (slots.length === 0) {
                        slotsTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">No slots created yet.</td></tr>';
                        return;
                    }

                    slots.forEach(slot => {
                        const row = document.createElement('tr');
                        row.classList.add('hover:bg-light-blue-100');
                        row.innerHTML = `
                            <td class="py-2 px-4 border-b border-gray-200">${slot.course}</td>
                            <td class="py-2 px-4 border-b border-gray-200">${slot.lab}</td>
                            <td class="py-2 px-4 border-b border-gray-200">${slot.day}</td>
                            <td class="py-2 px-4 border-b border-gray-200">${slot.time}</td>
                            <td class="py-2 px-4 border-b border-gray-200">${slot.groupName}</td>
                            <td class="py-2 px-4 border-b border-gray-200">${slot.subSubgroups ? slot.subSubgroups.join(', ') : 'N/A'}</td>
                            <td class="py-2 px-4 border-b border-gray-200">
                                <button onclick="editSlot('${slot.id}')" class="text-blue-600 hover:text-blue-800 mr-2"><i class="fas fa-edit"></i> Edit</button>
                                <button onclick="deleteSlot('${slot.id}')" class="text-red-600 hover:text-red-800"><i class="fas fa-trash"></i> Delete</button>
                            </td>
                        `;
                        slotsTableBody.appendChild(row);
                    });
                } catch (error) {
                    console.error('Error fetching slots:', error);
                    slotsTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-red-500">Failed to load slots.</td></tr>';
                }
            }

            /**
             * Clears the slot form and resets buttons.
             */
            function clearSlotForm() {
                slotIdInput.value = '';
                slotCourseInput.value = '';
                slotLabInput.value = '';
                slotDaySelect.value = '';
                slotTimeSelect.value = '';
                slotGroupSelect.value = '';
                populateSubSubgroupCheckboxes(); // Clear checkboxes
                addSlotBtn.textContent = 'Add Slot';
                cancelEditSlotBtn.classList.add('hidden');
            }

            /**
             * Handles adding or updating a lab slot.
             */
            slotForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const id = slotIdInput.value; // ID will be present if editing
                const course = slotCourseInput.value.trim().toUpperCase();
                const lab = slotLabInput.value.trim().toUpperCase();
                const day = slotDaySelect.value;
                const time = slotTimeSelect.value;
                const groupName = slotGroupSelect.value;
                const selectedSubSubgroups = Array.from(subSubgroupCheckboxesDiv.querySelectorAll('input[type="checkbox"]:checked'))
                                                .map(cb => cb.value);

                if (!selectedSubSubgroups.length) {
                    alert('Please select at least one sub-subgroup for the slot.');
                    return;
                }

                const slotData = { course, lab, day, time, groupName, subSubgroups: selectedSubSubgroups };

                try {
                    let response;
                    if (id) { // Edit existing slot
                        response = await fetch(`${API_BASE_URL}/slots/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(slotData)
                        });
                    } else { // Add new slot
                        response = await fetch(`${API_BASE_URL}/slots`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(slotData)
                        });
                    }

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                    }

                    await response.json(); // Consume response
                    renderSlots();
                    clearSlotForm();
                } catch (error) {
                    console.error('Error saving slot:', error);
                    alert(`Failed to save slot: ${error.message}`);
                }
            });

            /**
             * Populates the slot form with data for editing.
             * @param {string} id The ID of the slot to edit.
             */
            window.editSlot = async function(id) {
                try {
                    const response = await fetch(`${API_BASE_URL}/slots/${id}`);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const slotToEdit = await response.json();

                    slotIdInput.value = slotToEdit.id;
                    slotCourseInput.value = slotToEdit.course;
                    slotLabInput.value = slotToEdit.lab;
                    slotDaySelect.value = slotToEdit.day;
                    slotTimeSelect.value = slotToEdit.time;
                    slotGroupSelect.value = slotToEdit.groupName;

                    // Ensure sub-subgroups are populated *before* checking them
                    await populateSubSubgroupCheckboxes();
                    slotToEdit.subSubgroups.forEach(subSubgroup => {
                        const checkbox = document.getElementById(`subSubgroup-${subSubgroup}`);
                        if (checkbox) checkbox.checked = true;
                    });

                    addSlotBtn.textContent = 'Update Slot';
                    cancelEditSlotBtn.classList.remove('hidden');
                } catch (error) {
                    console.error('Error fetching slot for edit:', error);
                    alert('Failed to load slot data for editing.');
                }
            };

            /**
             * Deletes a lab slot.
             * @param {string} id The ID of the slot to delete.
             */
            window.deleteSlot = async function(id) {
                if (confirm('Are you sure you want to delete this slot?')) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/slots/${id}`, {
                            method: 'DELETE'
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                        }

                        renderSlots();
                        clearSlotForm();
                    } catch (error) {
                        console.error('Error deleting slot:', error);
                        alert(`Failed to delete slot: ${error.message}`);
                    }
                }
            };

            // --- Group Management ---
            const groupForm = document.getElementById('groupForm');
            const groupsTableBody = document.getElementById('groupsTableBody');
            const groupNameInput = document.getElementById('groupName');
            const groupIdInput = document.getElementById('groupId');
            const addGroupBtn = document.getElementById('addGroupBtn');
            const cancelEditGroupBtn = document.getElementById('cancelEditGroupBtn');

            /**
             * Renders the list of groups and their sub-subgroups.
             */
            async function renderGroups() {
                try {
                    const response = await fetch(`${API_BASE_URL}/groups`);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const groups = await response.json();

                    groupsTableBody.innerHTML = '';

                    if (groups.length === 0) {
                        groupsTableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">No groups created yet.</td></tr>';
                        return;
                    }

                    groups.forEach(group => {
                        const row = document.createElement('tr');
                        row.classList.add('hover:bg-light-blue-100');
                        row.innerHTML = `
                            <td class="py-2 px-4 border-b border-gray-200">${group.name}</td>
                            <td class="py-2 px-4 border-b border-gray-200">${group.subSubgroups.join(', ')}</td>
                            <td class="py-2 px-4 border-b border-gray-200">
                                <button onclick="editGroup('${group.id}')" class="text-blue-600 hover:text-blue-800 mr-2"><i class="fas fa-edit"></i> Edit</button>
                                <button onclick="deleteGroup('${group.id}')" class="text-red-600 hover:text-red-800"><i class="fas fa-trash"></i> Delete</button>
                            </td>
                        `;
                        groupsTableBody.appendChild(row);
                    });
                } catch (error) {
                    console.error('Error fetching groups:', error);
                    groupsTableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-red-500">Failed to load groups.</td></tr>';
                }
            }

            /**
             * Clears the group form and resets buttons.
             */
            function clearGroupForm() {
                groupIdInput.value = '';
                groupNameInput.value = '';
                addGroupBtn.textContent = 'Add Group';
                cancelEditGroupBtn.classList.add('hidden');
            }

            /**
             * Handles adding or updating a group.
             */
            groupForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const id = groupIdInput.value;
                const name = groupNameInput.value.trim().toUpperCase();

                if (!name) {
                    alert('Group name cannot be empty.');
                    return;
                }

                try {
                    let response;
                    if (id) { // Edit existing group
                        response = await fetch(`${API_BASE_URL}/groups/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name })
                        });
                    } else { // Add new group
                        response = await fetch(`${API_BASE_URL}/groups`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name })
                        });
                    }

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                    }

                    await response.json(); // Consume response
                    renderGroups();
                    clearGroupForm();
                    populateSlotGroupSelect(); // Update group select in slot management
                } catch (error) {
                    console.error('Error saving group:', error);
                    alert(`Failed to save group: ${error.message}`);
                }
            });

            /**
             * Populates the group form for editing.
             * @param {string} id The ID of the group to edit.
             */
            window.editGroup = async function(id) {
                try {
                    const response = await fetch(`${API_BASE_URL}/groups/${id}`);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const groupToEdit = await response.json();

                    groupIdInput.value = groupToEdit.id;
                    groupNameInput.value = groupToEdit.name;
                    addGroupBtn.textContent = 'Update Group';
                    cancelEditGroupBtn.classList.remove('hidden');
                } catch (error) {
                    console.error('Error fetching group for edit:', error);
                    alert('Failed to load group data for editing.');
                }
            };

            /**
             * Deletes a group.
             * @param {string} id The ID of the group to delete.
             */
            window.deleteGroup = async function(id) {
                if (confirm('Are you sure you want to delete this group and all its associated sub-subgroups? This will affect existing slots and students.')) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/groups/${id}`, {
                            method: 'DELETE'
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                        }

                        renderGroups();
                        clearGroupForm();
                        populateSlotGroupSelect();
                    } catch (error) {
                        console.error('Error deleting group:', error);
                        alert(`Failed to delete group: ${error.message}`);
                    }
                }
            };


            // --- Student Management ---
            const studentCsvUpload = document.getElementById('studentCsvUpload');
            const uploadStudentsBtn = document.getElementById('uploadStudentsBtn');
            const studentsTableBody = document.getElementById('studentsTableBody');
            const uploadStatus = document.getElementById('uploadStatus');
            const uploadError = document.getElementById('uploadError');

            /**
             * Renders the list of students in the table.
             */
            async function renderStudents() {
                try {
                    const response = await fetch(`${API_BASE_URL}/students`);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const students = await response.json();

                    studentsTableBody.innerHTML = '';

                    if (students.length === 0) {
                        studentsTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">No students uploaded yet.</td></tr>';
                        return;
                    }

                    students.forEach(student => {
                        const row = document.createElement('tr');
                        row.classList.add('hover:bg-light-blue-100');
                        row.innerHTML = `
                            <td class="py-2 px-4 border-b border-gray-200">${student.rollNo}</td>
                            <td class="py-2 px-4 border-b border-gray-200">${student.name}</td>
                            <td class="py-2 px-4 border-b border-gray-200">${student.subSubgroup}</td>
                            <td class="py-2 px-4 border-b border-gray-200">
                                <button onclick="deleteStudent('${student.rollNo}')" class="text-red-600 hover:text-red-800"><i class="fas fa-trash"></i> Delete</button>
                            </td>
                        `;
                        studentsTableBody.appendChild(row);
                    });
                } catch (error) {
                    console.error('Error fetching students:', error);
                    studentsTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500">Failed to load students.</td></tr>';
                }
            }

            /**
             * Handles CSV file upload for students.
             */
            uploadStudentsBtn.addEventListener('click', async () => {
                const file = studentCsvUpload.files[0];
                uploadStatus.classList.add('hidden');
                uploadError.classList.add('hidden');

                if (!file) {
                    uploadError.textContent = 'Please select a CSV file to upload.';
                    uploadError.classList.remove('hidden');
                    return;
                }

                const formData = new FormData();
                formData.append('file', file);

                try {
                    const response = await fetch(`${API_BASE_URL}/students/upload`, {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        uploadError.textContent = data.message || `Error: ${response.statusText}`;
                        uploadError.classList.remove('hidden');
                        return;
                    }

                    renderStudents();
                    uploadStatus.textContent = data.message;
                    uploadStatus.classList.remove('hidden');
                    studentCsvUpload.value = ''; // Clear file input
                } catch (error) {
                    uploadError.textContent = `Error uploading CSV: ${error.message}`;
                    uploadError.classList.remove('hidden');
                    console.error('CSV upload error:', error);
                }
            });

            /**
             * Deletes a student by roll number.
             * @param {string} rollNo The roll number of the student to delete.
             */
            window.deleteStudent = async function(rollNo) {
                if (confirm(`Are you sure you want to delete student with Roll No: ${rollNo}? This will also remove their attendance records.`)) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/students/${rollNo}`, {
                            method: 'DELETE'
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                        }

                        renderStudents();
                    } catch (error) {
                        console.error('Error deleting student:', error);
                        alert(`Failed to delete student: ${error.message}`);
                    }
                }
            };


            // --- Attendance Marking ---
            const attendanceSlotSelect = document.getElementById('attendanceSlot');
            const attendanceSubSubgroupSelect = document.getElementById('attendanceSubSubgroup');
            const attendanceTableBody = document.getElementById('attendanceTableBody');
            const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');
            const markAllPresentBtn = document.getElementById('markAllPresentBtn');
            const markAllAbsentBtn = document.getElementById('markAllAbsentBtn');

            let currentStudentsForAttendance = []; // To hold students whose attendance is being marked

            /**
             * Populates the slot dropdown for attendance marking.
             */
            async function populateAttendanceSlots() {
                try {
                    const response = await fetch(`${API_BASE_URL}/attendance/slots`);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const slots = await response.json();

                    attendanceSlotSelect.innerHTML = '<option value="">Select a Lab Slot</option>';
                    slots.forEach(slot => {
                        const option = document.createElement('option');
                        option.value = slot.id;
                        option.textContent = `${slot.course} - ${slot.lab} (${slot.day}, ${slot.time})`;
                        option.dataset.subSubgroups = JSON.stringify(slot.subSubgroups); // Store subSubgroups in dataset
                        attendanceSlotSelect.appendChild(option);
                    });
                } catch (error) {
                    console.error('Error fetching attendance slots:', error);
                    alert('Failed to load lab slots for attendance.');
                }
            }

            /**
             * Populates the sub-subgroup dropdown for attendance based on the selected slot.
             */
            attendanceSlotSelect.addEventListener('change', () => {
                const selectedOption = attendanceSlotSelect.options[attendanceSlotSelect.selectedIndex];
                const selectedSlotId = attendanceSlotSelect.value;
                attendanceSubSubgroupSelect.innerHTML = '<option value="">Select a Sub-subgroup</option>';
                attendanceSubSubgroupSelect.disabled = true;
                attendanceTableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">Select a slot and sub-subgroup to load students.</td></tr>';
                saveAttendanceBtn.disabled = true;

                if (selectedSlotId && selectedOption && selectedOption.dataset.subSubgroups) {
                    const subSubgroups = JSON.parse(selectedOption.dataset.subSubgroups);
                    if (subSubgroups.length > 0) {
                        subSubgroups.forEach(subSubgroup => {
                            const option = document.createElement('option');
                            option.value = subSubgroup;
                            option.textContent = subSubgroup;
                            attendanceSubSubgroupSelect.appendChild(option);
                        });
                        attendanceSubSubgroupSelect.disabled = false;
                    }
                }
            });

            /**
             * Loads students for attendance marking based on selected slot and sub-subgroup.
             */
            attendanceSubSubgroupSelect.addEventListener('change', async () => {
                const selectedSlotId = attendanceSlotSelect.value;
                const selectedSubSubgroup = attendanceSubSubgroupSelect.value;
                attendanceTableBody.innerHTML = '';
                currentStudentsForAttendance = [];
                saveAttendanceBtn.disabled = true;

                if (!selectedSlotId || !selectedSubSubgroup) {
                    return;
                }

                try {
                    const response = await fetch(`${API_BASE_URL}/attendance/students?slotId=${selectedSlotId}&subSubgroup=${selectedSubSubgroup}`);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const studentsWithAttendance = await response.json(); // This includes initial status

                    if (studentsWithAttendance.length === 0) {
                        attendanceTableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500">No students found for sub-subgroup: ${selectedSubSubgroup}.</td></tr>`;
                        return;
                    }

                    studentsWithAttendance.forEach(student => {
                        const row = document.createElement('tr');
                        row.classList.add('hover:bg-light-blue-100');
                        row.dataset.rollNo = student.rollNo;

                        const initialStatus = student.status || 'Absent'; // Default to Absent if backend doesn't provide status

                        row.innerHTML = `
                            <td class="py-2 px-4 border-b border-gray-200">${student.rollNo}</td>
                            <td class="py-2 px-4 border-b border-gray-200">${student.name}</td>
                            <td class="py-2 px-4 border-b border-gray-200 text-center">
                                <label class="inline-flex items-center">
                                    <input type="radio" name="status-${student.rollNo}" value="Present" class="form-radio text-green-600 h-4 w-4" ${initialStatus === 'Present' ? 'checked' : ''}>
                                    <span class="ml-2 text-green-600">✓ Present</span>
                                </label>
                                <label class="inline-flex items-center ml-4">
                                    <input type="radio" name="status-${student.rollNo}" value="Absent" class="form-radio text-red-600 h-4 w-4" ${initialStatus === 'Absent' ? 'checked' : ''}>
                                    <span class="ml-2 text-red-600">✗ Absent</span>
                                </label>
                            </td>
                        `;
                        attendanceTableBody.appendChild(row);
                        currentStudentsForAttendance.push({ rollNo: student.rollNo, name: student.name, initialStatus });
                    });
                    saveAttendanceBtn.disabled = false;
                } catch (error) {
                    console.error('Error loading students for attendance:', error);
                    attendanceTableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-red-500">Failed to load students for attendance.</td></tr>`;
                }
            });

            /**
             * Marks all visible students as Present.
             */
            markAllPresentBtn.addEventListener('click', () => {
                attendanceTableBody.querySelectorAll('input[type="radio"][value="Present"]').forEach(radio => {
                    radio.checked = true;
                });
            });

            /**
             * Marks all visible students as Absent.
             */
            markAllAbsentBtn.addEventListener('click', () => {
                attendanceTableBody.querySelectorAll('input[type="radio"][value="Absent"]').forEach(radio => {
                    radio.checked = true;
                });
            });


            /**
             * Saves the marked attendance for the selected slot and subgroup.
             */
            saveAttendanceBtn.addEventListener('click', async () => {
                const selectedSlotId = attendanceSlotSelect.value;
                const selectedSubSubgroup = attendanceSubSubgroupSelect.value;

                if (!selectedSlotId || !selectedSubSubgroup) {
                    alert('Please select a slot and a sub-subgroup first.');
                    return;
                }

                const attendanceRecords = [];
                attendanceTableBody.querySelectorAll('tr').forEach(row => {
                    const rollNo = row.dataset.rollNo;
                    const statusInput = row.querySelector(`input[name="status-${rollNo}"]:checked`);
                    const status = statusInput ? statusInput.value : 'Absent';

                    const studentName = currentStudentsForAttendance.find(s => s.rollNo === rollNo)?.name || rollNo;

                    attendanceRecords.push({
                        rollNo: rollNo,
                        name: studentName,
                        status: status
                    });
                });

                const payload = {
                    slotId: selectedSlotId,
                    subSubgroupName: selectedSubSubgroup,
                    attendanceData: attendanceRecords
                };

                try {
                    const response = await fetch(`${API_BASE_URL}/attendance`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                    }

                    alert('Attendance saved successfully!');
                    // Re-render attendance table to reflect saved status
                    attendanceSubSubgroupSelect.dispatchEvent(new Event('change'));
                } catch (error) {
                    console.error('Error saving attendance:', error);
                    alert(`Failed to save attendance: ${error.message}`);
                }
            });
        });