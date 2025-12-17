import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendEmailVerification as firebaseSendEmailVerification,
    sendPasswordResetEmail as firebaseSendPasswordResetEmail,
    onAuthStateChanged,
    updateEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    User as FirebaseUser,
    UserCredential
} from "firebase/auth";
import { auth } from "./firebase.config";

/**
 * Register a new user with email and password
 * Does NOT automatically sign in the user after registration
 * Sends email verification automatically
 */
export const registerWithEmail = async (
    email: string,
    password: string,
    username: string
): Promise<{ success: boolean; message?: string; email?: string }> => {
    try {
        // Create the user account
        const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Try to send email verification, but don't fail registration if it fails
        try {
            await firebaseSendEmailVerification(userCredential.user);
        } catch (emailError: any) {
            console.error("Error sending verification email:", emailError);
            // Sign out
            await signOut(auth);
            return {
                success: true, // Still success because user was created
                email: email,
                message: 'Registro exitoso, pero hubo un error enviando el correo. Intenta "Reenviar" al iniciar sesión.'
            };
        }

        // Sign out the user (don't auto-login until email is verified)
        await signOut(auth);

        // TODO: Store username in backend database or Firestore (for now we'll handle this in the sync service)

        return {
            success: true,
            email: email,
            message: 'Registro exitoso. Por favor verifica tu correo electrónico.'
        };
    } catch (error: any) {
        return {
            success: false,
            message: mapFirebaseErrorToSpanish(error.code)
        };
    }
};

/**
 * Login user with email and password
 * Checks if email is verified before allowing access
 */
export const loginWithEmail = async (
    email: string,
    password: string
): Promise<{ success: boolean; user?: FirebaseUser; message?: string; needsVerification?: boolean }> => {
    try {
        const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);

        // Check if email is verified
        if (!userCredential.user.emailVerified) {
            // Sign out the user
            await signOut(auth);

            return {
                success: false,
                needsVerification: true,
                message: 'Por favor verifica tu correo electrónico antes de iniciar sesión.'
            };
        }

        return {
            success: true,
            user: userCredential.user
        };
    } catch (error: any) {
        return {
            success: false,
            message: mapFirebaseErrorToSpanish(error.code)
        };
    }
};

/**
 * Send email verification to current user
 */
export const sendEmailVerification = async (): Promise<{ success: boolean; message?: string }> => {
    try {
        const user = auth.currentUser;
        if (!user) {
            return { success: false, message: 'No hay usuario autenticado' };
        }

        await firebaseSendEmailVerification(user);
        return { success: true, message: 'Correo de verificación enviado' };
    } catch (error: any) {
        return {
            success: false,
            message: mapFirebaseErrorToSpanish(error.code)
        };
    }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email: string): Promise<{ success: boolean; message?: string }> => {
    try {
        await firebaseSendPasswordResetEmail(auth, email);
        return {
            success: true,
            message: 'Correo de restablecimiento de contraseña enviado'
        };
    } catch (error: any) {
        return {
            success: false,
            message: mapFirebaseErrorToSpanish(error.code)
        };
    }
};

/**
 * Logout current user
 */
/**
 * Logout current user
 */
export const logout = async (): Promise<void> => {
    await signOut(auth);
};

/**
 * Update User Email
 * Requires recent login.
 */
export const updateUserEmail = async (newEmail: string): Promise<{ success: boolean; message?: string }> => {
    const user = auth.currentUser;
    if (!user) return { success: false, message: 'No hay usuario autenticado' };

    try {
        await updateEmail(user, newEmail);
        return { success: true };
    } catch (error: any) {
        return { success: false, message: mapFirebaseErrorToSpanish(error.code) };
    }
};

/**
 * Update User Password
 * Requires recent login.
 */
export const updateUserPassword = async (newPassword: string): Promise<{ success: boolean; message?: string }> => {
    const user = auth.currentUser;
    if (!user) return { success: false, message: 'No hay usuario autenticado' };

    try {
        await updatePassword(user, newPassword);
        return { success: true };
    } catch (error: any) {
        return { success: false, message: mapFirebaseErrorToSpanish(error.code) };
    }
};

/**
 * Re-authenticate user (required for sensitive updates like email/password)
 */
export const reauthenticateUser = async (password: string): Promise<{ success: boolean; message?: string }> => {
    const user = auth.currentUser;
    if (!user || !user.email) return { success: false, message: 'No hay usuario autenticado' };

    try {
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
        return { success: true };
    } catch (error: any) {
        return { success: false, message: mapFirebaseErrorToSpanish(error.code) };
    }
};


/**
 * Get current Firebase user
 */
export const getCurrentUser = (): FirebaseUser | null => {
    return auth.currentUser;
};

/**
 * Check if current user's email is verified
 */
export const isEmailVerified = (): boolean => {
    return auth.currentUser?.emailVerified || false;
};

/**
 * Get Firebase ID token for backend API calls
 */
export const getIdToken = async (): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        return await user.getIdToken();
    } catch (error) {
        console.error('Error getting ID token:', error);
        return null;
    }
};

/**
 * Listen to authentication state changes
 */
export const onAuthStateChange = (callback: (user: FirebaseUser | null) => void) => {
    return onAuthStateChanged(auth, callback);
};

/**
 * Map Firebase error codes to user-friendly Spanish messages
 */
const mapFirebaseErrorToSpanish = (errorCode: string): string => {
    const errorMessages: Record<string, string> = {
        'auth/email-already-in-use': 'Este correo electrónico ya está registrado',
        'auth/invalid-email': 'Correo electrónico inválido',
        'auth/operation-not-allowed': 'Operación no permitida',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/invalid-credential': 'Credenciales inválidas',
        'auth/too-many-requests': 'Demasiados intentos. Por favor intenta más tarde',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
        'auth/requires-recent-login': 'Por favor vuelve a iniciar sesión',
        'auth/missing-email': 'Por favor ingresa tu correo electrónico',
    };

    return errorMessages[errorCode] || 'Error de autenticación. Por favor intenta de nuevo.';
};
