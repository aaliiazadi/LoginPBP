import { FirebaseOptions, getApps, initializeApp } from 'firebase/app';
import { Persistence, getAuth, initializeAuth } from 'firebase/auth';
import { collection, getDocs, getFirestore } from 'firebase/firestore';

import { firebaseConfig } from '@/constants/firebaseConfig';

export type SessionUser = {
  uid: string;
  email: string | null;
};

const appOptions: FirebaseOptions = firebaseConfig;

const app = getApps().length ? getApps()[0] : initializeApp(appOptions);

type Store = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
};

const createMemoryStore = (): Store => {
  const mem = new Map<string, string>();
  return {
    getString: (key) => mem.get(key),
    set: (key, value) => void mem.set(key, value),
    delete: (key) => void mem.delete(key),
  };
};

let mmkvStorage: Store;
try {
  // Dynamically require to avoid crashing when the native module isn't present (e.g., Expo Go).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MMKV } = require('react-native-mmkv');
  mmkvStorage = new MMKV();
} catch (error) {
  console.warn('MMKV native module tidak tersedia, fallback ke memory store sementara.', error);
  mmkvStorage = createMemoryStore();
}

export { mmkvStorage };

const mmkvPersistence: Persistence = {
  type: 'LOCAL',
  async _isAvailable() {
    return true;
  },
  async _set(key, value) {
    mmkvStorage.set(key, value);
  },
  async _get(key) {
    return mmkvStorage.getString(key) ?? null;
  },
  async _remove(key) {
    mmkvStorage.delete(key);
  },
};

let authInstance = getAuth(app);
try {
  authInstance = initializeAuth(app, { persistence: mmkvPersistence });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);

export const mahasiswaCollection = collection(db, 'mahasiswa');

export const persistSession = (user: SessionUser | null) => {
  if (user) {
    mmkvStorage.set('auth:user', JSON.stringify(user));
  } else {
    mmkvStorage.delete('auth:user');
  }
};

export const getPersistedSession = (): SessionUser | null => {
  const cached = mmkvStorage.getString('auth:user');
  if (!cached) return null;
  try {
    return JSON.parse(cached) as SessionUser;
  } catch {
    mmkvStorage.delete('auth:user');
    return null;
  }
};

export const fetchMahasiswa = async () => {
  const snapshot = await getDocs(mahasiswaCollection);
  return snapshot.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    // Normalisasi field agar kompatibel dengan variasi penamaan di Firestore.
    const nama = (data.nama ?? data.Nama ?? data.name ?? data.fullName) as string | undefined;
    const nim = (data.nim ?? data.NIM ?? data.nrp ?? data.npm) as string | undefined;
    const jurusan = (data.jurusan ?? data.prodi ?? data['Prodi/Angkatan']) as string | undefined;

    return {
      id: doc.id,
      nama,
      nim,
      jurusan,
    };
  });
};
