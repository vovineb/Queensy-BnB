import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAQAWi49X_FQBhuLBPomINQM3VkZYKp9Ho",
  authDomain: "diani-bnb.firebaseapp.com",
  projectId: "diani-bnb",
  storageBucket: "diani-bnb.firebasestorage.app",
  messagingSenderId: "854375742167",
  appId: "1:854375742167:web:71d13ef4d160ce7160ce92"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
