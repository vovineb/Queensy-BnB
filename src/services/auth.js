// src/services/auth.js
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
export const auth = getAuth();

export const loginAdmin = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutAdmin = () => {
  return signOut(auth);
};
