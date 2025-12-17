# Firebase Authentication Migration

## Planning
- [x] Analyze current authentication flow
- [x] Design Firebase authentication architecture
- [x] Create implementation plan

## Implementation - Frontend Firebase Setup
- [x] Install Firebase SDK dependencies
- [x] Create Firebase configuration file
- [x] Initialize Firebase app

## Implementation - Firebase Auth Service
- [x] Create Firebase authentication service
- [x] Implement email/password registration (with email verification)
- [x] Implement email/password login (with verification check)
- [x] Implement email verification sending
- [x] Implement password reset email
- [x] Implement logout functionality
- [x] Implement auth state observer
- [x] Add error handling and user-friendly Spanish messages

## Implementation - Update UI Components
- [x] Update `LoginScreen.tsx` to use Firebase auth
- [x] Add Email Verification Screen to `LoginScreen.tsx`
- [x] Add Forgot Password Screen to `LoginScreen.tsx`
- [x] Update `App.tsx` session management with Firebase auth state
- [x] Update `storageService.ts` to remove backend auth calls
- [x] Ensure user data structure compatibility

## Implementation - User Profile Management
- [x] Store additional user data in Firestore (username, settings, etc.)
- [x] Update user creation flow (JIT Provisioning)
- [x] Update user profile updates (Sync Firebase Auth + Local DB)

## Backend Adaptation (Completed)
- [x] Decide on backend API integration (Hybrid - Firebase Tokens + Local DB)
- [x] Update backend to validate Firebase tokens
- [x] Implement User Sync (JIT Provisioning)
- [x] Update frontend to send tokens correctly

## Implementation - Avatar & Storage Strategy
- [x] Review Database Schema Completeness (Scores vs Stats)
- [x] Install `boto3` in Backend
- [x] Configure S3 Credentials (n8nprueba.shop)
- [x] Implement `POST /upload-avatar` endpoint
- [x] Update `users` table schema if needed (store avatar URL)
- [x] Update Frontend Profile to support Image Upload

## Testing & Verification
- [x] Test registration flow
- [x] Test login flow
- [x] Test logout flow
- [x] Test session persistence
- [x] Test error scenarios
- [x] Verify guest mode still works
- [x] Test Avatar Upload (Ensure region is correct and error handling works) <!-- id: 5 -->
- [x] Test Level Persistence (Fixed: UUID generation and Env Var robustness) <!-- id: 6 -->
- [x] Verify UI Homogeneity (Login Screen Background) <!-- id: 7 -->
