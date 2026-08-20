import '@/global.css';

import { View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { CustomToast } from '@/components/CustomToast';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <AnimatedSplashOverlay />
      <AppTabs />
      <CustomToast />
    </View>
  );
}
