# How to Enable Google OAuth in Supabase

To fix the "Unsupported provider: provider is not enabled" error, you need to enable Google OAuth in your Supabase project settings. Here's how:

## 1. Go to Supabase Dashboard
Visit [https://app.supabase.com/project/_/auth/providers](https://app.supabase.com/project/_/auth/providers) and select your project.

## 2. Enable Google Provider
1. In the Authentication section, click on "Providers"
2. Find Google in the list of providers
3. Toggle the switch to enable it
4. You'll need to provide OAuth credentials from Google:
   - Client ID
   - Client Secret

## 3. Create Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or use an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Set the Application Type to "Web application"
6. Add the following Authorized redirect URIs:
   - `https://hehogfyncmkakwxrgocj.supabase.co/auth/v1/callback`
7. Click "Create" to get your Client ID and Client Secret

## 4. Add Credentials to Supabase
1. Copy the Client ID and Client Secret from Google Cloud Console
2. Paste them into the corresponding fields in Supabase Auth Providers settings
3. Save your changes

## 5. Test Your Integration
After enabling Google OAuth and adding your credentials, try signing in with Google again. 

## Additional Information
- The app has been updated to only offer Google sign-in as the authentication option
- Email/password authentication has been removed to avoid confusion with email confirmation
- When users click "Continue with Google," they'll be redirected to Google's sign-in page
- After successful authentication, they'll be redirected back to the application

If you need more detailed instructions or encounter any issues, please refer to the [Supabase Auth documentation](https://supabase.com/docs/guides/auth/social-login/auth-google).