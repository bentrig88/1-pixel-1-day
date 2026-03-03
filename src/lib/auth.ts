import { signInWithPopup, signOut as fbSignOut } from 'firebase/auth'
import { auth, provider } from './firebase'

export const signInWithGoogle = () => signInWithPopup(auth, provider)
export const signOut          = () => fbSignOut(auth)
