import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyDxCuIT3u4t4t3LZWnXzQz2D0-xHiyX8wc",
    authDomain: "audioscape-49565.firebaseapp.com",
    projectId: "audioscape-49565",
    storageBucket: "audioscape-49565.firebasestorage.app",
    messagingSenderId: "143126527004",
    appId: "1:143126527004:web:0f25b52242c8f2eed1b3d9"
};

const app= initializeApp(firebaseConfig);
const auth= getAuth(app);
const googleProvider= new GoogleAuthProvider();

const signInWithGoogle = async() => {
    try{
        await signInWithPopup(auth, googleProvider);
    }
    catch(error){
        console.error(error);
    }
}

const logout = async() => {
    try{
        await signOut(auth);
    }
    catch(error){
        console.error(error);
    }
}

export { auth, signInWithGoogle, logout };