import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, signInWithGoogle, logout } from "../firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

// Create AuthContext
const AuthContext = createContext();

// AuthProvider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription
  }, []);

  return (
    <AuthContext.Provider value={{ user, signInWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to use AuthContext
export const useAuth = () => useContext(AuthContext);
