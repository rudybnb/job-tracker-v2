# Job Tracker - Project TODO

## Architecture Overview
- Contractors = Daily rate workers (paid by time/day)
- Subcontractors = Price/milestone workers (paid per completed phase)
- Budget tracking = Admin only
- GPS tracking = Health & safety (track who's on site)
- Clock in/out = Auto-calculates time and money, creates expense records
- Payroll = Linked to labour budget tracking

## Phase 1: Theme & Design
- [x] Switch to dark theme matching old app (dark navy background)
- [x] Ensure blue accent color hsl(218, 89%, 61%) is applied throughout

## Phase 2: Database Schema Updates
- [x] Add contractor type field (contractor vs subcontractor)
- [x] Add daily rate field for contractors
- [x] Add milestone/phase pricing for subcontractors
- [x] Add GPS coordinates to work sessions
- [x] Add clock in/out timestamps
- [x] Link work sessions to expenses automatically

## Phase 3: Job Assignment
- [ ] Create assignment page with multi-select contractors
- [ ] Add contractor type selection (daily rate vs milestone)
- [ ] Work location (postcode) field
- [ ] HBXL job dropdown (loads from database)
- [ ] Dynamic build phases from selected job
- [ ] Start/end date fields
- [ ] Special instructions textarea
- [ ] Team assignment support
- [ ] Create assignment API endpoint

## Phase 4: Clock In/Out & GPS
- [ ] Build clock in/out interface
- [ ] Capture GPS location on clock in/out
- [ ] Auto-calculate work hours
- [ ] Auto-create expense records for contractors (daily rate × hours)
- [ ] Store GPS data for health & safety records
- [ ] Show who's currently on site

## Phase 5: Budget Tracking (Admin Only)
- [ ] Job budget dashboard
- [ ] Labour costs tracking (contractors)
- [ ] Milestone payments tracking (subcontractors)
- [ ] Materials budget tracking
- [ ] Expense logging and approval
- [ ] Budget vs actual comparison
- [ ] Payroll integration

## Phase 6: Contractor/Subcontractor Dashboards
- [ ] Contractor view: assigned jobs, phases, clock in/out
- [ ] Subcontractor view: assigned jobs, milestones, progress tracking
- [ ] Phase/sub-phase progress monitoring (no budget visibility)
- [ ] Task completion marking
- [ ] Photo upload for completed work

## Phase 7: Additional Features
- [ ] Telegram notifications (optional)
- [ ] Payroll reports
- [ ] Health & safety reports (GPS tracking data)
- [ ] Job completion workflow

## Completed Features
- [x] Database schema (initial)
- [x] CSV upload
- [x] Job creation from CSV
- [x] Recent uploads with delete buttons
- [x] Basic navigation
- [x] Color scheme matching old app
