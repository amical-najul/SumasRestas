import React, { useState } from 'react';
import { User } from '../types';
import { UserCircle2, Lock, Mail, ArrowRight, UserPlus, LogIn, AlertCircle, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import * as firebaseAuth from '../services/firebaseAuthService';

interface Props {
  onLoginSuccess: (user: User) => void;
  onGuestPlay: () => void;
}

type ScreenMode = 'login' | 'register' | 'emailVerification' | 'passwordReset' | 'passwordResetSent';

const LoginScreen: React.FC<Props> = ({ onLoginSuccess, onGuestPlay }) => {
  const [mode, setMode] = useState<ScreenMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Stricter email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLoading) return;

    if (mode === 'login') {
      if (!email.trim() || !password.trim()) {
        setError('Por favor completa todos los campos');
        return;
      }

      if (!validateEmail(email)) {
        setError('Por favor ingresa un correo electrónico real y válido');
        return;
      }

      setIsLoading(true);
      try {
        const result = await firebaseAuth.loginWithEmail(email, password);

        if (result.success && result.user) {
          // Get ID token for backend
          const idToken = await firebaseAuth.getIdToken();

          // Create User object compatible with app
          const user: User = {
            id: result.user.uid,
            username: result.user.displayName || email.split('@')[0],
            email: result.user.email || email,
            password: '', // Not needed with Firebase
            role: 'USER',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            settings: {},
            unlockedLevel: 0
          };

          onLoginSuccess(user);
        } else if (result.needsVerification) {
          // Show email verification screen
          setVerificationEmail(email);
          setMode('emailVerification');
        } else {
          setError(result.message || 'Error al iniciar sesión');
        }
      } catch (err) {
        setError('Error de conexión');
      } finally {
        setIsLoading(false);
      }
    } else if (mode === 'register') {
      if (!username.trim() || !email.trim() || !password.trim()) {
        setError('Todos los campos son obligatorios');
        return;
      }

      if (!validateEmail(email)) {
        setError('Por favor ingresa un correo electrónico real y válido');
        return;
      }

      setIsLoading(true);
      try {
        const result = await firebaseAuth.registerWithEmail(email, password, username);

        if (result.success) {
          // Show email verification screen
          setVerificationEmail(result.email || email);
          setMode('emailVerification');
        } else {
          setError(result.message || 'Error al registrarse');
        }
      } catch (err) {
        setError('Error de conexión');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    if (!validateEmail(email)) {
      setError('Por favor ingresa un correo electrónico real y válido');
      return;
    }

    setIsLoading(true);
    try {
      const result = await firebaseAuth.sendPasswordResetEmail(email);

      if (result.success) {
        setMode('passwordResetSent');
      } else {
        setError(result.message || 'Error al enviar correo de restablecimiento');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsLoading(true);
    try {
      // In a real app we might need the user object, but specialized handling is needed if user is not logged in.
      // However, after registration or failed login, we might not have the user session active.
      // firebaseAuthService.sendEmailVerification() normally works on CURRENT user.
      // If user is not logged in, we can't send it easily without re-auth.
      // But typically we show this screen right after registration when user IS logged in (before we sign them out? No, we sign them out).
      // Wait, registerWithEmail signs them out. So sendEmailVerification won't work if they are signed out.

      // FIX: The user needs to be signed in to send verification email. 
      // If they are on this screen from Login (unverified), they are briefly signed in then signed out?
      // Actually loginWithEmail signs them out if unverified.
      // So ensuring we can resend requires the user to be signed in.

      setError('Por favor intenta iniciar sesión de nuevo para recibir el correo.');
      setIsLoading(false);
    } catch (error) {
      setError('Error al reenviar correo');
      setIsLoading(false);
    }
  };

  if (mode === 'emailVerification') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1f] p-4 relative overflow-hidden font-outfit">
        {/* Background blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse delay-700" />

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={40} className="text-blue-400" />
          </div>

          <h2 className="text-2xl font-bold text-white">Verifica tu Correo</h2>

          <div className="text-gray-300 space-y-2">
            <p>Hemos enviado un correo de verificación a:</p>
            <p className="font-semibold text-white text-lg">{verificationEmail}</p>
            <p className="text-sm text-gray-400 mt-4">Por favor revisa tu bandeja de entrada (y spam) y haz clic en el enlace para activar tu cuenta.</p>
          </div>

          <div className="space-y-3 pt-4">
            <button
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className="w-full py-3 rounded-xl font-bold bg-white text-[#0a0a1f] hover:bg-gray-100 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <LogIn size={18} /> Volver a Iniciar Sesión
            </button>

            <p className="text-xs text-gray-500 mt-4">
              ¿No recibiste el correo? Intenta iniciar sesión nuevamente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'passwordReset') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1f] p-4 relative overflow-hidden font-outfit">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse delay-700" />

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl animate-fade-in">
          <button
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={18} className="mr-2" /> Volver
          </button>

          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Lock size={24} className="text-blue-400" />
            Recuperar Contraseña
          </h2>
          <p className="text-gray-400 mb-6 text-sm">Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p>

          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
              <input
                type="email"
                placeholder="Correo Electrónico"
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && <p className="text-red-400 text-sm font-medium text-center">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2
                bg-blue-600 hover:bg-blue-500 shadow-blue-500/20
                ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Enviando...' : 'Obtener Enlace de Restablecimiento'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'passwordResetSent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1f] p-4 relative overflow-hidden font-outfit">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse delay-700" />

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-400" />
          </div>

          <h2 className="text-2xl font-bold text-white">¡Correo Enviado!</h2>

          <div className="text-gray-300 space-y-2">
            <p>Hemos enviado un enlace para restablecer tu contraseña a:</p>
            <p className="font-semibold text-white text-lg">{email}</p>
            <p className="text-sm text-gray-400 mt-4">Revisa tu bandeja de entrada y sigue las instrucciones.</p>
          </div>

          <div className="pt-4">
            <button
              onClick={() => {
                setMode('login');
                setError('');
                setPassword('');
              }}
              className="w-full py-3 rounded-xl font-bold bg-white text-[#0a0a1f] hover:bg-gray-100 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <LogIn size={18} /> Iniciar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl flex justify-center items-center relative z-10 min-h-[600px] font-outfit">
      {/* Clean Radial Gradient matching reference image - No Orbs */}

      {/* Main Container */}
      <div className="w-full max-w-md space-y-8 relative z-10 animate-fade-in">

        {/* Logo/Title Section */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 drop-shadow-lg tracking-tight">
            Math Challenge
          </h1>
          <p className="text-gray-400 text-lg font-light tracking-wide">
            Domina las matemáticas jugando
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full shadow-2xl">
          {/* Header title removed as requested */}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="relative group">
                <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Nombre de Jugador"
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            )}

            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
              <input
                type="email"
                placeholder="Correo Electrónico"
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-12 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode('passwordReset')}
                  className="text-sm text-blue-400 hover:text-blue-300 font-medium hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            {error && <p className="text-red-400 text-sm font-medium text-center">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2
                ${mode === 'login' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20'}
                ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Procesando...' : (mode === 'login' ? 'Entrar' : 'Registrarse')} {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="mt-6 text-center space-y-4">
            <p className="text-sm text-gray-400">
              {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError('');
                  setEmail('');
                  setPassword('');
                  setUsername('');
                }}
                className="ml-2 text-blue-400 hover:text-blue-300 font-semibold hover:underline"
              >
                {mode === 'login' ? 'Regístrate' : 'Inicia Sesión'}
              </button>
            </p>

            <div className="flex items-center gap-4 py-2 opacity-70">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-gray-500 text-xs uppercase font-medium">O bien</span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            <button
              onClick={onGuestPlay}
              className="w-full py-3 rounded-xl font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors border border-white/10"
            >
              Continuar como Invitado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
