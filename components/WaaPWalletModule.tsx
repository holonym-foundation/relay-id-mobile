import { WaaPModule } from '@human.tech/waap-sdk-react-native';
import { useDemoMode } from '@/contexts/DemoContext';

// Mount only after initWaapNative has installed the current event bus. On a
// React remount the SDK can still hold the previous bus in module-level state.
export function WaaPWalletModule() {
  const { provider } = useDemoMode();
  return provider ? <WaaPModule /> : null;
}
