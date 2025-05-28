import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { 
  auth, 
  db,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword
} from '../Firebase/Config';
import { doc, getDoc } from 'firebase/firestore';


const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

const handleLogin = async () => {
  if (!username || !password) {
    Alert.alert('Erreur', 'Veuillez remplir tous les champs');
    return;
  }

  setLoading(true);

  try {
    // Format de l'identifiant - version simplifiée et plus robuste
    let identifier = username;
    
    // Si ce n'est pas un email et pas un numéro de téléphone, ajouter un domaine
    if (!username.includes('@') && !/^[0-9]{10}$/.test(username)) {
      identifier = `${username}@gestionbar.com`;
    }
    
    // Si c'est un numéro de téléphone, utiliser le domaine spécial
    if (/^[0-9]{10}$/.test(username)) {
      identifier = `${username}@gestionbar.com`;
    }

    // Authentification avec vérification supplémentaire
    const userCredential = await signInWithEmailAndPassword(auth, identifier, password)
      .catch(error => {
        // Transformer certaines erreurs pour plus de clarté
        if (error.code === 'auth/invalid-credential') {
          throw new Error("Identifiants invalides - email/mot de passe incorrect");
        }
        throw error;
      });

    // Vérification du profil utilisateur
    let userData;
    let redirectScreen;

    // Essayer d'abord la collection 'users' (managers)
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (userDoc.exists()) {
      userData = userDoc.data();
      redirectScreen = userData.role === 'admin' ? 'AdminDashboard' : 'BarManagementScreen';
    } else {
      // Essayer la collection 'employees' (staff)
      const employeeQuery = query(
        collection(db, 'employees'),
        where('authId', '==', userCredential.user.uid)
      );
      const querySnapshot = await getDocs(employeeQuery);
      
      if (!querySnapshot.empty) {
        const employeeDoc = querySnapshot.docs[0];
        userData = employeeDoc.data();
        redirectScreen = 'StaffDashboard';
      } else {
        // Déconnecter l'utilisateur car son profil est introuvable
        await signOut(auth);
        throw new Error("Profil utilisateur introuvable dans la base de données");
      }
    }

    // Navigation
    navigation.reset({
      index: 0,
      routes: [{ name: redirectScreen }],
    });

    return { ...userCredential.user, ...userData };

  } catch (error) {
    let errorMessage = "Une erreur s'est produite lors de la connexion";
    
    // Gestion des erreurs améliorée
    switch(error.code || error.message) {
      case 'auth/invalid-email':
      case 'auth/invalid-credential':
        errorMessage = "Identifiant ou mot de passe incorrect";
        break;
      case 'auth/user-disabled':
        errorMessage = "Ce compte a été désactivé";
        break;
      case 'auth/user-not-found':
        errorMessage = "Aucun compte trouvé avec ces identifiants";
        break;
      case 'auth/wrong-password':
        errorMessage = "Mot de passe incorrect";
        break;
      case "Profil utilisateur introuvable dans la base de données":
        errorMessage = "Votre compte existe mais aucun profil n'a été trouvé";
        break;
      default:
        console.error("Détails de l'erreur:", error);
        errorMessage = error.message || errorMessage;
    }
    
    Alert.alert('Erreur de connexion', errorMessage);
  } finally {
    setLoading(false);
  }
};

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <Text style={styles.title}>Bar Manager Pro</Text>
        <Text style={styles.subtitle}>Gérez vos bars en toute simplicité</Text>

        {/* Champ Nom d'utilisateur/Numéro de téléphone */}
        <View style={styles.inputContainer}>
          <Icon name="user" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Nom d'utilisateur ou numéro de téléphone"
            placeholderTextColor="#999"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            keyboardType="default"
          />
        </View>

        {/* Champ Mot de passe */}
        <View style={styles.inputContainer}>
          <Icon name="lock" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Icon name={showPassword ? 'eye-slash' : 'eye'} size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Bouton de connexion */}
        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginButtonText}>
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </Text>
        </TouchableOpacity>

        {/* Lien vers l'inscription */}
        <TouchableOpacity 
          style={styles.registerLink} 
          onPress={() => navigation.navigate('RegisterScreen')}
        >
          <Text style={styles.registerText}>Pas de compte ? S'inscrire</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#333',
  },
  eyeIcon: {
    padding: 10,
  },
  loginButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#2980b9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerText: {
    color: '#3498db',
    fontSize: 16,
  },
});

export default LoginScreen;