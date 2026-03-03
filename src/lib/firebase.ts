import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// ── Paste your Firebase config here ──────────────────────────────────────────
// Get it from: Firebase console → Project settings → Your apps → SDK setup
const firebaseConfig = {
  apiKey:            'AIzaSyAfnnDyvMrYrmlGmUZgo3KXer5q0i3gcpc',
  authDomain:        'pixel-1-day.firebaseapp.com',
  projectId:         'pixel-1-day',
  storageBucket:     'pixel-1-day.firebasestorage.app',
  messagingSenderId: '227170072863',
  appId:             '1:227170072863:web:6876ab69bd8c26069c982a',
}
// ─────────────────────────────────────────────────────────────────────────────

export const app      = initializeApp(firebaseConfig)
export const auth     = getAuth(app)
export const provider = new GoogleAuthProvider()
export const db       = getFirestore(app)
