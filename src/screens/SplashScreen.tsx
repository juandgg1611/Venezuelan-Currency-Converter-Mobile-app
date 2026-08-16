import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import { MotiView } from 'moti';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

const G = {
  p100: "#0dbf69", p200: "#24db86", bg100: "#0d0d0d",
};

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2500); // 2.5 seconds splash
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      {/* Subtle Background Glow */}
      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.3, scale: 1.2 }}
        transition={{ type: 'timing', duration: 2000 }}
        style={[styles.glowOrb, { backgroundColor: G.p200 }]}
      />
      
      <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />

      <View style={styles.content}>
        {/* Logo Animation */}
        <MotiView
          from={{ opacity: 0, scale: 0.8, translateY: 20 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 14, stiffness: 100 }}
          style={styles.logoContainer}
        >
          {/* A pulse effect behind the logo */}
          <MotiView
            from={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 1.5 }}
            transition={{ type: 'timing', duration: 1500, loop: true }}
            style={styles.logoPulse}
          />
          <Image source={require('../../assets/icon.png')} style={styles.logoImage} />
        </MotiView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: G.bg100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOrb: {
    position: 'absolute',
    width: width,
    height: width,
    borderRadius: width / 2,
    opacity: 0.3,
  },
  content: {
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPulse: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 30,
    backgroundColor: G.p200,
  },
  logoImage: {
    width: 140,
    height: 140,
    borderRadius: 30,
    zIndex: 2,
  }
});
