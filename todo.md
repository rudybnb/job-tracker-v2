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

## Telegram Contractor Registration System
- [ ] Update database schema for contractor applications (6-step form data)
- [ ] Add contractorApplications table with all form fields
- [ ] Add status field (pending/approved/rejected) and approval workflow
- [ ] Build Telegram bot integration for sending registration forms
- [ ] Create webhook endpoint to receive Telegram form submissions
- [ ] Implement file upload handling for passport photos (S3 storage)
- [ ] Build admin review interface with tabs (Pending/Approved/Rejected)
- [ ] Add approve/reject buttons with admin notes and CIS rate setting
- [ ] Create "Send Form" interface for admins to invite new contractors
- [ ] Test complete workflow: send form → contractor fills → admin reviews → approval
- [ ] Upon approval, automatically create contractor record in contractors table

## Contractor Application Statistics Bug
- [x] Fixed statistics refresh bug - counts now update correctly after approval/rejection
- [x] Added separate stats query endpoint (returns pending/approved/rejected counts)
- [x] Updated mutations to invalidate both listByStatus and stats queries

## Telegram Bot Integration - Public Form
- [ ] Create public contractor registration form page (no login required)
- [ ] Add route /contractor-form with URL parameters (id, name, telegram_id)
- [ ] Build 6-step form UI matching Telegram bot workflow
- [ ] Add file upload for passport photos (S3 storage)
- [ ] Pre-fill name from URL parameter
- [ ] Submit to existing contractorApplications.submit endpoint
- [ ] Show success message with "Form submitted" confirmation

## Telegram Bot Integration - Admin Interface
- [ ] Create "Send Invite" page for admins
- [ ] Add form fields: contractor name, phone/telegram username
- [ ] Generate unique form link with contractor ID
- [ ] Create API endpoint to trigger Telegram bot message
- [ ] Display generated link for manual sharing (fallback)
- [ ] Add invite history/tracking

## Telegram Bot API Documentation
- [ ] Document POST endpoint for bot to submit applications
- [ ] Document webhook format for form submissions
- [ ] Create example request/response for bot integration
- [ ] Add authentication method for bot API calls

## Telegram Bot Integration - Complete Implementation
- [x] Create Telegram service module (server/telegram.ts)
- [x] Add TELEGRAM_BOT_TOKEN to environment variables (needs to be configured)
- [x] Build sendContractorInvite function
- [x] Create public contractor form page (/contractor-form)
- [ ] Add file upload support for passport photos (form ready, S3 integration pending)
- [x] Build admin Send Invite interface
- [x] Add API endpoint to trigger bot messages
- [x] Test complete workflow end-to-end

## Telegram Bot URL Bug
- [x] Fix Telegram form link to use public URL instead of localhost
- [x] Test form access from Telegram message on mobile device

## Passport Photo Upload Feature
- [x] Update contractorApplications table schema to add passportPhotoUrl field (already existed)
- [x] Create file upload API endpoint (trpc mutation)
- [x] Integrate S3 storage for file uploads
- [x] Add file upload UI component to Step 2 (Right to Work) of contractor form
- [x] Implement file validation (image types, size limits)
- [x] Show upload progress and preview
- [x] Test complete upload workflow

## Contractor Detail Page with Admin Controls
- [x] Create ContractorDetail.tsx page component
- [x] Design layout with sections: Personal Info, Tax & CIS, Banking, Work Details, Admin Details
- [x] Add editable Admin Details section (CIS status, daily rate, notes)
- [x] Create API endpoint to update contractor admin fields
- [x] Add route for /contractors/:id
- [x] Update Contractors list to link to detail page
- [x] Test editing admin details and saving

## Real Contractor Data
- [x] Delete existing test contractor records
- [x] Add Mohamed Guizeni (Plumber, 11-15 years)
- [x] Add Marius Andronache (General Builder, 6-10 years)
- [x] Add Dalwayne Diedericks (General Builder, 6-10 years)
- [x] Verify all contractors display correctly

## Contractor Delete Functionality
- [x] Add delete API endpoint to contractors router
- [x] Add deleteContractor database function
- [x] Add delete button to contractor detail page
- [x] Implement confirmation dialog before deletion
- [x] Handle navigation after successful deletion
- [x] Test cascade deletion of related records

## Job Assignment UI Updates
- [x] Change contractor selection from checkboxes to dropdown
- [x] Remove daily rate display from contractor selection
- [x] Filter dropdown to show only assigned contractors
- [x] Test assignment creation with new dropdown interface

## Phase Cost Breakdown for Milestone Payments
- [x] Create API endpoint to calculate labour/material costs per phase
- [x] Query jobResources table grouped by buildPhase
- [x] Sum labour costs (resourceType = 'Labour') per phase
- [x] Sum material costs (resourceType = 'Material') per phase
- [x] Build job detail page showing phase breakdown
- [x] Display each phase with: phase name, labour cost, material cost, total cost
- [x] Test with real job data to verify milestone payment amounts

## Expandable Materials List for Phase Breakdown
- [x] Create API endpoint to fetch material resources by job ID and phase name
- [x] Query jobResources table filtered by typeOfResource = 'Material' and buildPhase
- [x] Return material details: description, quantity, cost, supplier
- [x] Update JobDetail page to make Material Cost clickable/expandable
- [x] Add collapsible UI component to show/hide materials list
- [x] Display each material with: description, quantity, unit cost, total cost
- [x] Test expansion with real phase data (Masonry Shell, Plumbing 1st Fix)
- [ ] Consider future feature: track purchased vs. needed materials

## Assignment Cost Display in Active Assignments
- [x] Calculate labour cost for assigned phases in each assignment
- [x] Calculate material cost for assigned phases in each assignment
- [x] Update Job Assignments page to display labour and material costs per assignment
- [x] Show total cost (labour + material) for each assignment
- [x] Test with assignments that have multiple phases
- [x] Verify costs match the phase breakdown in job detail page

## Labour Time Validation for Assignments
- [x] Extract labour hours/quantity data from jobResources for assigned phases
- [x] Calculate total labour days required (sum of labour quantities for all assigned phases)
- [x] Calculate available working days from assignment start/end dates
- [x] Compare required vs available time and determine if allocation is sufficient
- [x] Display validation status on assignment cards (OK, Warning, or Exceeded)
- [x] Show detailed breakdown: "X days required, Y days allocated"
- [x] Test with real assignments to verify accuracy
