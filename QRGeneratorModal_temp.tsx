import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, Animated } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { Download } from 'lucide-react-native';
import { useToastStore } from '../store/useToastStore';
import { ProductoDB, Producto } from '../types/Product';

export function QRGeneratorModal({ product, visible, onClose }: { product: ProductoDB | Producto | null; visible: boolean; onClose: () => void; }) {
  const viewShotRef = useRef<ViewShot>(null);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions({ writeOnly: true });

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const downloadQR = async () => {
    if (viewShotRef.current && viewShotRef.current.capture) {
      try {
        if (permissionResponse?.status !== 'granted') {
          const req = await requestPermission();
          if (req.status !== 'granted') {
            Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para guardar la etiqueta.');
            return;
          }
        }
        
        const uri = await viewShotRef.current.capture();
        const asset = await MediaLibrary.createAssetAsync(uri);
        await MediaLibrary.createAlbumAsync('Silueta QR', asset, false);
        useToastStore.getState().showToast('Etiqueta guardada en la galería', 'success');
        onClose();
      } catch (err) {
        console.error('Error saving QR:', err);
        Alert.alert('Error', 'No se pudo guardar la imagen.');
      }
    }
  };

  const shareQR = async () => {
    if (viewShotRef.current && viewShotRef.current.capture) {
      try {
        const uri = await viewShotRef.current.capture();
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, { dialogTitle: 'Compartir Etiqueta QR', mimeType: 'image/png' });
        } else {
          Alert.alert('Error', 'Compartir no está disponible en este dispositivo');
        }
      } catch (err) {
        console.error('Error sharing QR:', err);
      }
    }
  };

  if (!visible || !product) return null;
  const qrValue = `silueta://product/${product.id}`;

  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }], width: '100%' }} className='bg-white dark:bg-neutral-900 rounded-3xl p-6 items-center shadow-lg'>
          <Text className='text-xl font-bold text-neutral-900 dark:text-white mb-2 text-center'>Etiqueta Inteligente</Text>
          <Text className='text-neutral-500 text-sm text-center mb-6'>Imprime este código y pégalo en la bolsa de {product.name}</Text>

          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }} style={{ backgroundColor: 'white', padding: 24, borderRadius: 24, alignItems: 'center' }}>
            <QRCode value={qrValue} size={200} backgroundColor='white' color='black' />
            <Text style={{ marginTop: 16, fontSize: 14, fontWeight: 'bold', color: 'black', textAlign: 'center' }}>{product.name}</Text>
          </ViewShot>

          <View className='flex-row gap-3 mt-8 w-full'>
            <TouchableOpacity onPress={onClose} className='py-3.5 px-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center'>
              <Text className='text-neutral-700 dark:text-neutral-300 font-semibold text-base'>Cerrar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={downloadQR} className='flex-1 py-3.5 rounded-2xl bg-primary-500 items-center flex-row justify-center gap-2'>
              <Download size={18} color='#171717' />
              <Text className='text-neutral-900 font-bold text-sm'>Descargar</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={shareQR} className='flex-1 py-3.5 rounded-2xl bg-emerald-500 items-center flex-row justify-center gap-2'>
              <Text className='text-white font-bold text-sm'>Compartir</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
