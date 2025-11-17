# HBXL Job Tracker - Visual Workflow

## 📊 Database Relationships

```mermaid
erDiagram
    JOBS ||--o{ JOB_PHASES : "has"
    JOBS ||--o{ JOB_ROOMS : "has"
    JOBS ||--o{ JOB_ASSIGNMENTS : "has"
    
    CONTRACTORS ||--o{ JOB_ASSIGNMENTS : "assigned to"
    CONTRACTORS ||--o{ ROOM_COMPLETIONS : "completes"
    CONTRACTORS ||--o{ PHASE_PROGRESS : "updates"
    
    JOB_ROOMS ||--o{ ROOM_COMPLETIONS : "tracked by"
    JOB_PHASES ||--o{ PHASE_PROGRESS : "tracked by"
    
    JOBS {
        int id PK
        string name
        string projectType
        string address
        decimal totalBudget
        decimal materialCost
        decimal labourBudget
        string status
    }
    
    JOB_PHASES {
        int id PK
        int jobId FK
        string phaseName
        int phaseOrder
        decimal materialCost
        decimal labourCost
        string status
        int completionPercentage
    }
    
    JOB_ROOMS {
        int id PK
        int jobId FK
        string roomName
        string roomType
        string floor
        string status
    }
    
    JOB_ASSIGNMENTS {
        int id PK
        int jobId FK
        int contractorId FK
        string role
        string pricingModel
        decimal hourlyRate
        decimal pricePerRoom
        decimal fixedPrice
        json assignedPhases
        json assignedRooms
    }
    
    ROOM_COMPLETIONS {
        int id PK
        int jobRoomId FK
        int contractorId FK
        datetime completedDate
        json photosUrls
    }
    
    PHASE_PROGRESS {
        int id PK
        int jobPhaseId FK
        int contractorId FK
        datetime updateDate
        int completionPercentage
        string notes
    }
```

---

## 🔄 Job Upload & Assignment Workflow

```mermaid
flowchart TD
    Start([Admin Uploads HBXL Job]) --> ParseCSV[Parse CSV Data]
    ParseCSV --> CreateJob[Create Job Record]
    CreateJob --> CreatePhases[Create Job Phases<br/>Masonry, Joinery, Electrical, etc.]
    CreatePhases --> DefineRooms[Admin Defines Rooms<br/>Bedrooms, Kitchen, Bathrooms]
    
    DefineRooms --> AssignMain[Assign Main Contractor<br/>Pricing: Hourly]
    AssignMain --> AssignSub[Assign Subcontractors<br/>Pricing: Per Room]
    
    AssignSub --> SendInvite[Send Telegram Invitations]
    SendInvite --> WaitResponse{Contractor<br/>Response}
    
    WaitResponse -->|Accept| ActivateJob[Activate Job]
    WaitResponse -->|Decline| FindReplacement[Find Replacement]
    WaitResponse -->|No Response| Reminder[Send Reminder]
    
    ActivateJob --> StartWork[Job Active<br/>Morning Check-ins Begin]
    FindReplacement --> AssignSub
    Reminder --> WaitResponse
```

---

## 📅 Daily Work Cycle

```mermaid
flowchart TD
    Morning[8:15 AM<br/>Morning Check-in] --> SendMsg[n8n Sends Messages<br/>to All Contractors]
    SendMsg --> ContractorReply{Contractor<br/>Reply}
    
    ContractorReply -->|Yes/Working| RecordPresent[Record Check-in<br/>Status: Present]
    ContractorReply -->|Reason| RecordAbsent[Record Check-in<br/>Status: Absent + Reason]
    
    RecordPresent --> WorkDay[During Work Day]
    RecordAbsent --> WorkDay
    
    WorkDay --> VoiceMsg[Contractor Sends<br/>Voice Message]
    VoiceMsg --> Transcribe[Transcribe with Whisper API]
    Transcribe --> AnalyzeAI[AI Analyzes Content]
    
    AnalyzeAI --> IsProgress{Is Progress<br/>Update?}
    IsProgress -->|Yes| ExtractInfo[Extract:<br/>- Which room?<br/>- Which phase?<br/>- Completion %]
    IsProgress -->|No| ChatbotReply[AI Chatbot Reply]
    
    ExtractInfo --> UpdateDB[Update Database:<br/>- Phase Progress<br/>- Room Status<br/>- Completion %]
    UpdateDB --> CalcPayment[Calculate Payment]
    
    CalcPayment --> CheckModel{Pricing<br/>Model}
    CheckModel -->|Hourly| CalcHours[Hours × Rate]
    CheckModel -->|Per Room| CalcRooms[Completed Rooms × Rate]
    
    CalcHours --> SendConfirm[Send Confirmation<br/>to Contractor]
    CalcRooms --> SendConfirm
    ChatbotReply --> SendConfirm
    
    SendConfirm --> EndDay[End of Day<br/>Generate Reports]
```

---

## 💰 Payment Calculation Logic

```mermaid
flowchart TD
    Start([Calculate Payment]) --> GetAssignment[Get Contractor Assignment]
    GetAssignment --> CheckModel{Pricing Model}
    
    CheckModel -->|Hourly| GetHours[Get Work Sessions<br/>for Today]
    CheckModel -->|Per Room| GetRooms[Get Completed Rooms<br/>for Today]
    CheckModel -->|Per Phase| GetPhases[Get Completed Phases<br/>for Today]
    CheckModel -->|Fixed Price| GetMilestones[Get Completed Milestones]
    
    GetHours --> CalcHourly[Total Hours × Hourly Rate]
    GetRooms --> CalcRoom[Rooms Completed × Price Per Room]
    GetPhases --> CalcPhase[Phases Completed × Phase Price]
    GetMilestones --> CalcFixed[Milestone % × Fixed Price]
    
    CalcHourly --> UpdateOwed[Update Amount Owed]
    CalcRoom --> UpdateOwed
    CalcPhase --> UpdateOwed
    CalcFixed --> UpdateOwed
    
    UpdateOwed --> CheckBudget{Within<br/>Budget?}
    CheckBudget -->|Yes| SavePayment[Save Payment Record]
    CheckBudget -->|No| AlertAdmin[Alert Admin<br/>Budget Exceeded]
    
    SavePayment --> NotifyContractor[Notify Contractor<br/>Payment Calculated]
    AlertAdmin --> NotifyContractor
```

---

## 🏠 Room Completion Tracking

```mermaid
flowchart TD
    Start([Contractor Reports<br/>Room Complete]) --> VoiceOrText{Via Voice<br/>or Text?}
    
    VoiceOrText -->|Voice| Transcribe[Transcribe Message]
    VoiceOrText -->|Text| ParseText[Parse Text]
    
    Transcribe --> AIExtract[AI Extracts:<br/>Room Name, Status]
    ParseText --> AIExtract
    
    AIExtract --> IdentifyRoom[Identify Room ID<br/>from Job Rooms]
    IdentifyRoom --> CheckAssigned{Contractor<br/>Assigned to<br/>this Room?}
    
    CheckAssigned -->|Yes| RequestPhotos[Request Photos<br/>Before/After]
    CheckAssigned -->|No| ErrorMsg[Error: Not Assigned]
    
    RequestPhotos --> PhotosReceived{Photos<br/>Received?}
    PhotosReceived -->|Yes| CreateCompletion[Create Room Completion<br/>Record]
    PhotosReceived -->|No| Reminder[Send Reminder]
    
    CreateCompletion --> UpdateRoomStatus[Update Room Status<br/>to Completed]
    UpdateRoomStatus --> CalcPayment[Calculate Payment<br/>for This Room]
    
    CalcPayment --> NotifyAdmin[Notify Admin<br/>for Approval]
    NotifyAdmin --> AdminReview{Admin<br/>Approves?}
    
    AdminReview -->|Yes| ReleasePayment[Mark for Payment]
    AdminReview -->|No| RequestRework[Request Rework]
    
    ReleasePayment --> UpdateBudget[Update Job Budget<br/>Spent Amount]
    RequestRework --> NotifyContractor[Notify Contractor]
```

---

## 📊 Example: 4-Bedroom Job Flow

```mermaid
gantt
    title Timi Fofuyen Extension - 4 Bedrooms
    dateFormat  YYYY-MM-DD
    
    section Ground Floor
    Kitchen (Main Contractor)           :done, kitchen, 2024-01-01, 5d
    Dining Room (Main Contractor)       :active, dining, 2024-01-06, 3d
    Living Room (Main Contractor)       :living, 2024-01-09, 4d
    
    section First Floor
    Bedroom 1 (Subcontractor)          :done, bed1, 2024-01-02, 3d
    Bedroom 2 (Subcontractor)          :done, bed2, 2024-01-05, 3d
    Bedroom 3 (Subcontractor)          :active, bed3, 2024-01-08, 3d
    Bedroom 4 (Subcontractor)          :bed4, 2024-01-11, 3d
    Ensuite (Subcontractor)            :ensuite, 2024-01-14, 2d
    
    section Payments
    Main Contractor Payment 1          :milestone, pay1, 2024-01-06, 0d
    Subcontractor Payment 1 (2 rooms)  :milestone, pay2, 2024-01-08, 0d
    Subcontractor Payment 2 (2 rooms)  :milestone, pay3, 2024-01-14, 0d
```

**Payment Breakdown:**
- Main Contractor: £25/hour × 96 hours = £2400
- Subcontractor: £1000/room × 4 rooms = £4000
- **Total Labour**: £6400
- **Material Cost**: £13725.23 (from HBXL)
- **Total Job Cost**: £20125.23

---

## 🎯 Key Features Summary

### 1. **Flexible Contractor Pricing**
- Hourly rates for main contractors
- Per-room pricing for subcontractors
- Per-phase pricing option
- Fixed-price option

### 2. **Accurate Progress Tracking**
- Link voice updates to specific rooms
- Track phase completion percentages
- Before/after photos required
- Admin approval workflow

### 3. **Automated Payment Calculation**
- Real-time payment tracking
- Budget vs. spent monitoring
- Payment approval workflow
- Contractor payment history

### 4. **HBXL Integration**
- Import phases from HBXL
- Track material costs separately
- Match labour to phases
- Budget compliance alerts

### 5. **Telegram Bot Intelligence**
- Understands room names in voice messages
- Automatically updates progress
- Calculates payments on completion
- Sends notifications to admin
