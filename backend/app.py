from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import pandas as pd
import io
import datetime
import uuid
import os
import openpyxl # Added for Excel export
from flask import send_from_directory
# Path to root of project (one level above backend/)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))



app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# --- Configuration ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///lab_portal.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your_super_secret_key_here' # Change this in production!

db = SQLAlchemy(app)

# Serve frontend HTML files
@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/student.html')
def student_page():
    return send_from_directory(BASE_DIR, 'student.html')

@app.route('/admin/<path:filename>')
def admin_page(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'admin'), filename)

# Serve static files (CSS, JS, assets)
@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'static'), filename)

@app.route('/assets/<path:filename>')
def asset_files(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'assets'), filename)


# --- Database Models (defined in models.py, but keeping it simple for now) ---

class User(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False) # Store hashed password
    role = db.Column(db.String(20), default='admin') # 'admin', 'instructor', etc.

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role
        }

class Group(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(50), unique=True, nullable=False) # e.g., '2C22'
    
    # Relationships
    sub_subgroups = db.relationship('SubSubgroup', backref='group', lazy=True, cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'subSubgroups': [ss.name for ss in self.sub_subgroups] # Include names of associated sub-subgroups
        }

class SubSubgroup(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(50), unique=True, nullable=False) # e.g., '2C22-A'
    group_id = db.Column(db.String(36), db.ForeignKey('group.id'), nullable=False)

    # Relationships
    students = db.relationship('Student', backref='sub_subgroup', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'group_id': self.group_id
        }

class LabSlot(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course = db.Column(db.String(20), nullable=False)
    lab = db.Column(db.String(20), nullable=False)
    day = db.Column(db.String(10), nullable=False) # e.g., 'Monday'
    time = db.Column(db.String(20), nullable=False) # e.g., '09:00 - 10:00'
    group_name = db.Column(db.String(50), nullable=False) # Store the group name for display simplicity
    
    # Store assigned sub-subgroup IDs (many-to-many relationship)
    assigned_sub_subgroups = db.relationship('SlotSubSubgroup', backref='lab_slot', lazy=True, cascade="all, delete-orphan")
    

    def to_dict(self):
        return {
            'id': self.id,
            'course': self.course,
            'lab': self.lab,
            'day': self.day,
            'time': self.time,
            'groupName': self.group_name,
            'subSubgroups': [
                SubSubgroup.query.get(ssg_link.sub_subgroup_id).name
                for ssg_link in self.assigned_sub_subgroups
                if SubSubgroup.query.get(ssg_link.sub_subgroup_id) # Ensure sub-subgroup still exists
            ]
        }

# Association table for many-to-many between LabSlot and SubSubgroup
class SlotSubSubgroup(db.Model):
    lab_slot_id = db.Column(db.String(36), db.ForeignKey('lab_slot.id'), primary_key=True)
    sub_subgroup_id = db.Column(db.String(36), db.ForeignKey('sub_subgroup.id'), primary_key=True)
    sub_subgroup = db.relationship("SubSubgroup")  # Only this relationship is needed



class Student(db.Model):
    roll_no = db.Column(db.String(20), primary_key=True) # Roll No as PK
    name = db.Column(db.String(100), nullable=False)
    sub_subgroup_id = db.Column(db.String(36), db.ForeignKey('sub_subgroup.id'), nullable=False) # Link to SubSubgroup

    # Relationships
    attendance_records = db.relationship('Attendance', backref='student', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'rollNo': self.roll_no,
            'name': self.name,
            'subSubgroup': self.sub_subgroup.name if self.sub_subgroup else 'N/A',
            'subSubgroupId': self.sub_subgroup_id
        }

class Attendance(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    roll_no = db.Column(db.String(20), db.ForeignKey('student.roll_no'), nullable=False)
    lab_slot_id = db.Column(db.String(36), db.ForeignKey('lab_slot.id'), nullable=False)
    date = db.Column(db.String(10), nullable=False) # YYYY-MM-DD
    status = db.Column(db.String(10), nullable=False) # 'Present', 'Absent'
    marked_by = db.Column(db.String(50), default='admin')
    marked_at = db.Column(db.String(30), default=lambda: datetime.datetime.now().isoformat())

    def to_dict(self):
        return {
            'id': self.id,
            'rollNo': self.roll_no,
            'name': self.student.name if self.student else 'N/A', # Fetch student name via relationship
            'subSubgroup': self.student.sub_subgroup.name if self.student and self.student.sub_subgroup else 'N/A',
            'slotId': self.lab_slot_id,
            'course': self.lab_slot.course if self.lab_slot else 'N/A',
            'lab': self.lab_slot.lab if self.lab_slot else 'N/A',
            'day': self.lab_slot.day if self.lab_slot else 'N/A',
            'time': self.lab_slot.time if self.lab_slot else 'N/A',
            'date': self.date,
            'status': self.status,
            'markedBy': self.marked_by,
            'markedAt': self.marked_at
        }

# --- Initial Data & Database Creation ---

def create_tables_and_seed_data():
    db.create_all()
    # Seed admin user if not exists
    if not User.query.filter_by(username='admin').first():
        admin = User(username='admin')
        admin.set_password('admin123') # Matches your login.js
        db.session.add(admin)
        db.session.commit()
        print("Admin user created: admin / admin123")
    else:
        print("Admin user already exists.")

# --- API Endpoints ---

# Admin Login
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        # In a real app, you'd generate a JWT token here
        return jsonify({"message": "Login successful", "token": "fake-jwt-token", "user": user.to_dict()}), 200
    return jsonify({"message": "Invalid credentials"}), 401

# --- Group Management ---
@app.route('/api/groups', methods=['GET'])
def get_groups():
    groups = Group.query.all()
    return jsonify([group.to_dict() for group in groups]), 200

@app.route('/api/groups', methods=['POST'])
def create_group():
    data = request.get_json()
    name = data.get('name')

    if not name:
        return jsonify({"message": "Group name is required"}), 400

    if Group.query.filter_by(name=name).first():
        return jsonify({"message": f"Group '{name}' already exists"}), 409

    new_group = Group(name=name)
    db.session.add(new_group)
    db.session.commit()

    # Auto-generate 6 sub-subgroups
    sub_subgroup_suffixes = ['A', 'B', 'C', 'D', 'E', 'F'] # Changed to uppercase for consistency
    for suffix in sub_subgroup_suffixes:
        sub_subgroup_name = f"{name}-{suffix}"
        new_sub_subgroup = SubSubgroup(name=sub_subgroup_name, group_id=new_group.id)
        db.session.add(new_sub_subgroup)
    db.session.commit()

    return jsonify(new_group.to_dict()), 201

@app.route('/api/groups/<string:group_id>', methods=['PUT'])
def update_group(group_id):
    data = request.get_json()
    name = data.get('name')

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"message": "Group not found"}), 404

    if not name:
        return jsonify({"message": "Group name is required"}), 400

    # Check for duplicate name if changed
    if name != group.name and Group.query.filter_by(name=name).first():
        return jsonify({"message": f"Group '{name}' already exists"}), 409

    old_name = group.name
    group.name = name
    db.session.commit()

    # Re-generate sub-subgroups if group name changed (simpler approach for now)
    # First, delete old sub-subgroups
    SubSubgroup.query.filter_by(group_id=group.id).delete()
    db.session.commit()

    # Then, create new ones based on the updated name
    sub_subgroup_suffixes = ['A', 'B', 'C', 'D', 'E', 'F']
    for suffix in sub_subgroup_suffixes:
        sub_subgroup_name = f"{name}-{suffix}"
        new_sub_subgroup = SubSubgroup(name=sub_subgroup_name, group_id=group.id)
        db.session.add(new_sub_subgroup)
    db.session.commit()
    
    # Note: If group name changes, associated students' sub_subgroup_id would become invalid
    # This would require a more complex migration or warning to the user.
    # For now, we'll assume group names are somewhat stable or handled carefully by admin.

    return jsonify(group.to_dict()), 200

@app.route('/api/groups/<string:group_id>', methods=['DELETE'])
def delete_group(group_id):
    group = Group.query.get(group_id)
    if not group:
        return jsonify({"message": "Group not found"}), 404
    
    # Cascade delete for sub_subgroups is handled by SQLAlchemy cascade="all, delete-orphan"
    # Ensure students associated with these sub_subgroups are also handled (e.g., set to null or deleted)
    # For simplicity, students and attendance related to deleted groups/subgroups will become 'orphaned'
    # in terms of their foreign key link, or could be explicitly deleted here if desired.
    # The `cascade="all, delete-orphan"` on `sub_subgroups` relationship in Group model should handle this.

    db.session.delete(group)
    db.session.commit()
    return jsonify({"message": "Group deleted successfully"}), 200

# --- Slot Management ---
@app.route('/api/slots', methods=['GET'])
def get_slots():
    slots = LabSlot.query.all()
    return jsonify([slot.to_dict() for slot in slots]), 200

@app.route('/api/slots', methods=['POST'])
def create_slot():
    data = request.get_json()
    course = data.get('course')
    lab = data.get('lab')
    day = data.get('day')
    time = data.get('time')
    group_name = data.get('groupName')
    sub_subgroup_names = data.get('subSubgroups', []) # List of sub-subgroup names

    if not all([course, lab, day, time, group_name, sub_subgroup_names]):
        return jsonify({"message": "Missing required fields"}), 400
    
    # Check for duplicate slots (same day, time, lab)
    if LabSlot.query.filter_by(day=day, time=time, lab=lab).first():
        return jsonify({"message": "A slot for this lab, day, and time already exists."}), 409

    new_slot = LabSlot(course=course, lab=lab, day=day, time=time, group_name=group_name)
    db.session.add(new_slot)
    db.session.flush() # Get ID before commit to link sub-subgroups

    for ssg_name in sub_subgroup_names:
        sub_subgroup = SubSubgroup.query.filter_by(name=ssg_name).first()
        if sub_subgroup:
            slot_ssg_link = SlotSubSubgroup(lab_slot_id=new_slot.id, sub_subgroup_id=sub_subgroup.id)
            db.session.add(slot_ssg_link)
    
    db.session.commit()
    return jsonify(new_slot.to_dict()), 201

@app.route('/api/slots/<string:slot_id>', methods=['PUT'])
def update_slot(slot_id):
    data = request.get_json()
    slot = LabSlot.query.get(slot_id)
    if not slot:
        return jsonify({"message": "Slot not found"}), 404

    course = data.get('course', slot.course)
    lab = data.get('lab', slot.lab)
    day = data.get('day', slot.day)
    time = data.get('time', slot.time)
    group_name = data.get('groupName', slot.group_name)
    sub_subgroup_names = data.get('subSubgroups', [])

    # Check for duplicate slots if day, time, or lab are changing
    if (day != slot.day or time != slot.time or lab != slot.lab) and \
       LabSlot.query.filter_by(day=day, time=time, lab=lab).filter(LabSlot.id != slot_id).first():
        return jsonify({"message": "A slot for this lab, day, and time already exists."}), 409

    slot.course = course
    slot.lab = lab
    slot.day = day
    slot.time = time
    slot.group_name = group_name

    # Update assigned sub-subgroups
    # First, clear existing links
    SlotSubSubgroup.query.filter_by(lab_slot_id=slot.id).delete()
    db.session.flush() # Ensure deletions are processed before new additions

    # Then add new links
    for ssg_name in sub_subgroup_names:
        sub_subgroup = SubSubgroup.query.filter_by(name=ssg_name).first()
        if sub_subgroup:
            slot_ssg_link = SlotSubSubgroup(lab_slot_id=slot.id, sub_subgroup_id=sub_subgroup.id)
            db.session.add(slot_ssg_link)

    db.session.commit()
    return jsonify(slot.to_dict()), 200

@app.route('/api/slots/<string:slot_id>', methods=['DELETE'])
def delete_slot(slot_id):
    slot = LabSlot.query.get(slot_id)
    if not slot:
        return jsonify({"message": "Slot not found"}), 404
    
    db.session.delete(slot)
    db.session.commit()
    return jsonify({"message": "Slot deleted successfully"}), 200

# Helper to get all sub-subgroups for a given group name
@app.route('/api/groups/<string:group_name>/subsubgroups', methods=['GET'])
def get_subsubgroups_for_group(group_name):
    group = Group.query.filter_by(name=group_name).first()
    if not group:
        return jsonify({"message": "Group not found"}), 404
    
    return jsonify([ssg.name for ssg in group.sub_subgroups]), 200

# --- Student Management ---
@app.route('/api/students', methods=['GET'])
def get_students():
    students = Student.query.all()
    return jsonify([student.to_dict() for student in students]), 200

@app.route('/api/students/upload', methods=['POST'])
def upload_students_csv():
    if 'file' not in request.files:
        return jsonify({"message": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400
    
    if file and file.filename.endswith('.csv'):
        try:
            csv_data = pd.read_csv(io.StringIO(file.stream.read().decode('utf-8')))
            expected_headers = ['Roll No', 'Name', 'Sub-subgroup']
            if not all(header in csv_data.columns for header in expected_headers):
                return jsonify({"message": "CSV headers must be 'Roll No, Name, Sub-subgroup'. Please check your file."}), 400

            new_students_count = 0
            warnings = []
            
            all_sub_subgroups = {ssg.name.upper(): ssg.id for ssg in SubSubgroup.query.all()}
            
            for index, row in csv_data.iterrows():
                roll_no = str(row['Roll No']).strip().upper()
                name = str(row['Name']).strip()
                sub_subgroup_name = str(row['Sub-subgroup']).strip().upper()

                if not (roll_no and name and sub_subgroup_name):
                    warnings.append(f"Skipping row {index+2} due to missing data: Roll No '{roll_no}', Name '{name}', Sub-subgroup '{sub_subgroup_name}'")
                    continue
                
                if roll_no in [s.roll_no for s in Student.query.all()]: # Basic check, could be optimized
                    warnings.append(f"Skipping duplicate student: {roll_no}")
                    continue

                sub_subgroup_id = all_sub_subgroups.get(sub_subgroup_name)
                if not sub_subgroup_id:
                    warnings.append(f"Skipping student {roll_no} - Invalid sub-subgroup: {sub_subgroup_name}. Please ensure sub-subgroups exist.")
                    continue

                new_student = Student(roll_no=roll_no, name=name, sub_subgroup_id=sub_subgroup_id)
                db.session.add(new_student)
                new_students_count += 1
            
            db.session.commit()

            message = f"{new_students_count} new students uploaded successfully."
            if warnings:
                message += " Warnings: " + "; ".join(warnings)
                return jsonify({"message": message, "status": "warning"}), 202 # Accepted with warnings
            
            return jsonify({"message": message, "status": "success"}), 201

        except Exception as e:
            db.session.rollback() # Rollback any partial changes
            return jsonify({"message": f"Error processing CSV: {str(e)}"}), 500
    
    return jsonify({"message": "Invalid file type. Please upload a CSV."}), 400

@app.route('/api/students/<string:roll_no>', methods=['DELETE'])
def delete_student(roll_no):
    student = Student.query.get(roll_no)
    if not student:
        return jsonify({"message": "Student not found"}), 404
    
    db.session.delete(student)
    db.session.commit()
    return jsonify({"message": "Student and associated attendance records deleted successfully"}), 200

# --- Attendance Marking ---
@app.route('/api/attendance/slots', methods=['GET'])
def get_attendance_slots():
    slots = LabSlot.query.all()
    result = []
    for slot in slots:
        try:
            subsubgroups = [
                ssg_link.sub_subgroup.name 
                for ssg_link in slot.assigned_sub_subgroups 
                if ssg_link.sub_subgroup
            ]
            result.append({
                'id': slot.id,
                'display': f"{slot.course} - {slot.lab} ({slot.day}, {slot.time})",
                'course': slot.course, # Added for export filter
                'lab': slot.lab, # Added for export filter
                'day': slot.day, # Added for export filter
                'time': slot.time, # Added for export filter
                'groupName': slot.group_name, # Added for export filter
                'subSubgroups': subsubgroups
            })
        except Exception as e:
            print(f"Error processing slot {slot.id}: {e}")
    return jsonify(result), 200


@app.route('/api/attendance/students', methods=['GET'])
def get_students_for_attendance():
    slot_id = request.args.get('slotId')
    sub_subgroup_name = request.args.get('subSubgroup')
    
    if not slot_id or not sub_subgroup_name:
        return jsonify({"message": "Slot ID and Sub-subgroup are required"}), 400
    
    sub_subgroup = SubSubgroup.query.filter_by(name=sub_subgroup_name).first()
    if not sub_subgroup:
        return jsonify({"message": "Sub-subgroup not found"}), 404

    students_in_ssg = Student.query.filter_by(sub_subgroup_id=sub_subgroup.id).all()
    
    today = datetime.date.today().isoformat()
    
    # Fetch existing attendance for this slot, sub-subgroup, and date
    existing_attendance_map = {
        att.roll_no: att.status
        for att in Attendance.query.filter_by(lab_slot_id=slot_id, date=today).all()
        if att.student and att.student.sub_subgroup_id == sub_subgroup.id # Filter by sub-subgroup
    }

    students_data = []
    for student in students_in_ssg:
        students_data.append({
            'rollNo': student.roll_no,
            'name': student.name,
            'initialStatus': existing_attendance_map.get(student.roll_no, 'Absent')
        })
    
    return jsonify(students_data), 200


@app.route('/api/attendance', methods=['POST'])
def save_attendance():
    data = request.get_json()
    attendance_records = data.get('attendanceRecords')
    slot_id = data.get('slotId')
    sub_subgroup_name = data.get('subSubgroupName')

    if not all([attendance_records, slot_id, sub_subgroup_name]):
        return jsonify({"message": "Missing required attendance data"}), 400

    current_slot = LabSlot.query.get(slot_id)
    if not current_slot:
        return jsonify({"message": "Selected slot not found."}), 404
    
    today = datetime.date.today().isoformat()
    
    for record in attendance_records:
        roll_no = record.get('rollNo')
        status = record.get('status')
        student_name = record.get('name') # Passed from frontend
        
        student = Student.query.get(roll_no)
        if not student:
            print(f"Warning: Student {roll_no} not found, skipping attendance record.")
            continue

        # Find or create attendance record
        existing_attendance = Attendance.query.filter_by(
            roll_no=roll_no,
            lab_slot_id=slot_id,
            date=today
        ).first()

        if existing_attendance:
            existing_attendance.status = status
            existing_attendance.marked_at = datetime.datetime.now().isoformat()
        else:
            new_attendance = Attendance(
                roll_no=roll_no,
                lab_slot_id=slot_id,
                date=today,
                status=status,
                marked_by='admin', # Hardcoded for now
                marked_at=datetime.datetime.now().isoformat()
            )
            db.session.add(new_attendance)
    
    db.session.commit()
    return jsonify({"message": "Attendance saved successfully"}), 200

# --- NEW: Attendance Export Endpoint ---
@app.route('/api/attendance/export', methods=['GET'])
def export_attendance():
    slot_id = request.args.get('slotId')
    sub_subgroup_id = request.args.get('subSubgroupId') # Changed to ID
    start_date_str = request.args.get('startDate')
    end_date_str = request.args.get('endDate')

    query = Attendance.query.order_by(Attendance.date.desc(), Attendance.lab_slot_id)

    if slot_id:
        query = query.filter(Attendance.lab_slot_id == slot_id)
    
    if sub_subgroup_id: # Filter by actual sub_subgroup_id
        # Need to join with Student table to filter by student's sub_subgroup
        query = query.join(Student).filter(Student.sub_subgroup_id == sub_subgroup_id)

    if start_date_str:
        query = query.filter(Attendance.date >= start_date_str)
    if end_date_str:
        query = query.filter(Attendance.date <= end_date_str)

    attendance_records = query.all()

    # Prepare data for DataFrame
    export_data = []
    for record in attendance_records:
        slot = record.lab_slot
        student = record.student
        export_data.append({
            'Roll No': record.roll_no,
            'Student Name': student.name if student else 'N/A',
            'Sub-subgroup': student.sub_subgroup.name if student and student.sub_subgroup else 'N/A',
            'Course': slot.course if slot else 'N/A',
            'Lab': slot.lab if slot else 'N/A',
            'Day': slot.day if slot else 'N/A',
            'Time': slot.time if slot else 'N/A',
            'Date': record.date,
            'Status': record.status,
            'Marked By': record.marked_by,
            'Marked At': record.marked_at
        })

    if not export_data:
        return jsonify({"message": "No attendance data found for the selected filters."}), 404

    df = pd.DataFrame(export_data)

    # Create an in-memory Excel file
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Attendance')
    output.seek(0)

    filename = f"attendance_export_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return send_file(output, as_attachment=True, download_name=filename, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')


# --- Public Schedule (for index.html) ---
@app.route('/api/public_schedule', methods=['GET'])
def get_public_schedule():
    slots = LabSlot.query.all()
    return jsonify([slot.to_dict() for slot in slots]), 200

# --- Student Lookup (for student.html) ---
@app.route('/api/student_lookup/<string:roll_no>', methods=['GET'])
def student_lookup(roll_no):
    student = Student.query.get(roll_no.upper())
    if not student:
        return jsonify({"message": f"Student with Roll No. {roll_no} not found."}), 404
    
    # Get student's assigned sub-subgroup
    sub_subgroup = student.sub_subgroup

    # Find slots where this sub-subgroup is assigned
    assigned_slots = []
    if sub_subgroup:
        slot_links = SlotSubSubgroup.query.filter_by(sub_subgroup_id=sub_subgroup.id).all()
        for link in slot_links:
            lab_slot = LabSlot.query.get(link.lab_slot_id)
            if lab_slot:
                assigned_slots.append(lab_slot.to_dict())

    # Get student's attendance records
    attendance_records = Attendance.query.filter_by(roll_no=student.roll_no).order_by(Attendance.date.desc()).all()
    attendance_data = [att.to_dict() for att in attendance_records]
    
    return jsonify({
        'student': student.to_dict(),
        'assignedSlots': assigned_slots,
        'attendanceRecords': attendance_data
    }), 200

if __name__ == '__main__':
    with app.app_context():
        create_tables_and_seed_data()
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

@app.route('/')
def home():
    return "Server is running!"
