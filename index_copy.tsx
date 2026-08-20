import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRatesStore } from '@/store/useRatesStore';
import { ProductCard } from '@/components/ProductCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import { RatesBanner } from '@/components/RatesBanner';
import { Producto, Talla } from '@/types/Product';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { Heart, QrCode, X } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';

import { ThemeToggle } from '@/components/ThemeToggle';
import { Image, Modal, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
export default function CatalogoScreen() {
  const { isLoading: isLoadingRates, rates } = useRatesStore();
  const favoriteIds = useFavoritesStore(state => state.favoriteIds);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFavoritos, setMostrarFavoritos] = useState(false);
  
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // QR Scanner State
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedProduct, setScannedProduct] = useState<Producto | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      if (data) {
        // Mapear los datos de Supabase a la interfaz local Producto
        const mappedProducts: Producto[] = data.map(item => ({
          id: item.id,
          nombre: item.name,
          descripcion: item.description || '',
          categoria: 'General',
          costo: 0,
          precioDivisas: item.divisas_price_usd,
          tallas: (item.sizes ?? []) as Talla[],
          colores: (item.colors ?? []).map((c: any) => ({
            nombre: c.nombre,
            hex: c.hex,
            imagenes: c.image_urls?.length ? c.image_urls : (c.image_url ? [c.image_url] : []),
          })),
          stock: 10,
          imagenes: (item.images?.length > 0 ? item.images : [item.image_url]).filter(Boolean),
          agotado: item.agotado ?? false,
        }));
        setProductos(mappedProducts);
      }
    } catch (e) {
      console.warn("Error fetching products:", e);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const productosFiltrados = productos.filter((p) => {
    const matchesSearch = busqueda.trim() === '' || p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchesFav = mostrarFavoritos ? favoriteIds.includes(p.id) : true;
    return matchesSearch && matchesFav;
  }).sort((a, b) => {
    if (a.agotado === b.agotado) return 0;
    return a.agotado ? 1 : -1;
  });

  const showSkeletons = (isLoadingRates && !rates) || isLoadingProducts;

  const renderItem = ({ item }: { item: Producto }) => (
    <View className="flex-1">
      <ProductCard product={item} />
    </View>
  );

  const renderSkeleton = () => (
    <View className="flex-1">
      <SkeletonCard />
    </View>
  );

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (data.startsWith('silueta://product/')) {
      const id = data.replace('silueta://product/', '');
      const product = productos.find(p => p.id === id);
      if (product) {
        setScannerVisible(false);
        setScannedProduct(product); // Esto abrirá el ProductCard (que podemos renderizar invisiblemente o en modal)
      } else {
        Alert.alert('No encontrado', 'El producto escaneado no existe o fue eliminado.');
      }
    }
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) return Alert.alert('Error', 'Se requieren permisos de cámara para escanear.');
    }
    setScannerVisible(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Image 
            source={require('../../assets/images/icon.png')} 
            className="w-14 h-14 rounded-full border border-neutral-200 dark:border-neutral-800"
            resizeMode="cover"
          />
          <View>
            <Text className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              Silueta
            </Text>
            <Text className="text-neutral-400 text-sm mt-0.5">
              Catálogo {new Date().getFullYear()}
            </Text>
          </View>
        </View>
        <ThemeToggle />
      </View>

      {/* Tasas en vivo */}
      <RatesBanner />

      {/* Buscador y Filtros */}
      <View className="mx-4 mb-5 flex-row gap-2">
        <View className="flex-1 flex-row items-center bg-neutral-100 dark:bg-neutral-900 rounded-2xl px-4 py-3 border border-neutral-200 dark:border-neutral-800">
          <Text className="text-neutral-400 mr-2">🔍</Text>
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar prenda..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 text-neutral-900 dark:text-white text-[15px]"
          />
          {busqueda !== '' && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Text className="text-neutral-400 text-lg">✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lector QR */}
        <TouchableOpacity 
          onPress={openScanner}
          className="px-4 rounded-2xl items-center justify-center border bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900/50"
        >
          <QrCode size={22} color="#10b981" />
        </TouchableOpacity>

        {/* Toggle Favoritos */}
        <TouchableOpacity 
          onPress={() => setMostrarFavoritos(!mostrarFavoritos)}
          className={`px-4 rounded-2xl items-center justify-center border ${
            mostrarFavoritos 
              ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-900/50' 
              : 'bg-neutral-100 border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800'
          }`}
        >
          <Heart 
            size={22} 
            color={mostrarFavoritos ? '#e11d48' : '#9ca3af'} 
            fill={mostrarFavoritos ? '#e11d48' : 'transparent'} 
          />
        </TouchableOpacity>
      </View>

      {/* Grid de productos */}
      {showSkeletons ? (
        <FlatList
          data={[1, 2, 3, 4]}
          numColumns={2}
          keyExtractor={(i) => String(i)}
          contentContainerClassName="px-2 pb-8"
          renderItem={renderSkeleton}
        />
      ) : productosFiltrados.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2">
          <Text className="text-4xl">🛍️</Text>
          <Text className="text-neutral-400 font-medium">Sin resultados</Text>
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <Text className="text-neutral-900 dark:text-white font-semibold underline">
              Limpiar búsqueda
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={productosFiltrados}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-2 pb-8"
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          refreshing={isLoadingProducts}
          onRefresh={fetchProducts}
        />
      )}

      {/* Modal del Scanner QR */}
      <Modal visible={scannerVisible} transparent animationType="slide" onRequestClose={() => setScannerVisible(false)}>
        <View className="flex-1 bg-black">
          <SafeAreaView className="flex-1">
            <View className="flex-row items-center justify-between px-5 py-4">
              <Text className="text-white font-bold text-xl">Escanear Etiqueta</Text>
              <TouchableOpacity onPress={() => setScannerVisible(false)} className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
                <X size={24} color="white" />
              </TouchableOpacity>
            </View>
            <View className="flex-1 rounded-[40px] overflow-hidden m-5 mb-10">
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                onBarcodeScanned={handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
              />
              {/* Marco guía visual */}
              <View className="absolute inset-0 items-center justify-center pointer-events-none">
                <View className="w-64 h-64 border-2 border-emerald-500 rounded-3xl" />
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Modal invisible (el componente maneja su propio render interno pero necesita ser invocado) */}
      {scannedProduct && (
        <ProductCard 
          product={scannedProduct} 
          forceOpen={true} 
          onCloseForce={() => setScannedProduct(null)} 
        />
      )}
    </SafeAreaView>
  );
}
