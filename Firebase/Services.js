
import { db } from './Config';
import { doc, setDoc } from 'firebase/firestore';

export const createUserDocument = async (user, additionalData = {}) => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  
  await setDoc(userRef, {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || additionalData.username || '',
    phoneNumber: additionalData.phone || '',
    createdAt: new Date(),
    ...additionalData
  });

  return userRef;
};