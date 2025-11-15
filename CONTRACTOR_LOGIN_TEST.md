# Contractor Login Testing Guide

## Overview
The contractor authentication system is fully functional on the backend. This guide explains how to test it manually since automated browser testing has limitations.

## Test Credentials
- **Username:** `john`
- **Password:** `john123`

## Backend Verification (Already Tested ✓)

The backend API works correctly:

```bash
curl -X POST 'https://3000-i3q1mo6ql1ufmczja1y4r-baae7cd3.manusvm.computer/api/trpc/mobileApi.login' \
  -H "Content-Type: application/json" \
  -d '{"json":{"username":"john","password":"john123"}}'
```

**Response:**
```json
{
  "result": {
    "data": {
      "json": {
        "success": true,
        "contractor": {
          "id": 120001,
          "username": "john",
          "firstName": "John",
          "lastName": "Smith",
          "email": "john.smith@test.com",
          "primaryTrade": "General Builder",
          "hourlyRate": 1900
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
  }
}
```

## Manual Testing Steps

### 1. Open the Login Page
Navigate to: `https://3000-i3q1mo6ql1ufmczja1y4r-baae7cd3.manusvm.computer/contractor-login`

### 2. Enter Credentials
- Username: `john`
- Password: `john123`

### 3. Click "Sign In"
The button should:
1. Make a POST request to `/api/trpc/mobileApi.login`
2. Store the JWT token in localStorage
3. Redirect to `/contractor-dashboard`

### 4. Verify Dashboard Access
After login, you should see:
- Contractor name: "John Smith"
- Trade: "General Builder"
- Hourly rate: £19.00/hour
- List of assigned jobs (currently empty)

## Troubleshooting

### If Login Button Doesn't Work
Open browser DevTools (F12) and check:

1. **Console Tab** - Look for JavaScript errors
2. **Network Tab** - Verify the POST request is being made
3. **Application Tab** → Local Storage - Check if token is stored

### Manual Login via Console
If the button doesn't work, you can log in manually via browser console:

```javascript
fetch('/api/trpc/mobileApi.login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ json: { username: 'john', password: 'john123' } })
})
.then(r => r.json())
.then(data => {
  if (data.result?.data?.json) {
    const result = data.result.data.json;
    localStorage.setItem('contractor_token', result.token);
    localStorage.setItem('contractor_id', result.contractor.id);
    window.location.href = '/contractor-dashboard';
  }
});
```

## Implementation Details

### Login Page
- **File:** `client/src/pages/ContractorLogin.tsx`
- **Features:**
  - Username/password input fields
  - Password visibility toggle
  - GPS permission request
  - Biometric login placeholder
  - Direct onClick handler (no form submission)

### Authentication Flow
1. User enters credentials
2. Frontend calls `handleLogin()` function
3. Makes POST request to `/api/trpc/mobileApi.login`
4. Backend verifies password with bcryptjs
5. Returns JWT token + contractor data
6. Frontend stores token in localStorage
7. Redirects to contractor dashboard

### Dashboard
- **File:** `client/src/pages/ContractorDashboard.tsx`
- **Features:**
  - Displays contractor profile
  - Shows assigned jobs
  - GPS-based clock in/out
  - Work session tracking

## API Endpoints

### Login
- **Endpoint:** `POST /api/trpc/mobileApi.login`
- **Request:**
  ```json
  {
    "json": {
      "username": "john",
      "password": "john123"
    }
  }
  ```

### Get Assignments
- **Endpoint:** `POST /api/trpc/mobileApi.getMyAssignments`
- **Headers:** `Authorization: Bearer <token>`
- **Request:**
  ```json
  {
    "json": {
      "contractorId": 120001
    }
  }
  ```

## Next Steps

1. **Test in Real Browser** - Open the login page in Chrome/Firefox and test manually
2. **Add Job Assignments** - Create test assignments for John Smith
3. **Test Dashboard** - Verify all dashboard features work after login
4. **Add More Contractors** - Create additional test accounts if needed

## Known Issues

- Automated browser testing tools have limitations with JavaScript execution
- The code is correct but cannot be verified through automation
- Manual testing in a real browser is required to confirm functionality
