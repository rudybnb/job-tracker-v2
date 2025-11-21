# HBXL Job Tracker Design

## 🎯 Business Requirements

### How HBXL Works
- HBXL provides complete job breakdown with **work phases**
- Each phase has material cost and labour cost
- Example phases: Masonry Shell, Joinery 1st Fix, Electrical 2nd Fix, Plastering, etc.

### How Contractors Work
- **Main Contractors**: Take entire job, manage all phases, paid hourly or per phase
- **Subcontractors**: Prefer **per-room fixed pricing**
  - Example: £1000 per room (includes skirting, ceiling, paint, sockets, lights, windows)
  - 4 bedrooms = £4000
  - Ensuite = additional cost

### What We Need to Track
1. **Job-level**: Total budget, material costs (from HBXL), labour budget
2. **Phase-level**: Which HBXL phases are in the job, completion status
3. **Room-level**: How many rooms, which floors, room types (bedroom, kitchen, bathroom)
4. **Contractor-level**: Who's assigned, their pricing model (hourly vs. per-room)
5. **Payment-level**: Track what's been paid vs. what's owed

---

## 📊 Database Schema Design

### **1. Jobs Table** (existing - enhanced)
```
jobs
├── id
├── name (e.g., "Timi Fofuyen - Extension")
├── projectType (e.g., "Extension")
├── address
├── postcode
├── totalBudget (£25635.23)
├── materialCost (£13725.23 - from HBXL)
├── labourBudget (£11910.00 - from HBXL)
├── status (pending, active, completed)
└── dates (start, end, created)
```

### **2. Job Phases Table** (NEW)
Tracks HBXL work phases for each job
```
jobPhases
├── id
├── jobId (FK → jobs)
├── phaseName (e.g., "Masonry Shell", "Joinery 1st Fix")
├── phaseOrder (1, 2, 3... for sequencing)
├── materialCost (cost for this phase from HBXL)
├── labourCost (labour for this phase from HBXL)
├── status (not_started, in_progress, completed)
├── completionPercentage (0-100%)
└── dates (startDate, completedDate)
```

### **3. Job Rooms Table** (NEW)
Tracks rooms/areas in the job
```
jobRooms
├── id
├── jobId (FK → jobs)
├── roomName (e.g., "Bedroom 1", "Kitchen", "Ensuite")
├── roomType (bedroom, bathroom, kitchen, living_room, hallway)
├── floor (ground_floor, first_floor, second_floor)
├── squareMeters (optional - for pricing calculations)
└── status (not_started, in_progress, completed)
```

### **4. Contractor Assignments Table** (enhanced)
Links contractors to jobs with their pricing model
```
jobAssignments
├── id
├── jobId (FK → jobs)
├── contractorId (FK → contractors)
├── role (main_contractor, subcontractor)
├── pricingModel (hourly, per_room, per_phase, fixed_price)
├── hourlyRate (if pricingModel = hourly)
├── pricePerRoom (if pricingModel = per_room, e.g., £1000)
├── fixedPrice (if pricingModel = fixed_price)
├── assignedPhases (JSON array of phase IDs they're responsible for)
├── assignedRooms (JSON array of room IDs they're responsible for)
└── dates (assignedDate, startDate, endDate)
```

### **5. Room Completion Tracking** (NEW)
Tracks which contractor completed which room
```
roomCompletions
├── id
├── jobRoomId (FK → jobRooms)
├── contractorId (FK → contractors)
├── completedDate
├── photosUrls (JSON array of before/after photos)
├── notes (any issues or comments)
└── approvedBy (admin user ID)
```

### **6. Phase Progress Updates** (NEW)
Tracks progress on HBXL phases
```
phaseProgress
├── id
├── jobPhaseId (FK → jobPhases)
├── contractorId (FK → contractors)
├── updateDate
├── completionPercentage (0-100%)
├── notes (what was done)
├── photosUrls (JSON array)
└── reportedVia (telegram, web_app, manual)
```

---

## 🔄 Workflow Design

### **Step 1: Upload HBXL Job**
```
Admin uploads CSV/data with:
- Job name, address, postcode
- Total budget, material cost, labour cost
- List of phases (Masonry Shell, Joinery 1st Fix, etc.)
- Material and labour cost per phase

System creates:
✅ Job record
✅ Job phases records (one per HBXL phase)
```

### **Step 2: Define Rooms**
```
Admin adds rooms:
- Bedroom 1, Bedroom 2, Bedroom 3, Bedroom 4 (First Floor)
- Kitchen, Dining Room, Living Room (Ground Floor)
- Ensuite (First Floor)

System creates:
✅ Job rooms records
```

### **Step 3: Assign Contractors**
```
Admin assigns contractors:

Main Contractor (Rudy):
- Role: Main Contractor
- Pricing: Hourly (£25/hour)
- Responsible for: All phases
- Assigned rooms: All

Subcontractor (Marius):
- Role: Subcontractor
- Pricing: Per Room (£1000/room)
- Responsible for: Internal Fitting Out, Plastering, Painting
- Assigned rooms: Bedroom 1, Bedroom 2, Bedroom 3, Bedroom 4

System creates:
✅ Job assignment records
✅ Sends Telegram invitations
```

### **Step 4: Contractors Accept/Decline**
```
Telegram message to Marius:
"🏗️ New Job Assignment!

Job: Timi Fofuyen - Extension
Location: Orpington, BR6 9HQ
Your role: Subcontractor (Internal Fitting)

Assigned rooms:
- Bedroom 1 (£1000)
- Bedroom 2 (£1000)
- Bedroom 3 (£1000)
- Bedroom 4 (£1000)
Total: £4000

Phases:
- Internal Fitting Out
- Plastering
- Painting

[Accept] [Decline] [View Details]"

If Accept:
✅ Job status → Active
✅ Morning check-ins start
✅ Can send progress updates
```

### **Step 5: Daily Work & Progress**
```
Morning (8:15 AM):
- n8n sends check-in message
- Contractors reply "yes" or reason

During Day:
- Contractors send voice updates:
  "Finished plastering Bedroom 1, starting Bedroom 2"
  
- System transcribes and:
  ✅ Creates phase progress record
  ✅ Updates completion percentage
  ✅ Links to specific room

End of Day:
- System calculates:
  - Hours worked (for hourly contractors)
  - Rooms completed (for per-room contractors)
  - Payment owed
```

### **Step 6: Payment Calculation**
```
Main Contractor (Hourly):
- Hours worked: 8 hours
- Rate: £25/hour
- Payment: £200

Subcontractor (Per Room):
- Rooms completed: 2 (Bedroom 1, Bedroom 2)
- Rate: £1000/room
- Payment: £2000

Admin Dashboard shows:
- Total paid: £2200
- Total owed: £1800 (2 rooms remaining)
- Budget remaining: £25635.23 - £2200 = £23435.23
```

---

## 📱 Telegram Bot Enhancements

### New Commands/Queries

**For Contractors:**
- "What rooms am I assigned to?"
- "How many rooms have I completed?"
- "How much will I earn from this job?"
- "Mark Bedroom 1 as complete"

**For Admin:**
- "Show job progress for Timi Fofuyen"
- "Which rooms are completed?"
- "How much have I paid Marius?"
- "What's the budget remaining?"

---

## 🎨 UI Enhancements Needed

### Job Details Page
```
Job: Timi Fofuyen - Extension
Status: In Progress
Budget: £25635.23 | Spent: £2200 | Remaining: £23435.23

📋 Phases (10)
✅ Masonry Shell (100%)
🔄 Joinery 1st Fix (60%)
⏳ Electrical 2nd Fix (0%)
...

🏠 Rooms (8)
Ground Floor:
  ✅ Kitchen (Completed by Rudy)
  🔄 Dining Room (In Progress - Marius)
  ⏳ Living Room (Not Started)

First Floor:
  ✅ Bedroom 1 (Completed by Marius)
  ✅ Bedroom 2 (Completed by Marius)
  🔄 Bedroom 3 (In Progress - Marius)
  ⏳ Bedroom 4 (Not Started)
  ⏳ Ensuite (Not Started)

👷 Contractors (2)
Rudy Diedericks (Main Contractor)
  - Pricing: £25/hour
  - Hours worked: 40
  - Earned: £1000
  - Owed: £200

Marius Andronache (Subcontractor)
  - Pricing: £1000/room
  - Rooms completed: 2/4
  - Earned: £2000
  - Owed: £2000
```

---

## 🚀 Implementation Priority

### Phase 1: Database Schema (Critical)
1. Create new tables: jobPhases, jobRooms, roomCompletions, phaseProgress
2. Enhance jobAssignments table with pricing models
3. Run migrations

### Phase 2: Job Upload Flow
1. CSV parser for HBXL data
2. Phase creation interface
3. Room definition interface

### Phase 3: Contractor Assignment
1. Assignment UI with pricing model selection
2. Telegram invitation system
3. Accept/decline workflow

### Phase 4: Progress Tracking
1. Voice message → room/phase linking
2. Completion percentage calculations
3. Payment calculations

### Phase 5: Reporting & Dashboard
1. Job progress visualization
2. Payment summaries
3. Budget tracking

---

## 💡 Key Benefits

✅ **Flexible pricing**: Supports hourly, per-room, per-phase, fixed-price
✅ **Accurate tracking**: Links progress to specific rooms and phases
✅ **Automated payments**: Calculates what's owed based on completion
✅ **HBXL integration**: Matches their phase-based structure
✅ **Contractor preferences**: Subcontractors can work per-room
✅ **Real-time updates**: Voice messages update progress automatically
✅ **Budget control**: Always know how much spent vs. remaining
