import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';

import { Colors } from '@/constants/theme';
import { SessionUser, auth, getPersistedSession, persistSession } from '@/lib/firebase';

type ButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
};

const PressableButton = ({ label, onPress, loading, variant = 'primary' }: ButtonProps) => {
  return (
    <Pressable
      onPress={loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'ghost' && styles.buttonGhost,
        pressed && styles.buttonPressed,
      ]}>
      <Text style={[styles.buttonText, variant === 'ghost' && styles.buttonGhostText]}>
        {loading ? '...' : label}
      </Text>
    </Pressable>
  );
};

export default function HomeScreen() {
  const [email, setEmail] = useState(() => getPersistedSession()?.email ?? '');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<SessionUser | null>(() => getPersistedSession());
  const [message, setMessage] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const session: SessionUser = { uid: currentUser.uid, email: currentUser.email };
        setUser(session);
        persistSession(session);
        if (currentUser.email && !email) {
          setEmail(currentUser.email);
        }
      } else {
        setUser(null);
        persistSession(null);
      }
    });

    return unsubscribe;
  }, [email]);

  const handleAuth = async (mode: 'login' | 'register') => {
    if (!email || !password) {
      setMessage('Isi email dan password terlebih dahulu.');
      return;
    }
    setAuthLoading(true);
    setMessage(null);
    try {
      const action =
        mode === 'login'
          ? signInWithEmailAndPassword(auth, email.trim(), password)
          : createUserWithEmailAndPassword(auth, email.trim(), password);
      const credential = await action;
      const session: SessionUser = {
        uid: credential.user.uid,
        email: credential.user.email,
      };
      persistSession(session);
      setUser(session);
      setMessage(mode === 'login' ? 'Login berhasil.' : 'Registrasi berhasil, pengguna masuk.');
      router.push('/mahasiswa');
    } catch (error: any) {
      const errMsg = error?.message ?? 'Gagal otentikasi.';
      setMessage(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    setMessage(null);
    try {
      await signOut(auth);
      persistSession(null);
      setPassword('');
      setMessage('Berhasil logout.');
    } catch (error: any) {
      setMessage(error?.message ?? 'Gagal logout.');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>Login</Text>
          <Text style={styles.caption}>Masuk dengan email dan password untuk mengakses data mahasiswa.</Text>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Masuk / Daftar</Text>
            <TextInput
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              placeholder="Password"
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />
            <View style={styles.row}>
              <PressableButton label="Login" onPress={() => handleAuth('login')} loading={authLoading} />
              <PressableButton label="Register" onPress={() => handleAuth('register')} loading={authLoading} />
            </View>
            {user ? (
              <View style={styles.row}>
                <Text style={styles.pill}>Logged in sebagai {user.email ?? 'Tanpa email'}</Text>
                <PressableButton label="Logout" onPress={handleSignOut} loading={authLoading} variant="ghost" />
              </View>
            ) : (
              <Text style={styles.pill}>Belum login</Text>
            )}
          </View>

          {message ? <Text style={styles.message}>{message}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  content: {
    flexGrow: 1,
    padding: 16,
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f172a', textAlign: 'left', alignSelf: 'stretch' },
  caption: { color: '#475569', textAlign: 'left', alignSelf: 'stretch' },
  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: 10,
    width: '100%',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  button: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  buttonPressed: { opacity: 0.8 },
  buttonGhost: {
    backgroundColor: '#e2e8f0',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  buttonGhostText: { color: '#0f172a' },
  pill: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    color: '#0f172a',
  },
  subtle: { color: '#475569' },
  message: {
    backgroundColor: '#e0f2fe',
    color: '#0f172a',
    padding: 12,
    borderRadius: 10,
  },
});
