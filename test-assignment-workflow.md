# Assignment Workflow Testing Guide

## Prerequisites
- Supabase environment variables configured (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- Both server and client running locally
- Test therapist and patient accounts created

## Test Scenarios

### 1. URL Parameter Handling (✅ VERIFIED)
**Status: WORKING** - Confirmed through browser console testing
```
URL: http://localhost:3000/my-words?tab=assignments&assignment=123
Expected: Parses tab="assignments" and assignment="123"
Actual: ✅ Correctly parsed both parameters
```

### 2. Deep Link Navigation (⚠️ NEEDS AUTH)
**Test Steps:**
1. Navigate to: `http://localhost:3000/my-words?tab=assignments&assignment=123`
2. Verify page loads on "My Assignments" tab
3. Verify assignment with ID 123 is auto-selected
4. Verify assignment details load correctly

### 3. Complete Assignment Workflow (⚠️ NEEDS AUTH)
**Test Steps:**
1. **Therapist Portal:**
   - Login as therapist
   - Navigate to `/therapist-portal`
   - Create new assignment for patient
   - Verify email notification sent

2. **Patient Email:**
   - Check patient email for assignment notification
   - Verify email contains deep link: `/my-words?tab=assignments&assignment={ID}`
   - Click email link

3. **Patient Portal:**
   - Verify lands on "My Assignments" tab
   - Verify specific assignment is auto-selected
   - Click assignment to start practice
   - Complete word carousel practice
   - Verify summary card with scoring appears

4. **Real-time Updates:**
   - Check therapist portal shows patient progress
   - Verify completion status updates in real-time

### 4. First-time User Scenario (⚠️ NEEDS AUTH)
**Test Steps:**
1. Create assignment for new patient email
2. Patient receives invitation email
3. Patient clicks invitation link
4. Patient completes signup process
5. Verify redirects to assignments tab (if hasAssignments=true)
6. Verify assignment is available immediately after signup

## Implementation Status

### ✅ Completed Features
- URL parameter parsing in MyWordsNew component
- Auto-selection of assignments from URL parameters
- Enhanced AcceptInvitation redirect logic
- Invitation API returns assignment availability
- Comprehensive PR documentation

### ⚠️ Blocked by Environment
- Full authentication-based testing
- End-to-end assignment workflow verification
- Real-time update validation
- Email generation testing

### 🔍 Areas Needing Verification
- Real-time WebSocket updates for assignment progress
- Email template includes correct deep link format
- Assignment carousel matches /words page functionality
- Summary card generation and scoring system
- Database assignment capture before user signup

## Environment Setup Required
```bash
# Add to .env file:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing Commands
```bash
# Start servers
cd server && npm run dev
cd client && npm run dev

# Run any existing tests
npm test

# Check for lint issues
npm run lint
```
