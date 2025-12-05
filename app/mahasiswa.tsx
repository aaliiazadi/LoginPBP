import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';

import { SessionUser, fetchMahasiswa, getPersistedSession } from '@/lib/firebase';

type Mahasiswa = {
  id: string;
  nama?: string;
  nim?: string;
  jurusan?: string;
};

export default function MahasiswaScreen() {
  const [user] = useState<SessionUser | null>(() => getPersistedSession());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Mahasiswa[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setMessage('Sesi tidak ditemukan, silakan login ulang.');
      router.replace('/');
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const rows = await fetchMahasiswa();
        setData(rows);
        setMessage(null);
      } catch (error: any) {
        setMessage(error?.message ?? 'Gagal memuat data mahasiswa.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: 'Data Mahasiswa' }} />
      <View style={styles.container}>
        {loading ? <ActivityIndicator style={{ marginBottom: 12 }} /> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.subtle}>
              {loading ? 'Memuat...' : 'Belum ada data mahasiswa.'}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.nama ?? 'Tanpa nama'}</Text>
              <Text style={styles.subtle}>NIM: {item.nim ?? '-'}</Text>
              {item.jurusan ? <Text style={styles.subtle}>Jurusan: {item.jurusan}</Text> : null}
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    gap: 6,
  },
  name: { fontWeight: '700', color: '#0f172a' },
  subtle: { color: '#475569' },
  separator: { height: 10 },
  message: {
    backgroundColor: '#e0f2fe',
    color: '#0f172a',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
});
