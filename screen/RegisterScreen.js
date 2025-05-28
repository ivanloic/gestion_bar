
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  KeyboardAvoidingView, 
  Platform,
  Image,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';

const RegisterScreen = () => {
  const [formData, setFormData] = useState({
    phone: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigation = useNavigation();
  const { register } = useAuth();

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Numéro de téléphone requis';
    } else if (!/^[0-9]{9}$/.test(formData.phone)) {
      newErrors.phone = 'Numéro invalide (9 chiffres)';
    }
    
    if (!formData.username.trim()) {
      newErrors.username = "Nom d'utilisateur requis";
    } else if (formData.username.length < 3) {
      newErrors.username = "Minimum 3 caractères";
    }
    
    if (!formData.password) {
      newErrors.password = 'Mot de passe requis';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Minimum 6 caractères';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      await register({
        phone: formData.phone,
        username: formData.username,
        password: formData.password,
      });
      
      Alert.alert(
        'Inscription réussie',
        'Votre compte a été créé avec succès!',
        [{ text: 'OK', onPress: () => navigation.navigate('BarManagementScreen') }]
      );
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert(
        'Erreur',
        error.message || "Une erreur s'est produite lors de l'inscription"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with logo */}
        <View style={styles.header}>
          {/* <Image
            source={require('../assets/logo-bar.png')}
            style={styles.logo}
          /> */}
          <Text style={styles.title}>Création de compte</Text>
          <Text style={styles.subtitle}>Commencez à gérer vos bars</Text>
        </View>


        

        {/* Form fields */}
        <View style={styles.formContainer}>

             {/* Username */}
             <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom d'utilisateur *</Text>
            <View style={[styles.inputContainer, errors.username && styles.inputError]}>
              <Icon name="person" size={20} color="#6c757d" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="john_doe"
                placeholderTextColor="#adb5bd"
                value={formData.username}
                onChangeText={(text) => handleChange('username', text)}
                autoCapitalize="none"
              />
            </View>
            {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
          </View>
          {/* Phone number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Numéro de téléphone *</Text>
            <View style={[styles.inputContainer, errors.phone && styles.inputError]}>
              <Icon name="phone" size={20} color="#6c757d" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="06 12 34 56 78"
                placeholderTextColor="#adb5bd"
                value={formData.phone}
                onChangeText={(text) => handleChange('phone', text)}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>


          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe *</Text>
            <View style={[styles.inputContainer, errors.password && styles.inputError]}>
              <Icon name="lock" size={20} color="#6c757d" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="••••••"
                placeholderTextColor="#adb5bd"
                value={formData.password}
                onChangeText={(text) => handleChange('password', text)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Icon 
                  name={showPassword ? 'visibility-off' : 'visibility'} 
                  size={20} 
                  color="#6c757d" 
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmer le mot de passe *</Text>
            <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
              <Icon name="lock-outline" size={20} color="#6c757d" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="••••••"
                placeholderTextColor="#adb5bd"
                value={formData.confirmPassword}
                onChangeText={(text) => handleChange('confirmPassword', text)}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Icon 
                  name={showConfirmPassword ? 'visibility-off' : 'visibility'} 
                  size={20} 
                  color="#6c757d" 
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          {/* Submit button */}
          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Création en cours...' : 'Créer mon compte'}
            </Text>
          </TouchableOpacity>

          {/* Login link */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
              <Text style={styles.loginLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2b2d42',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  formContainer: {
    paddingHorizontal: 25,
    marginTop: 10,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
    marginLeft: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#212529',
    fontSize: 15,
  },
  eyeIcon: {
    padding: 10,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  submitButton: {
    backgroundColor: '#2b2d42',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#adb5bd',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#6c757d',
    fontSize: 14,
  },
  loginLink: {
    color: '#2b2d42',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RegisterScreen;