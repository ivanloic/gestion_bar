// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getFirestore, doc, setDoc ,getDoc , addDoc , collection , arrayUnion, updateDoc ,deleteDoc , query , where} from 'firebase/firestore';
import { createUserDocument } from '../Firebase/Services';
import { auth ,db } from '../Firebase/Config';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // S'inscrire avec email/password
const register = async ({ phone, username, password }) => {
  try {
    // Création de l'utilisateur Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, `${phone}@gestionbar.com`, password);
    
    // Création du document utilisateur dans Firestore
    const db = getFirestore();
    const userRef = doc(db, 'users', userCredential.user.uid);
    
    await setDoc(userRef, {
      phone,
      username,
      createdAt: new Date(),
      role: 'manager', // ou 'admin' selon votre logique
      bars: [] // initialement vide
    });
    
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

  // Créer un nouveau bar
  const createBar = async (barData) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      
      // Ajouter le bar à la collection 'bars'
      const barRef = await addDoc(collection(db, 'bars'), {
        ...barData,
        ownerId: currentUser.uid,
        createdAt: new Date(),
        staff: [], // Liste du personnel
        products: [], // Liste des produits
      });
      
      // Ajouter la référence du bar à l'utilisateur
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        bars: arrayUnion(barRef.id)
      });
      
      return barRef.id;
    } catch (error) {
      console.error("Error creating bar: ", error);
      throw error;
    }
  };

  // Charger les bars d'un utilisateur
  const getUserBars = async () => {
    try {
      if (!currentUser) return [];
      
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) return [];
      
      const barIds = userDoc.data().bars || [];
      const bars = [];
      
      for (const barId of barIds) {
        const barDoc = await getDoc(doc(db, 'bars', barId));
        if (barDoc.exists()) {
          bars.push({ id: barDoc.id, ...barDoc.data() });
        }
      }
      
      return bars;
    } catch (error) {
      console.error("Error getting user bars: ", error);
      return [];
    }
  };

  /**
   * Crée un nouvel employé pour un bar spécifique
   */
  const createEmployee = async (barId, employeeData) => {
    try {
      if (!currentUser) throw new Error('User not authenticated');
      
      // Vérifier que l'utilisateur est bien le propriétaire du bar
      const barRef = doc(db, 'bars', barId);
      const barSnap = await getDoc(barRef);
      
      if (!barSnap.exists() || barSnap.data().ownerId !== currentUser.uid) {
        throw new Error('Unauthorized: You are not the owner of this bar');
      }
      
      // Créer le document employé
      const employeeRef = await addDoc(collection(db, 'employees'), {
        ...employeeData,
        barId,
        createdAt: new Date(),
        createdBy: currentUser.uid,
        status: 'active',
        password: employeeData.password || generateTempPassword()
      });
      
      // Ajouter l'employé à la liste du bar
      await updateDoc(barRef, {
        staff: arrayUnion(employeeRef.id)
      });
      
      return employeeRef.id;
    } catch (error) {
      console.error("Error creating employee: ", error);
      throw error;
    }
  };

  /**
   * Récupère tous les employés d'un bar
   */
  const getBarEmployees = async (barId) => {
    try {
      const q = query(
        collection(db, 'employees'),
        where('barId', '==', barId)
      );
      
      const querySnapshot = await getDocs(q);
      const employees = [];
      
      querySnapshot.forEach((doc) => {
        employees.push({ id: doc.id, ...doc.data() });
      });
      
      return employees;
    } catch (error) {
      console.error("Error getting employees: ", error);
      return [];
    }
  };

  /**
   * Met à jour un employé
   */
  const updateEmployee = async (employeeId, updates) => {
    try {
      const employeeRef = doc(db, 'employees', employeeId);
      await updateDoc(employeeRef, updates);
    } catch (error) {
      console.error("Error updating employee: ", error);
      throw error;
    }
  };

  /**
   * Supprime un employé
   */
  const deleteEmployee = async (barId, employeeId) => {
    try {
      // Vérifier que l'utilisateur est bien le propriétaire du bar
      const barRef = doc(db, 'bars', barId);
      const barSnap = await getDoc(barRef);
      
      if (!barSnap.exists() || barSnap.data().ownerId !== currentUser.uid) {
        throw new Error('Unauthorized: You are not the owner of this bar');
      }
      
      // Supprimer l'employé
      await deleteDoc(doc(db, 'employees', employeeId));
      
      // Retirer l'employé de la liste du bar
      await updateDoc(barRef, {
        staff: barSnap.data().staff.filter(id => id !== employeeId)
      });
    } catch (error) {
      console.error("Error deleting employee: ", error);
      throw error;
    }
  };

  // Gestion d'enregistrement de stock
const addStock = async (barId, stockData) => {
  try {
    if (!currentUser) throw new Error('User not authenticated');
    
    // Vérifier que l'utilisateur a accès à ce bar
    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists() || !userDoc.data().bars.includes(barId)) {
      throw new Error('Unauthorized: You do not have access to this bar');
    }
    
    // Ajouter le stock à la sous-collection du bar
    const stockRef = await addDoc(collection(db, 'bars', barId, 'stock'), {
      ...stockData,
      addedBy: currentUser.uid,
      addedAt: new Date(),
      lastUpdated: new Date()
    });
    
    return stockRef.id;
  } catch (error) {
    console.error("Error adding stock: ", error);
    throw error;
  }
};

  // Se connecter avec email/password
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Se déconnecter
const logout = async () => {
  try {
    await signOut(auth);
    setCurrentUser(null);
  } catch (error) {
    console.error("Erreur lors de la déconnexion: ", error);
    throw error;
  }
};

  // Réinitialiser le mot de passe
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  // Mettre à jour le profil utilisateur
  const updateUserProfile = async (updates) => {
    try {
      await updateProfile(auth.currentUser, updates);
      setCurrentUser({ ...currentUser, ...updates });
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    register,
    createBar,
    getUserBars,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    createEmployee,
    getBarEmployees,
    updateEmployee,
    deleteEmployee,
    addStock,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Hook personnalisé pour utiliser le contexte
export function useAuth() {
  return useContext(AuthContext);
}