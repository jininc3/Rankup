# Firebase Setup Guide for RankUp

Complete guide to configure Firebase Authentication and Firestore for your RankUp app.

## 📋 Prerequisites

- Firebase project created at https://console.firebase.google.com/
- Google account
- RankUp app installed locally

## 🔥 Step-by-Step Setup

### Step 1: Get Firebase Configuration

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project** (or create one if you haven't)
3. **Click the Gear icon ⚙️** (Project Settings)
4. **Scroll down** to "Your apps" section
5. **Click the Web icon** `</>` to add a web app
6. **Register your app**:
   - App nickname: "RankUp Web"
   - Don't check "Firebase Hosting"
   - Click "Register app"
7. **Copy the configuration** - You'll see something like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### Step 2: Configure Environment Variables

1. **Create `.env` file** from the example:
   ```bash
   cp .env.example .env
   ```

2. **Add your Firebase config** to `.env`:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
   ```

### Step 3: Enable Email/Password Authentication

1. **In Firebase Console**, go to **Authentication**
2. Click **"Get started"** if you haven't set it up
3. Go to **"Sign-in method"** tab
4. Click on **"Email/Password"**
5. **Enable** the first toggle (Email/Password)
6. Click **"Save"**

### Step 4: Enable Google Sign-In

1. **Still in "Sign-in method"** tab
2. Click on **"Google"**
3. **Enable** the toggle
4. **Select a support email** from dropdown
5. Click **"Save"**
6. **Copy the Web Client ID** that appears
7. **Add it to your `.env` file**:
   ```
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-xxxxxxxxxxxxxxxxx.apps.googleusercontent.com
   ```

### Step 5: Set Up Firestore Database

1. **In Firebase Console**, go to **Firestore Database**
2. Click **"Create database"**
3. **Select a location** (choose closest to your users):
   - For US: `us-central1`
   - For Europe: `europe-west1`
   - For Asia: `asia-southeast1`
4. **Start in test mode** (we'll add security rules later)
5. Click **"Enable"**

### Step 6: Configure Firestore Security Rules

1. **In Firestore**, go to **"Rules"** tab
2. **Replace the rules** with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can only read/write their own data
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Add more collections as needed
    // Example: Posts collection
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
                               request.auth.uid == resource.data.userId;
    }
  }
}
```

3. Click **"Publish"**

### Step 7: Configure for Native Apps (iOS & Android)

#### For iOS:

1. **In Firebase Console**, click **iOS icon** to add iOS app
2. **Enter your iOS Bundle ID**: `com.jininc3.RankUp`
3. **Download `GoogleService-Info.plist`**
4. **Add to your project**:
   - Create `ios` folder if it doesn't exist
   - Place `GoogleService-Info.plist` in the root of your project
5. **Update `app.json`**:
   ```json
   {
     "expo": {
       "ios": {
         "googleServicesFile": "./GoogleService-Info.plist",
         "bundleIdentifier": "com.jininc3.RankUp"
       }
     }
   }
   ```

#### For Android:

1. **In Firebase Console**, click **Android icon** to add Android app
2. **Enter your Android package name**: `com.jininc3.RankUp`
3. **Download `google-services.json`**
4. **Add to your project**:
   - Create `android` folder if it doesn't exist
   - Place `google-services.json` in the root of your project
5. **Update `app.json`**:
   ```json
   {
     "expo": {
       "android": {
         "googleServicesFile": "./google-services.json",
         "package": "com.jininc3.RankUp"
       }
     }
   }
   ```

### Step 8: Test Your Setup

1. **Start your app**:
   ```bash
   npm start
   ```

2. **Try signing up** with email/password:
   - Open the app
   - Go to Sign Up
   - Enter username, email, and password
   - Click "Sign Up"

3. **Check Firebase Console**:
   - Go to **Authentication** → **Users**
   - You should see your new user!
   - Go to **Firestore Database**
   - You should see a `users` collection with your user data

4. **Try Google Sign-In**:
   - Go to Login page
   - Click "Continue with Google"
   - Select your Google account
   - Verify you're signed in

## 🎯 Verification Checklist

- [ ] Firebase project created
- [ ] `.env` file configured with all Firebase credentials
- [ ] Email/Password authentication enabled in Firebase
- [ ] Google Sign-In enabled in Firebase
- [ ] Firestore database created
- [ ] Security rules published
- [ ] Can sign up with email/password
- [ ] Can sign in with email/password
- [ ] Can sign in with Google
- [ ] User data appears in Firestore
- [ ] Can sign out successfully

## 🗂️ Understanding the File Structure

```
RankUp/
├── config/
│   └── firebase.ts              # Firebase initialization
├── services/
│   └── authService.ts           # Authentication functions
├── contexts/
│   └── AuthContext.tsx          # Auth state management
├── app/
│   └── (auth)/
│       ├── login.tsx            # Login page (Firebase integrated)
│       └── signup.tsx           # Signup page (Firebase integrated)
└── .env                         # Your Firebase credentials (DON'T COMMIT!)
```

## 🔐 How Authentication Works

1. **User signs up/in** → Calls Firebase Auth
2. **Firebase returns user** → Stored in AuthContext
3. **User data saved** → Firestore `users` collection
4. **Auth state changes** → `onAuthStateChanged` listener updates app
5. **Protected routes** → Automatically redirect based on auth state

## 📊 Data Structure in Firestore

### Users Collection (`/users/{userId}`)

```typescript
{
  id: string;              // Firebase UID
  email: string;           // User's email
  username: string;        // Display name
  avatar?: string;         // Profile picture URL (optional)
  provider: 'email' | 'google';  // Auth method
  createdAt: Timestamp;    // Account creation date
  updatedAt: Timestamp;    // Last update
}
```

You can expand this with additional fields like:
- `bio`: string
- `gameStats`: object
- `followers`: array
- `following`: array
- etc.

## 🚀 Next Steps

### 1. Add More Collections

Create collections for your app features:

```javascript
// In Firestore, create these collections:
- posts          // User posts/clips
- leaderboards   // Game rankings
- matches        // Game match history
- notifications  // User notifications
- friends        // Friend connections
```

### 2. Implement Cloud Functions (Optional)

For advanced features like:
- Sending welcome emails
- Creating thumbnails for images
- Real-time leaderboard updates
- Push notifications

```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

### 3. Add More Auth Providers

You can add Discord, Twitter, etc. by:
1. Creating custom auth providers in `services/authService.ts`
2. Following similar patterns to Google Sign-In
3. Storing provider-specific data in Firestore

### 4. Implement Profile Updates

Allow users to update their profiles:

```typescript
// Add to authService.ts
export async function updateUserProfile(userId: string, data: Partial<UserProfile>) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    ...data,
    updatedAt: new Date(),
  });
}
```

## 🐛 Troubleshooting

### "Firebase not initialized" error
- Check that `.env` file exists and has correct values
- Restart your development server after adding `.env`
- Clear cache: `npm start -- --clear`

### Google Sign-In not working
- Verify `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is correct
- Check that Google Sign-In is enabled in Firebase Console
- Make sure you're testing on a real device (not simulator)

### "Permission denied" in Firestore
- Check your Firestore security rules
- Verify user is authenticated before writing
- Make sure userId matches in security rules

### User not appearing in Firestore
- Check console for errors
- Verify Firestore is initialized in `config/firebase.ts`
- Look at Network tab in browser/debugger

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Auth for React Native](https://rnfirebase.io/auth/usage)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Expo + Firebase Guide](https://docs.expo.dev/guides/using-firebase/)

## 🔒 Security Best Practices

1. **Never commit `.env`** - Already in `.gitignore`
2. **Use environment-specific configs** - Dev, Staging, Production
3. **Implement proper security rules** - Don't leave in test mode
4. **Validate user input** - Both client and server-side
5. **Monitor authentication** - Set up alerts in Firebase Console
6. **Implement rate limiting** - Prevent abuse
7. **Use Cloud Functions** - For sensitive operations

---

Need help? Check the Firebase Console for detailed logs and errors!
