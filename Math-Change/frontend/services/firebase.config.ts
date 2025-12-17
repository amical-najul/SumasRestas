// Firebase configuration and initialization
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCiH8tiBtWSZi675gmIISI5CiWR-L4IWSE",
    authDomain: "fast-ingles.firebaseapp.com",
    projectId: "fast-ingles",
    storageBucket: "fast-ingles.firebasestorage.app",
    messagingSenderId: "859457407518",
    appId: "1:859457407518:web:594dd484ac18a0f1e9bc0f"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth: Auth = getAuth(app);

export default app;
