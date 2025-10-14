# Thapar Lab Slot & Attendance Portal (Phase 1)

This project is the frontend for a departmental web portal at Thapar Institute, designed to manage lab slots and attendance. It's built with a focus on aesthetics, mobile responsiveness, and a professional, minimal UI, adhering to Thapar's branding guidelines.

## Features

**Admin Role:**
*   **Login:** Secure login (mocked with `admin`/`admin123` credentials).
*   **Slot Management:**
    *   Create lab slots: 6 one-hour sessions with a 10-minute buffer after each.
    *   View existing slots.
    *   Delete individual slots.
*   **Subgroup Management:**
    *   Create 6 auto-generated sub-subgroups (e.g., `2C22-a` to `2C22-f`) for a given parent group (e.g., `2C22`).
    *   View existing subgroups.
    *   Delete subgroups.
*   **Student Upload:**
    *   Upload student data from an `.xlsx` file (expected columns: `Roll No`, `Name`, `Sub-subgroup`).
    *   Automatically adds new students or updates existing ones based on Roll No.
    *   Displays count of uploaded students, grouped by sub-subgroup.
*   **Attendance Marking:**
    *   Select a lab slot from a dropdown.
    *   Displays all relevant students for the selected slot.
    *   Mark students as Present (✓) or Absent (✗).
    *   "Mark All Present" and "Mark All Absent" buttons for quick marking.
    *   Save attendance records.
*   **Export Attendance:**
    *   Export all or group-specific attendance records as a CSV file.

**Student Role (Public Access):**
*   **Live Schedule Display:** Publicly viewable schedule of all lab slots, auto-refreshing every 30 seconds.
*   **Individual Schedule & Attendance:** Students can enter their Roll No to view their specific lab schedule and attendance records.

## Technologies Used

*   **HTML5:** For structuring the web content.
*   **Tailwind CSS (CDN):** For utility-first styling and mobile responsiveness.
*   **JavaScript (Vanilla):** For all frontend logic and interactions.
*   **SheetJS (CDN):** For importing and parsing `.xlsx` files.
*   **localStorage:** As a mock backend to persist data in the browser (no actual database in Phase 1).

## Thapar Branding Guidelines

*   **Base Color:** White (`#fff`)
*   **Accent/Headers/Toolbars:** Red (`#b30000`)
*   **Text Color:** Black (`#000`)
*   **Table Backgrounds:** Light Sky Blue (`#e3f2fd`)
*   **Logo:** `thapar_logo.png` (assumed to be in `assets/`)
*   **UI:** Professional, minimal, no over-coloring.

## File Structure