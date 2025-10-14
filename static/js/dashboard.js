        document.addEventListener('DOMContentLoaded', () => {
            // Admin authentication check
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
                    // Clear form for new entry when section is opened
                    clearSlotForm();
                } else if (sectionId === 'groupManagementSection') {
                    renderGroups();
                    clearGroupForm(); // Clear form
                } else if (sectionId === 'studentManagementSection') {
                    renderStudents();
                    document.getElementById('uploadStatus').classList.add('hidden');
                    document.getElementById('uploadError').classList.add('hidden');
                    document.getElementById('studentCsvUpload').value = ''; // Clear file input
                } else if (sectionId === 'attendanceMarkingSection') {
                    populateAttendanceSlots();
                    // Clear attendance specific selects
                    document.getElementById('attendanceSlot').value = '';
                    document.getElementById('attendanceSubSubgroup').innerHTML = '<option value="">Select a Slot first</option>';
                    document.getElementById('attendanceSubSubgroup').disabled = true;
                    document.getElementById('attendanceTableBody').innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">Select a slot and sub-subgroup to load students.</td></tr>';
                    document.getElementById('saveAttendanceBtn').disabled = true;
                }
            };

            // --- Initial Data Setup (if not present) ---
            if (!localStorage.getItem('groups')) {
                localStorage.setItem('groups', JSON.stringify([]));
            }
            if (!localStorage.getItem('labSlots')) {
                localStorage.setItem('labSlots', JSON.stringify([]));
            }
            if (!localStorage.getItem('students')) {
                localStorage.setItem('students', JSON.stringify([]));
            }
            if (!localStorage.getItem('attendances')) {
                localStorage.setItem('attendances', JSON.stringify([]));
            }


            // --- Helper Functions ---

            /**
             * Generates the fixed one-hour time slots with 10-min buffer for selects.
             * @returns {string[]} An array of time slot strings (e.g., "09:00 - 10:00").
             */
            function generateTimeSlots() {
                const slots = [];
                let startHour = 9; // Start from 9 AM
                for (let i = 0; i < 6; i++) { // 6 one-hour sessions
                    const endHour = startHour + 1;
                    const startTime = `${String(startHour).padStart(2, '0')}:00`;
                    const endTime = `${String(endHour).padStart(2, '0')}:00`;
                    slots.push(`${startTime} - ${endTime}`);
                    startHour = endHour; // Next slot starts after previous one ends (implicitly includes buffer)
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
            function populateSlotGroupSelect() {
                const groups = JSON.parse(localStorage.getItem('groups')) || [];
                slotGroupSelect.innerHTML = '<option value="">Select Main Group</option>';
                groups.forEach(group => {
                    const option = document.createElement('option');
                    option.value = group.name;
                    option.textContent = group.name;
                    slotGroupSelect.appendChild(option);
                });
                // Also trigger sub-subgroup population in case a group is pre-selected for edit
                populateSubSubgroupCheckboxes();
            }

            /**
             * Populates sub-subgroup checkboxes based on the selected main group.
             */
            slotGroupSelect.addEventListener('change', populateSubSubgroupCheckboxes);
            function populateSubSubgroupCheckboxes() {
                const selectedGroup = slotGroupSelect.value;
                subSubgroupCheckboxesDiv.innerHTML = ''; // Clear existing checkboxes

                if (!selectedGroup) {
                    subSubgroupCheckboxesDiv.innerHTML = '<p class="text-gray-500">Select a main group to see sub-subgroups.</p>';
                    return;
                }

                const groups = JSON.parse(localStorage.getItem('groups')) || [];
                const group = groups.find(g => g.name === selectedGroup);

                if (group && group.subSubgroups.length > 0) {
                    group.subSubgroups.forEach(subSubgroup => {
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
            }


            /**
             * Renders the list of lab slots in the table.
             */
            function renderSlots() {
                const slots = JSON.parse(localStorage.getItem('labSlots')) || [];
                slotsTableBody.innerHTML = ''; // Clear existing rows

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
            slotForm.addEventListener('submit', (e) => {
                e.preventDefault();

                const id = slotIdInput.value || `slot-${Date.now()}`;
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

                const newSlot = { id, course, lab, day, time, groupName, subSubgroups: selectedSubSubgroups };

                let slots = JSON.parse(localStorage.getItem('labSlots')) || [];

                if (slotIdInput.value) { // Edit existing slot
                    slots = slots.map(slot => slot.id === id ? newSlot : slot);
                } else { // Add new slot
                    // Basic validation for duplicate slots (same day, time, lab)
                    const isDuplicate = slots.some(slot =>
                        slot.day === newSlot.day &&
                        slot.time === newSlot.time &&
                        slot.lab === newSlot.lab
                    );
                    if (isDuplicate) {
                        alert('A slot for this lab, day, and time already exists.');
                        return;
                        
                    }
                    slots.push(newSlot);
                }

                localStorage.setItem('labSlots', JSON.stringify(slots));
                renderSlots();
                clearSlotForm();
            });

            /**
             * Populates the slot form with data for editing.
             * @param {string} id The ID of the slot to edit.
             */
            window.editSlot = function(id) {
                const slots = JSON.parse(localStorage.getItem('labSlots')) || [];
                const slotToEdit = slots.find(slot => slot.id === id);

                if (slotToEdit) {
                    slotIdInput.value = slotToEdit.id;
                    slotCourseInput.value = slotToEdit.course;
                    slotLabInput.value = slotToEdit.lab;
                    slotDaySelect.value = slotToEdit.day;
                    slotTimeSelect.value = slotToEdit.time;
                    slotGroupSelect.value = slotToEdit.groupName;
                    populateSubSubgroupCheckboxes(); // Repopulate and then check
                    // Check the assigned sub-subgroups
                    slotToEdit.subSubgroups.forEach(subSubgroup => {
                        const checkbox = document.getElementById(`subSubgroup-${subSubgroup}`);
                        if (checkbox) checkbox.checked = true;
                    });

                    addSlotBtn.textContent = 'Update Slot';
                    cancelEditSlotBtn.classList.remove('hidden');
                }
            };

            /**
             * Deletes a lab slot.
             * @param {string} id The ID of the slot to delete.
             */
            window.deleteSlot = function(id) {
                if (confirm('Are you sure you want to delete this slot?')) {
                    let slots = JSON.parse(localStorage.getItem('labSlots')) || [];
                    slots = slots.filter(slot => slot.id !== id);
                    localStorage.setItem('labSlots', JSON.stringify(slots));
                    renderSlots();
                    clearSlotForm(); // Clear form in case the deleted slot was being edited
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
            function renderGroups() {
                const groups = JSON.parse(localStorage.getItem('groups')) || [];
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
             * Handles adding or updating a group. Auto-generates sub-subgroups.
             */
            groupForm.addEventListener('submit', (e) => {
                e.preventDefault();

                const id = groupIdInput.value || `group-${Date.now()}`;
                const name = groupNameInput.value.trim().toUpperCase();

                if (!name) {
                    alert('Group name cannot be empty.');
                    return;
                }

                // Auto-generate 6 sub-subgroups (e.g., 2C22-a to 2C22-f)
                const subSubgroups = ['a', 'b', 'c', 'd', 'e', 'f'].map(suffix => `${name}-${suffix}`);

                const newGroup = { id, name, subSubgroups };

                let groups = JSON.parse(localStorage.getItem('groups')) || [];

                if (groupIdInput.value) { // Edit existing group (only name can be edited, sub-subgroups regenerate)
                    groups = groups.map(group => group.id === id ? newGroup : group);
                } else { // Add new group
                    // Prevent duplicate group names
                    if (groups.some(group => group.name === name)) {
                        alert(`Group "${name}" already exists.`);
                        return;
                    }
                    groups.push(newGroup);
                }

                localStorage.setItem('groups', JSON.stringify(groups));
                renderGroups();
                clearGroupForm();
                populateSlotGroupSelect(); // Update group select in slot management
            });

            /**
             * Populates the group form for editing.
             * @param {string} id The ID of the group to edit.
             */
            window.editGroup = function(id) {
                const groups = JSON.parse(localStorage.getItem('groups')) || [];
                const groupToEdit = groups.find(group => group.id === id);

                if (groupToEdit) {
                    groupIdInput.value = groupToEdit.id;
                    groupNameInput.value = groupToEdit.name;
                    addGroupBtn.textContent = 'Update Group';
                    cancelEditGroupBtn.classList.remove('hidden');
                }
            };

            /**
             * Deletes a group.
             * @param {string} id The ID of the group to delete.
             */
            window.deleteGroup = function(id) {
                if (confirm('Are you sure you want to delete this group and all its associated sub-subgroups? This will affect existing slots and students.')) {
                    let groups = JSON.parse(localStorage.getItem('groups')) || [];
                    const groupToDelete = groups.find(g => g.id === id);
                    if (!groupToDelete) return;

                    groups = groups.filter(group => group.id !== id);
                    localStorage.setItem('groups', JSON.stringify(groups));
                    renderGroups();
                    clearGroupForm();
                    populateSlotGroupSelect(); // Update group select in slot management

                    // Optionally, you might want to remove students from deleted sub-subgroups or unassign slots
                    // For Phase 1, we'll leave this more basic and assume admin manages carefully.
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
            function renderStudents() {
                const students = JSON.parse(localStorage.getItem('students')) || [];
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
            }

            /**
             * Handles CSV file upload for students.
             */
            uploadStudentsBtn.addEventListener('click', () => {
                const file = studentCsvUpload.files[0];
                uploadStatus.classList.add('hidden');
                uploadError.classList.add('hidden');

                if (!file) {
                    uploadError.textContent = 'Please select a CSV file to upload.';
                    uploadError.classList.remove('hidden');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const csvText = e.target.result;
                        const lines = csvText.split('\n').filter(line => line.trim() !== '');
                        if (lines.length === 0) {
                            uploadError.textContent = 'CSV file is empty or malformed.';
                            uploadError.classList.remove('hidden');
                            return;
                        }

                        const headers = lines[0].split(',').map(h => h.trim());
                        const expectedHeaders = ['Roll No', 'Name', 'Sub-subgroup'];
                        if (!expectedHeaders.every(h => headers.includes(h))) {
                            uploadError.textContent = 'CSV headers must be "Roll No, Name, Sub-subgroup". Please check your file.';
                            uploadError.classList.remove('hidden');
                            return;
                        }

                        const newStudents = [];
                        const existingStudents = JSON.parse(localStorage.getItem('students')) || [];
                        const allGroups = JSON.parse(localStorage.getItem('groups')) || [];
                        const validSubSubgroups = new Set(allGroups.flatMap(g => g.subSubgroups));

                        for (let i = 1; i < lines.length; i++) {
                            const values = lines[i].split(',').map(v => v.trim());
                            if (values.length !== headers.length) {
                                console.warn(`Skipping malformed row: ${lines[i]}`);
                                continue;
                            }

                            const student = {};
                            headers.forEach((header, index) => {
                                if (header === 'Roll No') student.rollNo = values[index].toUpperCase();
                                if (header === 'Name') student.name = values[index];
                                if (header === 'Sub-subgroup') student.subSubgroup = values[index].toUpperCase();
                            });

                            if (!student.rollNo || !student.name || !student.subSubgroup) {
                                console.warn(`Skipping student with missing data: ${JSON.stringify(student)}`);
                                continue;
                            }
                            if (!validSubSubgroups.has(student.subSubgroup)) {
                                console.warn(`Skipping student ${student.rollNo} - Invalid sub-subgroup: ${student.subSubgroup}`);
                                uploadError.textContent = `Warning: Some students assigned to invalid sub-subgroups (e.g., ${student.subSubgroup}) were skipped. Please ensure sub-subgroups exist.`;
                                uploadError.classList.remove('hidden');
                                continue;
                            }

                            // Check for duplicates before adding
                            if (!existingStudents.some(s => s.rollNo === student.rollNo) && !newStudents.some(s => s.rollNo === student.rollNo)) {
                                newStudents.push(student);
                            } else {
                                console.warn(`Skipping duplicate student: ${student.rollNo}`);
                            }
                        }

                        if (newStudents.length > 0) {
                            const updatedStudents = [...existingStudents, ...newStudents];
                            localStorage.setItem('students', JSON.stringify(updatedStudents));
                            renderStudents();
                            uploadStatus.textContent = `${newStudents.length} new students uploaded successfully.`;
                            uploadStatus.classList.remove('hidden');
                            studentCsvUpload.value = ''; // Clear file input
                        } else {
                            uploadStatus.textContent = 'No new students to upload or all were duplicates/invalid.';
                            uploadStatus.classList.remove('hidden');
                        }
                    } catch (error) {
                        uploadError.textContent = `Error processing CSV: ${error.message}`;
                        uploadError.classList.remove('hidden');
                        console.error('CSV processing error:', error);
                    }
                };
                reader.onerror = () => {
                    uploadError.textContent = 'Failed to read file.';
                    uploadError.classList.remove('hidden');
                };
                reader.readAsText(file);
            });

            /**
             * Deletes a student by roll number.
             * @param {string} rollNo The roll number of the student to delete.
             */
            window.deleteStudent = function(rollNo) {
                if (confirm(`Are you sure you want to delete student with Roll No: ${rollNo}? This will also remove their attendance records.`)) {
                    let students = JSON.parse(localStorage.getItem('students')) || [];
                    students = students.filter(student => student.rollNo !== rollNo);
                    localStorage.setItem('students', JSON.stringify(students));

                    // Also remove attendance records for this student
                    let attendances = JSON.parse(localStorage.getItem('attendances')) || [];
                    attendances = attendances.filter(att => att.rollNo !== rollNo);
                    localStorage.setItem('attendances', JSON.stringify(attendances));

                    renderStudents();
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
            function populateAttendanceSlots() {
                const slots = JSON.parse(localStorage.getItem('labSlots')) || [];
                attendanceSlotSelect.innerHTML = '<option value="">Select a Lab Slot</option>';
                slots.forEach(slot => {
                    const option = document.createElement('option');
                    option.value = slot.id;
                    option.textContent = `${slot.course} - ${slot.lab} (${slot.day}, ${slot.time})`;
                    attendanceSlotSelect.appendChild(option);
                });
            }

            /**
             * Populates the sub-subgroup dropdown for attendance based on the selected slot.
             */
            attendanceSlotSelect.addEventListener('change', () => {
                const selectedSlotId = attendanceSlotSelect.value;
                attendanceSubSubgroupSelect.innerHTML = '<option value="">Select a Sub-subgroup</option>';
                attendanceSubSubgroupSelect.disabled = true;
                attendanceTableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">Select a slot and sub-subgroup to load students.</td></tr>';
                saveAttendanceBtn.disabled = true;

                if (selectedSlotId) {
                    const slots = JSON.parse(localStorage.getItem('labSlots')) || [];
                    const selectedSlot = slots.find(s => s.id === selectedSlotId);
                    if (selectedSlot && selectedSlot.subSubgroups) {
                        selectedSlot.subSubgroups.forEach(subSubgroup => {
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
            attendanceSubSubgroupSelect.addEventListener('change', () => {
                const selectedSlotId = attendanceSlotSelect.value;
                const selectedSubSubgroup = attendanceSubSubgroupSelect.value;
                attendanceTableBody.innerHTML = '';
                currentStudentsForAttendance = [];
                saveAttendanceBtn.disabled = true;

                if (selectedSlotId && selectedSubSubgroup) {
                    const students = JSON.parse(localStorage.getItem('students')) || [];
                    const filteredStudents = students.filter(s => s.subSubgroup === selectedSubSubgroup);

                    if (filteredStudents.length === 0) {
                        attendanceTableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500">No students found for sub-subgroup: ${selectedSubSubgroup}.</td></tr>`;
                        return;
                    }

                    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
                    const attendances = JSON.parse(localStorage.getItem('attendances')) || [];

                    filteredStudents.forEach(student => {
                        const row = document.createElement('tr');
                        row.classList.add('hover:bg-light-blue-100');
                        row.dataset.rollNo = student.rollNo;

                        // Check if attendance for this student, slot, and day already exists
                        const existingAttendance = attendances.find(att =>
                            att.rollNo === student.rollNo &&
                            att.slotId === selectedSlotId &&
                            att.date === today
                        );

                        const initialStatus = existingAttendance ? existingAttendance.status : 'Absent'; // Default to Absent if not marked

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
            saveAttendanceBtn.addEventListener('click', () => {
                const selectedSlotId = attendanceSlotSelect.value;
                const selectedSubSubgroup = attendanceSubSubgroupSelect.value;

                if (!selectedSlotId || !selectedSubSubgroup) {
                    alert('Please select a slot and a sub-subgroup first.');
                    return;
                }

                const slots = JSON.parse(localStorage.getItem('labSlots')) || [];
                const currentSlot = slots.find(s => s.id === selectedSlotId);
                if (!currentSlot) {
                    alert('Selected slot not found.');
                    return;
                }

                const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
                let attendances = JSON.parse(localStorage.getItem('attendances')) || [];

                attendanceTableBody.querySelectorAll('tr').forEach(row => {
                    const rollNo = row.dataset.rollNo;
                    const statusInput = row.querySelector(`input[name="status-${rollNo}"]:checked`);
                    const status = statusInput ? statusInput.value : 'Absent'; // Default to Absent if no radio is checked

                    // Find if attendance for this student, slot, and date already exists
                    const existingAttendanceIndex = attendances.findIndex(att =>
                        att.rollNo === rollNo &&
                        att.slotId === selectedSlotId &&
                        att.date === today
                    );

                    const studentName = currentStudentsForAttendance.find(s => s.rollNo === rollNo)?.name || rollNo; // Get name from loaded students

                    const attendanceRecord = {
                        id: existingAttendanceIndex !== -1 ? attendances[existingAttendanceIndex].id : `att-${Date.now()}-${rollNo}`,
                        rollNo: rollNo,
                        name: studentName,
                        subSubgroup: selectedSubSubgroup,
                        slotId: selectedSlotId,
                        course: currentSlot.course,
                        lab: currentSlot.lab,
                        day: currentSlot.day,
                        time: currentSlot.time,
                        date: today,
                        status: status,
                        markedBy: 'admin', // Could be extended to actual admin user
                        markedAt: new Date().toISOString()
                    };

                    if (existingAttendanceIndex !== -1) {
                        attendances[existingAttendanceIndex] = attendanceRecord; // Update
                    } else {
                        attendances.push(attendanceRecord); // Add new
                    }
                });

                localStorage.setItem('attendances', JSON.stringify(attendances));
                alert('Attendance saved successfully!');
                // Optionally re-render students for attendance to reflect saved status
                attendanceSubSubgroupSelect.dispatchEvent(new Event('change'));
            });
        });