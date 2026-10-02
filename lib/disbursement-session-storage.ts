import * as Keychain from 'react-native-keychain';
import { storedSessionSchema, type StoredSession } from './stellar-disbursements';

// Serialize reads/writes/deletes so logout always removes an in-flight session write.
let storageQueue: Promise<unknown> = Promise.resolve();
function serial<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(operation, operation);
  storageQueue = result.catch(() => {});
  return result;
}

export function disbursementSessionStorage(origin: string, network: string) {
  const options = { service: `org.refunite.relayid.stellar-session.${encodeURIComponent(origin)}.${network}` };
  return {
    read: () => serial(async () => {
      const value = await Keychain.getGenericPassword(options);
      if (!value) return null;
      try { return storedSessionSchema.parse(JSON.parse(value.password)); }
      catch { await Keychain.resetGenericPassword(options); return null; }
    }),
    write: (session: StoredSession) => serial(async () => {
      await Keychain.setGenericPassword(session.address, JSON.stringify(session), {
        ...options, accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }),
    clear: () => serial(async () => { await Keychain.resetGenericPassword(options); }),
  };
}
