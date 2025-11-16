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

## Auto-Adjust Assignment Dates
- [x] Add "Suggest Dates" button to assignment creation form
- [x] Calculate minimum required end date based on labour days needed
- [x] Display suggested date range to user
- [x] Allow user to accept or modify suggested dates
- [x] Update time validation after date adjustment

## Multi-Contractor Scheduling
- [x] Support assigning multiple contractors to same assignment
- [x] Calculate workload distribution (e.g., 2 contractors = 0.5x time)
- [x] Update time validation to account for multiple contractors
- [x] Display contractor count and adjusted time requirements
- [x] Test with team assignments

## Labour Efficiency Tracking
- [x] Create database schema for phase completion records (phaseCompletions table)
- [x] Create API endpoints for recording phase completions
- [x] Calculate efficiency multiplier per phase type
- [ ] Build UI to record actual completion times (schema ready for future implementation)
- [ ] Display historical efficiency data on assignment cards
- [ ] Use efficiency multiplier to adjust future time estimates
- [ ] Build performance history per contractor

## Contractor Payment Calculation
- [x] Calculate contractor payment as: daily rate × (end date - start date)
- [x] Fetch contractor's daily rate from contractors table
- [x] Calculate working days between assignment start and end dates
- [x] Display contractor payment separately from phase budget
- [x] Show phase budget (CSV labour + material costs) for comparison
- [x] Add budget vs actual indicator (green if within budget, red if over)
- [x] Test with real contractor rates and date ranges

## Custom Login Page
- [x] Create custom login page UI matching Sculpt Projects design
- [x] Add "Sculpt Projects" branding with orange checkmark logo
- [x] Add "GPS Time Tracking & Job Management" subtitle
- [x] Implement username input field
- [x] Implement password input field with show/hide toggle
- [x] Add GPS Status indicator ("Requesting" / "Enabled" / "Disabled")
- [x] Style with dark navy background and dot pattern
- [x] Add orange "Sign In" button
- [x] Implement username/password authentication backend
- [x] Add password hashing (bcrypt) for security
- [x] Create login API endpoint
- [x] Add username/passwordHash fields to contractors table
- [x] Create contractor dashboard page
- [x] Set up test contractor credentials (mohamed/mohamed123, marius/marius123)
- [ ] Debug login form submission issue (BACKEND VERIFIED WORKING - frontend form onSubmit not triggering, needs investigation)
- [ ] Add session management for contractors
- [ ] Implement WebAuthn for biometric authentication
- [ ] Add fingerprint registration flow
- [ ] Add fingerprint login option
- [ ] Test on mobile devices with fingerprint sensors
- [ ] Add "Remember Me" functionality
- [ ] Add password reset flow

## Fix Assignment Creation Bug
- [x] Test assignment creation flow to reproduce the issue (confirmed: assignments save but don't display)
- [x] Check if assignment is being saved to database (confirmed: 3 assignments exist in DB)
- [x] Verify assignment query is fetching created assignments (issue: query not refetching after creation)
- [x] Check if there's a data mismatch or filtering issue (root cause: missing query invalidation)
- [x] Fix the bug preventing assignments from appearing in list (added utils.jobAssignments.list.invalidate())
- [x] Test end-to-end assignment creation and display (working: assignments now appear immediately)

## Critical Bugs - Labour Data & Assignment Loading (Reported by User)
- [x] Bug: Labour costs showing £0.00 when CSV has labour data (RESOLVED: Carpentry phase has NO labour, only materials)
- [x] Investigate jobResources table to verify labour data is stored correctly (confirmed: Carpentry = 3 materials only, other phases have labour)
- [x] Check getAssignmentPhaseCosts function - working correctly
- [x] Check getAssignmentTimeValidation function - working correctly
- [x] Bug: Assignments require page refresh to load (FIXED: added retry logic and caching)
- [x] Investigate query caching or initial load issue on Job Assignments page (root cause: CloudFlare proxy timeouts)
- [x] Add retry logic to Job Assignments queries to handle network timeouts (3 retries, 1s delay, 30s cache)
- [x] Improve loading state handling to gracefully handle failed queries (added error state with retry message)
- [x] Test assignment list loading on first page visit vs. after refresh (working: loads immediately)
- [x] Question: What role do start/end dates play when no labour data is available? (contractor oversight/management of materials)

## Materials Breakdown Enhancement
- [x] Add supplier column to materials list in JobDetail page (displays in blue text)
- [x] Show where to buy materials from (supplier information from CSV)
- [x] Test materials expansion with supplier data (working: shows N/A when no supplier, displays supplier when available)

## Critical Bug - Supplier Column Not Extracted from CSV
- [x] Bug: Supplier column showing "N/A" for all materials (FIXED: CSV parser now extracts Supplier column)
- [x] Investigate csvProcessorNew.ts to check if Supplier column is being read (found: supplier field was missing)
- [x] Check if supplier field is being mapped correctly during CSV parsing (fixed: added supplier extraction)
- [x] Verify supplier data is being stored in jobResources table (confirmed: selco, MGN, Trade Piont, Travis Perkins, online all stored)
- [x] Fix CSV parser to extract Supplier column (added supplier field to ResourceLine interface and extraction logic)
- [x] Test with re-upload of CSV file (tested successfully)
- [x] Verify supplier names display correctly in materials breakdown (verified: selco, MGN, Trade Piont all displaying in blue text)

## Day-Block Labour Costing System
- [ ] Update contractor schema to add trade/role field (Plasterer, Carpenter, Bricklayer, etc.)
- [ ] Add hourly rate field to contractors (from agency rate list)
- [ ] Add payment type field (Agency Day Rate vs Price Work)
- [ ] Create agency rate list constants (Labourer £13-14.5, Plasterer £22, Carpenter £24-28, etc.)
- [ ] Implement day-block calculation: HBXL hours ÷ 8 = days (rounded up)
- [ ] Calculate realistic cost: days × 8 hours × agency hourly rate
- [ ] Update assignment creation to show day-block breakdown
- [ ] Support Price Work contractors (fixed price, no hourly calculation)
- [ ] Update budget display to show realistic labour costs vs HBXL estimates
- [ ] Test with example: 12 HBXL hours → 2 days × 8hrs × £22 = £352

## Day-Block Labour Costing System (In Progress)
- [x] Update contractor schema to add trade, hourly rate, and payment type fields
- [x] Push database schema changes (migration 0010_breezy_triton.sql)
- [x] Create agency rates constants file with all trades and hourly rates (shared/labourCosts.ts)
- [x] Implement day-block calculation logic (hours ÷ 8, round up)
- [x] Create calculateDayBlockCost function
- [x] Update contractor create/update procedures to include new fields
- [x] Update contractor database functions (updateContractorAdminDetails)
- [x] Update ContractorDetail page to show and edit new fields
- [x] Add trade dropdown with agency rates (24 trades: Labourer to Plumber)
- [x] Add payment type selector (Day Rate vs Price Work)
- [x] Add hourly rate input with auto-fill from agency rates
- [x] Update Contractors list page to show payment type and rates
- [x] Create day-block cost calculation function for assignments (server/dayBlockCosts.ts)
- [x] Add getDayBlockCosts API endpoint to jobAssignments router
- [ ] Update JobAssignments page to use day-block costing
- [ ] Show day-block breakdown when creating assignments
- [ ] Display realistic costs vs HBXL estimates
- [ ] Add price work input field for subcontractors
- [ ] Test day-block system end-to-end
- [ ] Save checkpoint

**Implementation Notes:**
- Agency rates include CIS deductions, taxes, and agency fees
- Day-block system: any work under 8 hours = 1 full day, over 8 hours = round up to nearest full day
- Example: 12 HBXL hours → 2 day-blocks → 2 days × 8 hours × £22/hr = £352
- Payment types: "day_rate" (agency contractors) vs "price_work" (subcontractors with fixed milestone prices)

## Mobile App Integration (Contractor GPS Time Tracker)
- [x] Design database schema for GPS tracking and work sessions
- [x] Add workSessions table (27 columns: clock-in/out times, GPS coordinates, geofencing, CIS calculations)
- [x] Add gpsCheckpoints table (periodic location tracking during work)
- [x] Add taskCompletions table (phase progress tracking with photo upload support)
- [x] Push database schema changes (migration 0011_*.sql)
- [x] Create API endpoints for contractor app to fetch active assignments
- [x] Create getActiveAssignments endpoint (returns assigned jobs with phases, tasks, and job details)
- [x] Create API endpoints for clock-in/out with GPS data
- [x] Create clockIn endpoint (stores GPS location, validates 1km geofence, creates work session)
- [x] Create clockOut endpoint (calculates hours worked, gross pay, CIS 20% deduction, net pay)
- [x] Create recordGpsCheckpoint endpoint (periodic location tracking with distance validation)
- [x] Create API endpoints for earnings/payment calculations
- [x] Create getWeeklyEarnings endpoint (total hours, gross pay, CIS deduction, net pay for specific week)
- [x] Create getPaymentHistory endpoint (all completed work sessions with job details)
- [x] Create exportWeeklyPayroll endpoint (CSV export for accounting systems)
- [x] Integrate day-block costing with payment calculations (hourly rate stored in workSessions)
- [x] Create API endpoints for task progress updates
- [x] Create completeTask endpoint (mark tasks complete with optional photos/notes)
- [x] Create getTaskProgress endpoint (view completed tasks with verification status)
- [x] Register mobile API router in main appRouter (accessible at /api/trpc/mobileApi.*)
- [ ] Test complete integration workflow with mobile app
- [ ] Save checkpoint

**Mobile App Features to Support:**
- GPS Time Tracker (clock-in/out with location validation)
- Active Assignment Display (current job, phases, tasks)
- Task Progress Tracking (phase completion with progress bars)
- Earnings Dashboard (daily/hourly rate, CIS deductions, weekly earnings)
- Payroll Export (CSV generation for accounting)

## Test Contractor Account Creation
- [x] Create test contractor "John" with username/password for mobile app testing
- [x] Set username: john
- [x] Set password: john123 (hashed with bcrypt)
- [x] Assign trade and hourly rate for day-block testing (General Builder, £19/hr)
- [x] Provide login credentials to user

## Contractor Web Dashboard (Testing Interface)
- [ ] Create contractor authentication endpoints (login with username/password)
- [ ] Create contractor session management (JWT or cookie-based)
- [ ] Create contractor login page UI (/contractor-login)
- [ ] Create contractor dashboard page (/contractor-dashboard)
- [ ] Display active assignments with job details
- [ ] Add GPS clock-in button with location capture
- [ ] Add GPS clock-out button with payment calculation display
- [ ] Show weekly earnings summary
- [ ] Show task progress with completion buttons
- [ ] Add route protection (require contractor login)
- [ ] Test login with John's credentials (username: john, password: john123)
- [ ] Save checkpoint and deliver login URL

- [x] Simplify contractor login page - replace form with direct button onClick handler

- [x] Create ultra-simple vanilla JavaScript login page (no React complexity) - available at /contractor-login-simple.html

- [x] Fix redirect after successful login - changed to window.location.replace()

- [x] Fix ContractorDashboard to accept localStorage token authentication - updated dashboard, mobileApi.me endpoint, and tRPC client

- [x] Debug persistent redirect issue - removed duplicate useEffect that was causing redirect loop

- [x] Debug why John's assignment isn't showing on contractor dashboard - fixed getMyAssignments to decode JWT token
- [x] Implement GPS geofencing for clock-in (10m radius from job site) - updated from 1000m to 10m

- [x] Fix TypeError in ContractorDashboard - changed assignment.phases to assignment.selectedPhases with optional chaining

- [ ] Review and implement missing contractor dashboard pages
- [x] Create contractor task list page - view assigned tasks and mark complete
- [ ] Create progress report submission page - upload photos and notes
- [x] Add navigation between contractor pages - added "View My Tasks" button to dashboard header

- [x] Fix ContractorTasks authentication redirect - changed to check contractor_id instead of contractor_data

- [x] Add sample tasks to buildPhases for Freddy Jacson job (Internal Decoration: 3 tasks, Plastering: 4 tasks, Carpentry: 3 tasks)

- [ ] Test contractor task completion flow - login, view tasks, mark complete


## Progress Report Feature
- [x] Create progressReports table in database schema with photo URLs and notes
- [x] Implement uploadProgressPhoto API endpoint for S3 photo uploads
- [x] Implement submitProgressReport API endpoint to save reports
- [x] Implement getProgressReports API endpoint to fetch contractor reports
- [x] Create ContractorProgressReport page with photo upload UI
- [x] Add photo preview and multiple photo upload support
- [x] Add form fields for task selection, notes, and date
- [x] Add navigation button from contractor dashboard to progress reports
- [x] Test photo upload to S3 and report submission
- [x] Verify progress reports persist and display correctly

## Admin Progress Report Review Feature
- [x] Implement getAllProgressReports API endpoint with filtering (contractor, job, date, status)
- [x] Implement reviewProgressReport API endpoint to approve/reject with notes
- [x] Create ProgressReports admin page with data table and filters
- [x] Add filter controls for contractor, job, date range, and status
- [x] Add review modal with approve/reject buttons and notes textarea
- [x] Display progress report photos in modal with lightbox
- [x] Add status badges (submitted, reviewed, approved) in table
- [x] Add navigation link to progress reports in admin sidebar
- [x] Test filtering, approval workflow, and status updates

## GPS Clock-In/Clock-Out Feature
- [x] Add latitude and longitude fields to jobs table in database schema
- [x] Add GPS coordinates to Freddy Jacson job for testing
- [x] Create workSessions table with clock-in/clock-out timestamps and GPS coordinates
- [x] Implement calculateDistance helper function (Haversine formula)
- [x] Implement clockIn API endpoint with 10-meter geofencing validation
- [x] Implement clockOut API endpoint with session duration calculation
- [x] Implement getCurrentSession API endpoint to check active sessions
- [x] Add clock-in/clock-out UI to contractor dashboard with GPS permission request
- [x] Display real-time distance from job site location
- [x] Show validation messages (too far, within range, clocked in successfully)
- [x] Display active session timer and clock-out button when clocked in
- [x] Test GPS geofencing with different locations (within 10m, outside 10m)
- [x] Verify work session data persists correctly in database

## Automatic Postcode Geocoding Feature
- [x] Research and choose geocoding API (Google Maps Geocoding API or UK Postcode API)
- [x] Implement geocodePostcode helper function in backend
- [x] Update job assignment endpoint to geocode postcode automatically
- [x] Save latitude/longitude to job record when assigning contractor
- [x] Handle geocoding errors gracefully (invalid postcode, API failure)
- [x] Add loading state to assignment UI during geocoding
- [x] Test assignment workflow with valid UK postcodes
- [x] Verify GPS coordinates are saved correctly for geofencing
- [x] Test clock-in with newly geocoded job coordinates

## GPS Clock-In Bug Fix
- [x] Investigate 'contractor not found' error when John tries to clock in
- [x] Check contractor data in database (contractors table vs users table)
- [x] Verify clockIn API endpoint contractor lookup logic
- [x] Fix contractor ID mapping between users and contractors tables
- [x] Test GPS clock-in with John's credentials and verify success

## Add GPS Coordinates to Freddy Jacson Job
- [ ] Check Freddy Jacson job postcode in database
- [ ] Geocode the postcode using Google Maps API
- [ ] Update job GPS coordinates (latitude, longitude) in database
- [ ] Verify coordinates are set correctly
- [ ] Test clock-in on mobile phone with real GPS location

## Fix Mohamed Login Credentials
- [ ] Query database to find Mohamed's exact username
- [ ] Check if password hash exists and is valid
- [ ] Reset password to default pattern if needed
- [ ] Test login with correct credentials
- [ ] Verify Mohamed can access contractor dashboard

## Add Password Visibility Toggle
- [x] Add eye icon button to password field in contractor login page
- [x] Implement toggle functionality to switch between password/text input type
- [x] Style eye icon to match login page design
- [x] Test show/hide password functionality

## Fix Mohamed Login Issue
- [ ] Query database to find Mohamed's exact username
- [ ] Verify Mohamed's contractor record exists (ID 90001)
- [ ] Generate new bcrypt password hash for "mohamed123"
- [ ] Update Mohamed's password in contractors table
- [ ] Test login with mohamed/mohamed123 credentials
- [ ] Verify successful login and dashboard access

## n8n Telegram Bot Integration
- [x] Add telegramChatId field to contractors table schema
- [x] Create telegram API router (server/telegramRestApi.ts)
- [x] Implement GET /api/telegram/worker-type/:chatId endpoint (returns contractor info)
- [x] Implement GET /api/telegram/hours/:chatId endpoint (returns logged work hours)
- [x] Implement GET /api/telegram/payments/:chatId endpoint (returns payment status for day-rate contractors)
- [x] Implement GET /api/telegram/subcontractor/quotes/:chatId endpoint (returns active quotes)
- [x] Implement GET /api/telegram/subcontractor/milestones/:chatId endpoint (returns milestone progress)
- [x] Implement GET /api/telegram/subcontractor/payment-status/:chatId endpoint (returns payment status for subcontractors)
- [x] Update n8n workflow JSON to point to new Job Tracker endpoints
- [x] Test complete workflow: Telegram message → n8n → Job Tracker API → GPT-4 → Telegram response
- [ ] Add admin UI to set contractor Telegram chat IDs
- [ ] Document API endpoints for n8n integration

## n8n Workflow Bug Fix
- [x] Fix Parse Intent node error: "Cannot read properties of undefined (reading 'worker_type')"
- [x] Update Parse Intent JavaScript code to correctly access Get Worker Type response data
- [ ] Test updated workflow in n8n

## Production n8n Workflow
- [x] Generate n8n workflow with production URL (https://jobtrackr-7pdspyd4.manus.space/)
- [x] Test production API endpoints are accessible
- [x] Deliver production-ready workflow file to user

## Link Contractor Telegram Accounts
- [ ] Update Rudy Diedericks with telegramChatId: 7617462316
- [ ] Update Hamza Aouichaoui with telegramChatId: 8108393007
- [ ] Update Marius Andronache with telegramChatId: 8006717361
- [ ] Update Dalwayne Diedericks with telegramChatId: 8016744652
- [ ] Test bot with each contractor's Telegram account

## Voice Transcription & Progress Reports (Multi-Language)
- [x] Add progressReports table to database schema (contractorId, jobId, reportText, originalLanguage, audioUrl, photoUrls, timestamp)
- [x] Create POST /api/telegram/transcribe-voice endpoint (receives audio file URL, returns transcribed English text)
- [x] Create POST /api/telegram/progress-report endpoint (saves progress report with transcription)
- [x] Add voice transcription fields to progressReports table (audioUrl, originalLanguage, transcribedText, transcriptionDuration)
- [x] Create documentation for voice transcription setup (VOICE_TRANSCRIPTION_SETUP.md)
- [ ] Update n8n workflow to detect voice messages
- [ ] Add voice message handling flow in n8n (download audio → transcribe → save report → confirm to contractor)
- [ ] Add photo upload handling for progress reports
- [ ] Test voice transcription with Afrikaans, Zulu, Portuguese, French
- [ ] Add admin view for progress reports in dashboard
- [ ] Update company name from HBXL to Sculpt Projects in bot responses

## n8n Voice Message Workflow Update
- [x] Create updated n8n workflow with voice message detection
- [x] Add Telegram file download nodes for voice messages
- [x] Add HTTP Request node to call /api/telegram/transcribe-voice
- [x] Add progress report saving node
- [x] Add confirmation message back to contractor
- [x] Update company name to Sculpt Projects in all bot responses
- [ ] Test complete voice → transcription → save → confirm flow

## n8n Workflow Credential Fix
- [x] Fix Telegram bot token access in Get Voice File Info node
- [x] Create /api/telegram/process-voice endpoint that handles bot token server-side
- [x] Update workflow to use simplified process-voice endpoint
- [ ] Add TELEGRAM_BOT_TOKEN to environment variables
- [ ] Test voice file download with corrected authentication

## Progress Reports Dashboard
- [x] Create tRPC procedure to fetch all progress reports with contractor and job details
- [x] Create tRPC procedure to filter reports by contractor, job, date range
- [x] Build Progress Reports page (/progress-reports) with list view
- [x] Add audio playback component for voice recordings
- [x] Add photo gallery for attached images
- [x] Add filters: contractor dropdown, job dropdown, date range picker
- [x] Show original language and transcription side-by-side
- [x] Add voice/text type badge in reports table
- [ ] Add search functionality for report text
- [ ] Add export to CSV functionality
- [ ] Fix empty transcription issue (voice messages returning empty text)

## TELEGRAM_BOT_TOKEN Environment Variable Issue
- [x] Check how TELEGRAM_BOT_TOKEN is accessed in telegramVoiceApi.ts
- [x] Verify environment variable is properly exposed in ENV configuration
- [x] Add TELEGRAM_BOT_TOKEN to server/_core/env.ts (added as telegramBotToken)
- [ ] Test /api/telegram/process-voice endpoint with proper token access
- [ ] Republish and verify voice messages work


## Telegram Bot Voice Progress Reports
- [x] Create contractor registration API endpoint (/api/telegram/register-contractor)
- [ ] Build n8n registration workflow for /register command  
- [x] Update progress report API to link chat ID with registered contractors
- [ ] Add job/assignment selection for progress reports
- [ ] Test complete registration and progress report flow

## Telegram Bot Enhancements - Multi-language & Alerts
- [ ] Add automatic translation for non-English voice messages to English
- [ ] Create query endpoints for contractor data access (jobs, payments, quotes, milestones)
- [ ] Implement proactive alert system for job updates
- [ ] Update n8n workflow to handle translations and queries
- [ ] Test multi-language voice transcription and translation


## Automated Daily Reminders
- [x] Create scheduled task system for daily reminders
- [x] Build logic to check contractors with active assignments but no progress reports today
- [x] Create reminder notification endpoint
- [x] Add configurable reminder time (default: 5 PM)
- [ ] Add admin settings page for reminder configuration
- [x] Test reminder delivery at scheduled time


## Admin Reminder Dashboard & Morning Check-in
- [x] Create reminderLogs table in database schema
- [x] Build admin dashboard page to view reminder history
- [x] Show which contractors received reminders and their response status
- [x] Add morning check-in reminder at 8:15 AM
- [x] Create check-in tracking system (log when contractors log in or submit reports)
- [x] Add reason tracking when contractors don't check in by 8:15 AM
- [x] Create bot command for contractors to report why they can't work today
- [x] Display check-in status and reasons in admin dashboard

## Voice Progress Report Display Bug
- [ ] Fix voice progress reports not displaying in admin Progress Reports dashboard
- [ ] Update Telegram bot confirmation message to include link to view report in app
- [ ] Verify voice reports are being saved correctly to database
- [ ] Test complete voice report workflow from Telegram to admin dashboard


## n8n Morning Check-in Workflow
- [ ] Create n8n workflow JSON for morning check-in reminders
- [ ] Add Schedule Trigger node for 8:15 AM daily
- [ ] Add HTTP Request node to fetch contractors from database
- [ ] Add Telegram Send Message nodes for each contractor
- [ ] Add Telegram Trigger node to listen for responses
- [ ] Add Switch node to detect "working" vs "reason" responses
- [ ] Add HTTP Request nodes to call /api/telegram/checkin-confirm and /api/telegram/checkin-reason
- [ ] Test workflow with real contractor Telegram accounts
- [ ] Document workflow setup and configuration
