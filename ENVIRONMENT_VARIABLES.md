# Required Environment Variables for Render Backend

The following environment variables need to be configured on the Render backend for the email system to work correctly:

## Core Application
- `CLIENT_BASE_URL=https://www.oblaai.com`

## Loops Email Service
- `LOOPS_API_KEY=<your_loops_api_key>`
- `LOOPS_CLIENT_INVITATION_TEMPLATE_ID=cmdp2u4m601rq430jt58dl81o`
- `LOOPS_ASSIGNMENT_TEMPLATE_ID=cmdp2sl6n09qq2i0i3u5stj4q`
- `LOOPS_PASSWORD_SETUP_TEMPLATE_ID=cmdp3ucdt08460h0ieaiqez0l`

## Supabase (if not already configured)
- `REACT_APP_SUPABASE_URL=<your_supabase_url>`
- `SUPABASE_SERVICE_ROLE_KEY=<your_supabase_service_role_key>`

## Changes Made

### 1. Removed Duplicate Email Source
- Deleted the test endpoint in `/server/routes/assignmentRoutes.ts` that was sending "Dr. Test Smith" dummy emails

### 2. Fixed Invitation URL Domain
- Updated all CLIENT_BASE_URL fallbacks from `http://localhost:3001` to `https://www.oblaai.com`
- This ensures invitation links use the correct production domain instead of localhost

### 3. Updated Loops Template IDs
- Client invitation: `cmdp2u4m601rq430jt58dl81o`
- Assignment notification: `cmdp2sl6n09qq2i0i3u5stj4q` 
- Password reset: `cmdp3ucdt08460h0ieaiqez0l`

## Email Flow Verification

Once environment variables are configured, verify:

1. **Therapist signup** - Should send only one welcome email (🎯 Welcome to Walker Lowendick's Speech Therapy Program!)
2. **Client invitation** - Links should go to `https://www.oblaai.com/invite/{token}` and work without 404 errors
3. **Assignment creation** - Should send assignment notification emails successfully

## Loops Dashboard

Check the Loops dashboard to confirm:
- Template IDs match the ones configured above
- API key has proper permissions
- Email delivery rates improve after configuration
