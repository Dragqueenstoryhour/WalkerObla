# Post-Deployment Testing Procedures

## Test 1: Frontend 404 Fixes (After Vercel Deployment)

### Invitation URL Test
```bash
# Test the specific failing invitation URL
curl -I "https://www.oblaai.com/invite/hvv41hq3lpoap2cslrrx"
# Expected: HTTP 200 (not 404)

# Browser test: Navigate to https://www.oblaai.com/invite/hvv41hq3lpoap2cslrrx
# Expected: Invitation landing page loads (not Vercel 404 error)
```

### Assignment URL Test
```bash
# Test the specific failing assignment URL
curl -I "https://www.oblaai.com/assignments/11"
# Expected: HTTP 200 (not 404)

# Browser test: Navigate to https://www.oblaai.com/assignments/11
# Expected: Assignment page loads (not Vercel 404 error)
```

## Test 2: Assignment Access Control (After Render Deployment)

### Test Existing Assignments with clientEmail: null
```bash
# Verify assignment 11 can be accessed by assigned user
# Backend debug confirms: userId="468a6ca1-f152-46ea-88f9-f3f0c0df583f", clientEmail=null
# Expected: Assignment should be accessible to the assigned user (no 403 errors)

# Test assignment 37 access
# Backend debug confirms: userId="f08b5ca9-7180-43ac-ad07-b221ca83df46", clientEmail=null
# Expected: Assignment should be accessible to the assigned user
```

## Test 3: Assignment Email Sending

### Create Test Assignment
1. Log into therapist account
2. Create a new assignment for an existing user
3. Monitor Render logs for email sending debug output

### Expected Log Entries
```
📧 ASSIGNMENT EMAIL DEBUG: Attempting to send email to: [email]
📧 ASSIGNMENT EMAIL DEBUG: Assignment ID: [id]
📧 ASSIGNMENT EMAIL DEBUG: Base URL: https://www.oblaai.com
📧 ASSIGNMENT EMAIL DEBUG: Assignment title: [title]
📧 ASSIGNMENT EMAIL DEBUG: Therapist name: [name]
📧 ASSIGNMENT EMAIL DEBUG: Client name: [name]
📤 LOOPS PAYLOAD DEBUG: Assignment notification payload: [payload]
🎯 sendAssignmentNotification called with data: [data]
✅ Email sent successfully via Loops
```

### Verify Email Delivery
- Check Loops dashboard for delivery confirmation
- Verify email received in client's inbox
- Confirm assignment link in email works correctly

## Test 4: Debug Endpoints Verification

### Confirm All Debug Endpoints Still Work
```bash
# Test invitation token lookup
curl "https://speechgame.onrender.com/api/assignments/debug/token/hvv41hq3lpoap2cslrrx"

# Test assignment lookup
curl "https://speechgame.onrender.com/api/assignments/debug/assignment/11"

# Test recent data endpoints
curl "https://speechgame.onrender.com/api/assignments/debug/recent/invitations"
curl "https://speechgame.onrender.com/api/assignments/debug/recent/assignments"
```

## Success Criteria

### All Three Core Issues Resolved
1. ✅ Invitation URLs load properly (no more 404s)
2. ✅ Assignment URLs load properly (no more 404s)
3. ✅ Assignment emails send successfully with logging confirmation

### Comprehensive Verification
- Frontend routing works for both invitation and assignment URLs
- Assignment access control handles existing assignments with clientEmail: null
- Assignment email sending works with comprehensive logging and delivery confirmation
- All debug endpoints remain operational for future troubleshooting

## Rollback Plan
If any tests fail after deployment:
1. Check Render logs for specific error messages
2. Use debug endpoints to verify data integrity
3. Test individual components (frontend routing, backend access control, email sending)
4. Revert to previous working version if critical issues arise
