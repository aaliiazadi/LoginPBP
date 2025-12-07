import { FirebaseOptions, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
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
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const createMemoryStore = (): Store => {
  const mem = new Map<string, string>();
  return {
    getString: (key: string) => mem.get(key),
    set: (key: string, value: string) => {
      mem.set(key, value);
    },
    delete: (key: string) => {
      mem.delete(key);
    },
    async getItem(key: string) {
      return mem.get(key) ?? null;
    },
    async setItem(key: string, value: string) {
      mem.set(key, value);
    },
    async removeItem(key: string) {
      mem.delete(key);
    },
  };
};

let mmkvStorage: Store;
try {
  // Dynamically require to avoid crashing when the native module isn't present (e.g., Expo Go).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MMKV } = require('react-native-mmkv');
  const mmkv = new MMKV();
  mmkvStorage = {
    getString: (key: string) => mmkv.getString(key) ?? undefined,
    set: (key: string, value: string) => {
      mmkv.set(key, value);
    },
    delete: (key: string) => {
      mmkv.delete(key);
    },
    async getItem(key: string) {
      return mmkv.getString(key) ?? null;
    },
    async setItem(key: string, value: string) {
      mmkv.set(key, value);
    },
    async removeItem(key: string) {
      mmkv.delete(key);
    },
  };
} catch (error) {
  console.warn('MMKV native module tidak tersedia, fallback ke memory store sementara.', error);
  mmkvStorage = createMemoryStore();
}

export { mmkvStorage };

type LocalPersistence = {
  type: 'LOCAL';
  _isAvailable(): Promise<boolean>;
  _set(key: string, value: string): Promise<void>;
  _get<T>(key: string): Promise<T | null>;
  _remove(key: string): Promise<void>;
  _addListener(key: string, listener: () => void): void;
  _removeListener(key: string, listener: () => void): void;
  _shouldAllowMigration?: boolean;
};

const mmkvPersistence: LocalPersistence = {
  type: 'LOCAL',
  async _isAvailable() {
    return true;
  },
  async _set(key: string, value: string) {
    await mmkvStorage.setItem(key, value);
  },
  async _get<T>(key: string) {
    return (await mmkvStorage.getItem(key)) as T | null;
  },
  async _remove(key: string) {
    await mmkvStorage.removeItem(key);
  },
  _addListener() {
    // No storage events to broadcast in this custom store.
  },
  _removeListener() {
    // No-op since _addListener is inert.
  },
  _shouldAllowMigration: false,
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
