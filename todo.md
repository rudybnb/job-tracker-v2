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
- [x] Update color scheme: yellow (#FFD700) for labels, green (#10B981) for action buttons, blue (#3B82F6) for secondary actions

## Phase 2: Database Schema Updates
- [x] Add contractor type field (contractor vs subcontractor)
- [x] Add daily rate field for contractors
- [x] Add milestone/phase pricing for subcontractors
- [x] Add GPS coordinates to work sessions
- [x] Add clock in/out timestamps
- [x] Link work sessions to expenses automatically

## Phase 3: Job Assignment
- [x] Create assignment page with multi-select contractors
- [x] Add contractor type selection (daily rate vs milestone)
- [x] Work location (postcode) field
- [x] HBXL job dropdown (loads from database)
- [ ] Dynamic build phases from selected job
- [x] Start/end date fields
- [x] Special instructions textarea
- [x] Team assignment support
- [x] Create assignment API endpoint

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


## Bug Fixes
- [x] Fix jobs not loading on Job Assignments page (jobs are loading correctly)
- [x] Restore delete buttons on CSV Upload page (improved visibility with red color)

## Color Scheme Refinement
- [x] Update to exact old app colors: #1F2A38 (navy bg), #D97706 (amber buttons), #333D4D (slate borders), #3682FF (primary blue)

## Database Maintenance
- [x] Clear all data from database (jobs, contractors, assignments, uploads, etc.)

## Job Assignment Enhancements
- [ ] Implement dynamic build phase selection when job is selected
- [ ] Add Select All / Clear All buttons for phases
- [ ] Show phase count in job dropdown (e.g., "Timi (5 phases)")

## CSV Upload Issues
- [x] Fix CSV upload stuck in "processing" status (deleted stuck record)
- [x] Fix Build Phase column extraction (using csv-parse library now)
- [x] Ensure phases are properly linked to jobs after CSV upload

## Urgent Bugs
- [x] CSV upload stuck in "processing" status - deleted and ready for re-upload
- [x] Delete button visible in Recent Uploads section
- [x] Database cleared - ready for fresh upload with fixed code

## Jobs Page Enhancement
- [x] Add delete buttons to Jobs page for individual job deletion
- [x] Add delete confirmation dialog
- [x] Update job list after deletion

## CSV Upload Cascade Delete
- [x] Add uploadId field to jobs table to track which upload created each job
- [x] Update CSV upload process to store uploadId when creating jobs
- [x] Fix deleteUpload to cascade delete all jobs created from that upload
- [x] Ensure all related data (phases, assignments, etc.) are also deleted

## Major CSV & Job Assignment Restructuring
- [x] Add jobResources table to store individual resource lines (labour/material)
- [x] Add totalLabourCost and totalMaterialCost fields to jobs table
- [x] Rewrite CSV processing to group by client (Name) instead of creating multiple jobs
- [x] Calculate labour cost (sum of Labour type resources) and material cost (sum of Material type resources)
- [x] Store postCode separately in jobs table for auto-fill
- [x] Update Jobs page to show: Client Name, Address, Total Labour, Total Material (one line per client)
- [x] Add contractor role/type badges in assignment UI (Contractor/Subcontractor)
- [x] Auto-fill postcode when client/job is selected in assignment form
- [ ] Add Team Assignment Mode notification about Telegram messages
- [ ] Remove Start/End Date fields from assignment (phases only)

## CSV Upload Preview Feature
- [x] Add CSV detection/preview endpoint that parses without creating jobs
- [x] Create preview UI showing: detected jobs, phases, labour/material costs
- [x] Add "Approve & Create Jobs" button to confirm and create
- [x] Add "Cancel" button to discard preview
- [ ] Test complete two-step workflow

## Upload Button Bug
- [x] Fix upload button not appearing when CSV file is selected (fixed file type validation)

## CSV Parser Format Support
- [x] Update CSV parser to handle Smart Schedule Export format (metadata header rows + data section)
- [x] Created csvProcessorNew.ts with parseSmartScheduleCSV function
- [x] Updated detectJobs and upload mutations to use new parser
- [x] Successfully tested with real Smart Schedule Export file (121 resources, 8 phases, £25,635.23 total)

## Phase Extraction Bug
- [x] CSV parser not extracting all build phases from Smart Schedule Export
- [x] Investigate which phases are missing (External Decoration, Internal Preparation)
- [x] Fix parser to capture all phases correctly (implemented forward-fill logic)
- [x] Verified all 10 phases now extracted correctly
