import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Normalisasi konfigurasi Firebase agar authDomain selalu valid dan tidak diawali '://'
const rawConfig: any = firebaseConfig;
const projectId = rawConfig?.projectId || 'si-spt-96799';
let authDomain = rawConfig?.authDomain || '';
if (!authDomain || authDomain.startsWith('://') || authDomain === '://firebaseapp.com') {
  authDomain = `${projectId}.firebaseapp.com`;
}
let storageBucket = rawConfig?.storageBucket || '';
if (!storageBucket || storageBucket.startsWith('://') || storageBucket === '://appspot.com') {
  storageBucket = `${projectId}.appspot.com`;
}

const safeConfig = {
  ...rawConfig,
  projectId,
  authDomain,
  storageBucket,
};

// Inisialisasi Firebase App
const app = initializeApp(safeConfig);
export const auth = getAuth(app);

// Provider Google dengan scope Google Sheets
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.setCustomParameters({
  prompt: 'select_account',
});

// Cache token di memory (tidak disimpan di localStorage/sessionStorage sesuai standar keamanan)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan access token Google Sheets dari autentikasi');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};
