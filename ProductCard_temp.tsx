import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  Dimensions,
  useColorScheme,
} from 'react-native';
import {
  Flame, ShoppingCart, DollarSign, Banknote, ChevronRight, X, Eye, Heart, QrCode
} from 'lucide-react-native';
import { useRatesStore } from '../store/useRatesStore';
import { useCartStore } from '../store/useCartStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { Producto, Talla, VarianteColor } from '../types/Product';
import { MetodoPago } from '../types/Cart';
import { formatUSD, formatVES } from '../utils/currency';
import { calculateAdjustedPrice } from '../utils/pricing';
import { QRGeneratorModal } from './QRGeneratorModal';

const TALLAS: Talla[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'SM', 'ML', 'Talla Única'];
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProductCardProps {
  product: Producto;
  forceOpen?: boolean;
  onCloseForce?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, forceOpen, onCloseForce }) => {
  const { fetchRates, rates } = useRatesStore();
  const { addItem } = useCartStore();
  const favoriteIds = useFavoritesStore(state => state.favoriteIds);
  const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);
  const isFavoriteLocal = (id: string) => favoriteIds.includes(id);
  const colorScheme = useColorScheme();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTalla, setSelectedTalla] = useState<Talla | null>(null);
  const [selectedColor, setSelectedColor] = useState<VarianteColor | null>(null);
  const [selectedMetodo, setSelectedMetodo] = useState<MetodoPago | null>(null);
  const [previewColor, setPreviewColor] = useState<VarianteColor | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [fullScreenImageVisible, setFullScreenImageVisible] = useState(false);
  const [added, setAdded] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  useEffect(() => {
    if (!rates) fetchRates();
  }, [rates, fetchRates]);

  useEffect(() => {
    if (forceOpen) handleOpenModal();
  }, [forceOpen]);

  // ─── Precios ───────────────────────────────────────────────────────────────
  const precioDivisas = product.precioDivisas;
  const precioBase = calculateAdjustedPrice(precioDivisas, rates?.USDT || 0, rates?.USD || 0);
  const precioVes = precioBase * (rates?.USD || 36.5);

  const colorImages = selectedColor?.imagenes?.filter(Boolean) ?? [];
  const extraImages = product.imagenes?.filter(Boolean) ?? [];
  
  // Mantenemos las fotos principales siempre disponibles, pero si hay un color seleccionado
  // sus fotos van de primero. Evitamos duplicados con Set.
  let galleryImages = Array.from(new Set([...colorImages, ...extraImages]));
  
  if (galleryImages.length === 0) {
    galleryImages = ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop'];
  }
  
  const activeModalImage = galleryImages[activeImageIdx] ?? galleryImages[0];

  // Imagen activa en la tarjeta del catálogo (prioriza imagen principal del producto)
  const activeColorForCard = previewColor; 
  const cardImage =
    activeColorForCard?.imagenes?.[0] ??
    product.imagenes?.[0] ??
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop';

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleOpenModal = () => {
    setSelectedTalla(null);
    setSelectedColor(null);
    setSelectedMetodo(null);
    setActiveImageIdx(0);
    setAdded(false);
    setModalVisible(true);
  };

  const handleColorSelect = (c: VarianteColor) => {
    setSelectedColor(c);
    setActiveImageIdx(0); // reset gallery index when color changes
  };

  const handleAddToCart = () => {
    if (!selectedTalla || !selectedColor || !selectedMetodo) return;
    const precio = selectedMetodo === 'divisas' ? precioDivisas : precioVes;
    addItem(product, selectedTalla, selectedColor, selectedMetodo, precio);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setModalVisible(false);
    }, 900);
  };

  const canAdd = selectedTalla !== null && selectedColor !== null && selectedMetodo !== null;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Tarjeta del Catálogo ── */}
      <TouchableOpacity
        onPress={handleOpenModal}
        activeOpacity={0.93}
        className="bg-white dark:bg-neutral-900 rounded-[24px] overflow-hidden m-2 border border-neutral-100/60 dark:border-neutral-800"
        style={{ elevation: 1 }}
      >
        {/* Imagen */}
        <View className="relative w-full h-52 bg-neutral-100 dark:bg-neutral-800">
          <Image
            source={{ uri: cardImage }}
            className="w-full h-full"
            resizeMode="cover"
          />

          {/* ── Franja inferior AGOTADO ── */}
          {product.agotado && (
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'rgba(239,68,68,0.88)',
                paddingVertical: 5,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontSize: 9, fontWeight: '800', letterSpacing: 3 }}>
                AGOTADO
              </Text>
            </View>
          )}

          {/* Botón Favorito */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              toggleFavorite(product.id);
            }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 dark:bg-black/60 items-center justify-center"
          >
            <Heart
              size={16}
              color={isFavoriteLocal(product.id) ? '#ef4444' : (colorScheme === 'dark' ? '#d1d5db' : '#4b5563')}
              fill={isFavoriteLocal(product.id) ? '#ef4444' : 'transparent'}
            />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View className="p-4">
          <Text
            className={`font-semibold text-[15px] mb-2 ${
              product.agotado ? 'text-neutral-400 dark:text-neutral-600' : 'text-neutral-900 dark:text-white'
            }`}
            numberOfLines={1}
          >
            {product.nombre}
          </Text>

          {/* Precios */}
          <View className="mb-3">
            <Text className="text-neutral-500 dark:text-neutral-400 text-[13px] font-medium mb-1">
              Ref. {formatUSD(precioBase)}
            </Text>
            <View className="bg-yellow-50/80 dark:bg-yellow-900/20 w-full py-2.5 rounded-2xl border border-yellow-200/60 dark:border-yellow-700/50 shadow-sm items-center justify-center">
              <Text
                className="text-[#eab308] font-black text-[26px] tracking-tighter"
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {formatVES(precioVes)}
              </Text>
            </View>
          </View>

          {/* Dots de colores */}
          {product.colores.length > 0 && (
            <View className="flex-row gap-1.5 mb-3">
              {product.colores.map((c) => (
                <TouchableOpacity
                  key={c.nombre}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    setPreviewColor(previewColor?.nombre === c.nombre ? null : c);
                  }}
                  style={{ backgroundColor: c.hex, width: 18, height: 18, borderRadius: 9 }}
                  className={`border-[2px] ${previewColor?.nombre === c.nombre
                    ? (c.hex.toLowerCase() === '#000000' || c.hex.toLowerCase() === '#000' || c.nombre.toLowerCase() === 'negro' 
                        ? 'border-amber-300' 
                        : 'border-neutral-900 dark:border-white')
                    : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                />
              ))}
            </View>
          )}

          {/* CTA */}
          {product.agotado ? (
            <View className="bg-red-500 rounded-xl py-2.5 items-center flex-row justify-center gap-1.5">
              <Text className="text-white font-bold text-[13px] tracking-wide">Agotado</Text>
            </View>
          ) : (
            <View className="bg-neutral-900 dark:bg-white rounded-xl py-2.5 items-center flex-row justify-center gap-1.5">
              <Eye size={14} color={colorScheme === 'dark' ? '#171717' : 'white'} />
              <Text className="text-white dark:text-neutral-900 font-semibold text-[13px]">Ver Detalle</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* ── Modal de Detalle ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
          if (onCloseForce) onCloseForce();
        }}
      >
        <Pressable className="flex-1 bg-black/50" onPress={() => {
          setModalVisible(false);
          if (onCloseForce) onCloseForce();
        }} />

        <View
          className="bg-white dark:bg-neutral-950 rounded-t-[32px] overflow-hidden"
          style={{ height: SCREEN_HEIGHT * 0.90 }}
        >
          {/* Header del Modal */}
          <View className="absolute top-0 w-full px-5 py-4 flex-row items-center justify-between z-10 pt-10">
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                if (onCloseForce) onCloseForce();
              }}
              className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full items-center justify-center"
            >
              <X size={24} color="white" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

            {/* Imagen grande + galería */}
            <View className="w-full bg-neutral-100 dark:bg-neutral-800">
              <TouchableOpacity activeOpacity={0.9} onPress={() => setFullScreenImageVisible(true)}>
                <Image source={{ uri: activeModalImage }} style={{ width: '100%', height: 280 }} resizeMode="cover" />
              </TouchableOpacity>
              {/* Thumbnails / dots si hay múltiples */}
              {galleryImages.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ padding: 8, gap: 6 }}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                  {galleryImages.map((img, idx) => (
                    <TouchableOpacity key={idx} onPress={() => setActiveImageIdx(idx)}>
                      <Image source={{ uri: img }} style={{
                        width: 44, height: 44, borderRadius: 8,
                        borderWidth: activeImageIdx === idx ? 2 : 0,
                        borderColor: 'white',
                        opacity: activeImageIdx === idx ? 1 : 0.65,
                      }} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View className="px-6 pt-5 pb-12">
              {/* Handle */}
              <View className="w-10 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full self-center mb-4" />

              {/* Nombre + descripción + Boton QR */}
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-neutral-900 dark:text-white font-bold text-2xl flex-1 mr-4">
                  {product.nombre}
                </Text>
                <TouchableOpacity onPress={() => setQrModalVisible(true)} className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 items-center justify-center">
                  <QrCode size={24} color="#10b981" />
                </TouchableOpacity>
              </View>
              {!!product.descripcion && (
                <Text className="text-neutral-400 text-sm mb-5 leading-5">{product.descripcion}</Text>
              )}

              {/* ── Colores ── */}
              {product.colores.length > 0 && (
                <View className="mb-5">
                  <Text className="text-neutral-500 text-[11px] font-bold uppercase tracking-widest mb-3">
                    Color{selectedColor ? ` · ${selectedColor.nombre}` : ''}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-3 pr-4">
                      {product.colores.map((c) => (
                        <TouchableOpacity key={c.nombre} onPress={() => handleColorSelect(c)} className="items-center gap-1.5">
                          <View
                            style={{ backgroundColor: c.hex, width: 44, height: 44, borderRadius: 22 }}
                            className={`border-[3px] ${selectedColor?.nombre === c.nombre
                              ? (c.hex.toLowerCase() === '#000000' || c.hex.toLowerCase() === '#000' || c.nombre.toLowerCase() === 'negro'
                                  ? 'border-amber-300'
                                  : 'border-neutral-900 dark:border-white')
                              : 'border-transparent'
                            }`}
                          />
                          <Text className={`text-[10px] font-medium ${selectedColor?.nombre === c.nombre
                            ? 'text-neutral-900 dark:text-white font-bold'
                            : 'text-neutral-400'
                          }`}>
                            {c.nombre}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* ── Tallas ── */}
              <View className="mb-6">
                <Text className="text-neutral-500 text-[11px] font-bold uppercase tracking-widest mb-3">
                  Talla{selectedTalla ? ` · ${selectedTalla}` : ''}
                </Text>
                <View className="flex-row gap-2 flex-wrap">
                  {(product.tallas.length > 0 ? product.tallas : TALLAS).map((t) => (
                    <TouchableOpacity key={t} onPress={() => setSelectedTalla(t)}
                      className={`px-5 py-2.5 rounded-2xl border ${
                        selectedTalla === t
                          ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white'
                          : 'border-neutral-200 dark:border-neutral-700 bg-transparent'
                      }`}>
                      <Text className={`font-semibold text-sm ${
                        selectedTalla === t ? 'text-white dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-400'
                      }`}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* ── Método de Pago ── */}
              {product.agotado ? (
                <View className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl px-4 py-3 flex-row items-center gap-3">
                  <View className="w-1.5 h-full absolute left-0 top-0 bottom-0 bg-red-500 rounded-l-2xl" />
                  <View className="ml-2 flex-1">
                    <Text className="text-red-600 dark:text-red-400 font-bold text-sm">Sin disponibilidad</Text>
                    <Text className="text-red-400 dark:text-red-600 text-xs mt-0.5">Esta prenda no está en stock ahora mismo.</Text>
                  </View>
                </View>
              ) : (
              <View className="mb-6">
                <Text className="text-neutral-500 text-[11px] font-bold uppercase tracking-widest mb-3">
                  Método de Pago
                </Text>

                <View className="gap-4">

                  {/* ── Card Bolívares ── */}
                  <TouchableOpacity
                    onPress={() => setSelectedMetodo('bolivares')}
                    activeOpacity={0.85}
                    style={{
                      borderRadius: 20,
                      borderWidth: 2,
                      borderColor: selectedMetodo === 'bolivares' ? '#eab308' : (colorScheme === 'dark' ? '#262626' : '#e5e7eb'),
                      backgroundColor: selectedMetodo === 'bolivares'
                        ? (colorScheme === 'dark' ? 'rgba(234,179,8,0.12)' : 'rgba(234,179,8,0.06)')
                        : (colorScheme === 'dark' ? '#171717' : '#fafafa'),
                      padding: 20,
                    }}
                  >
                    {/* Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                      <View style={{
                        width: 34, height: 34, borderRadius: 17,
                        backgroundColor: selectedMetodo === 'bolivares' ? 'rgba(234,179,8,0.15)' : (colorScheme === 'dark' ? '#262626' : '#f3f4f6'),
                        alignItems: 'center', justifyContent: 'center', marginRight: 10,
                      }}>
                        <Banknote size={17} color={selectedMetodo === 'bolivares' ? '#eab308' : '#9ca3af'} />
                      </View>
                      <Text style={{
                        fontWeight: '700', fontSize: 13, letterSpacing: 0.5,
                        color: selectedMetodo === 'bolivares' ? '#eab308' : (colorScheme === 'dark' ? '#9ca3af' : '#6b7280'),
                      }}>
                        Bolívares
                      </Text>
                    </View>

                    {/* Referencia USD pequeña */}
                    <Text style={{ fontSize: 15, color: '#9ca3af', fontWeight: '600', marginBottom: 2 }}>
                      Ref. {formatUSD(precioBase)} · Tasa BCV USD
                    </Text>

                    {/* Precio VES grande */}
                    <Text style={{
                      fontWeight: '900', fontSize: 32, lineHeight: 36,
                      color: selectedMetodo === 'bolivares' ? '#eab308' : (colorScheme === 'dark' ? 'white' : '#111827'),
                      marginBottom: 4,
                    }}>
                      {formatVES(precioVes)}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '500' }}>
                      Pago Móvil · Transferencia
                    </Text>
                  </TouchableOpacity>

                  {/* ── Card Divisas ── */}
                  <TouchableOpacity
                    onPress={() => setSelectedMetodo('divisas')}
                    activeOpacity={0.85}
                    style={{
                      borderRadius: 20,
                      borderWidth: 2,
                      borderColor: selectedMetodo === 'divisas' ? '#10b981' : (colorScheme === 'dark' ? '#262626' : '#e5e7eb'),
                      backgroundColor: selectedMetodo === 'divisas'
                        ? (colorScheme === 'dark' ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.06)')
                        : (colorScheme === 'dark' ? '#171717' : '#fafafa'),
                      padding: 20,
                    }}
                  >
                    {/* Badge ✨ Oferta del mes */}
                    <View style={{
                      position: 'absolute',
                      top: -14,
                      right: 16,
                      backgroundColor: '#10b981',
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: colorScheme === 'dark' ? '#171717' : '#ffffff',
                      flexDirection: 'row',
                      alignItems: 'center',
                      shadowColor: '#10b981',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 6,
                      elevation: 6,
                      zIndex: 10,
                    }}>
                      <Text style={{ fontSize: 12, marginRight: 4 }}>✨</Text>
                      <Text style={{
                        color: '#ffffff',
                        fontWeight: '900',
                        fontSize: 10,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                      }}>
                        Oferta del mes
                      </Text>
                    </View>

                    {/* Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                      <View style={{
                        width: 34, height: 34, borderRadius: 17,
                        backgroundColor: selectedMetodo === 'divisas' ? 'rgba(16,185,129,0.15)' : (colorScheme === 'dark' ? '#262626' : '#f3f4f6'),
                        alignItems: 'center', justifyContent: 'center', marginRight: 10,
                      }}>
                        <DollarSign size={17} color={selectedMetodo === 'divisas' ? '#10b981' : '#9ca3af'} />
                      </View>
                      <Text style={{
                        fontWeight: '700', fontSize: 13, letterSpacing: 0.5,
                        color: selectedMetodo === 'divisas' ? '#10b981' : (colorScheme === 'dark' ? '#9ca3af' : '#6b7280'),
                      }}>
                        Divisas
                      </Text>

                    </View>

                    {/* Precio */}
                    <Text style={{
                      fontWeight: '900', fontSize: 32, lineHeight: 36,
                      color: selectedMetodo === 'divisas' ? '#10b981' : (colorScheme === 'dark' ? 'white' : '#111827'),
                      marginBottom: 4,
                    }}>
                      {formatUSD(precioDivisas)}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '500' }}>
                      Efectivo · USDT · Zelle
                    </Text>
                  </TouchableOpacity>

                </View>
              </View>
              )} {/* end agotado ternary */}


              {/* ── CTA ── */}
              <TouchableOpacity
                onPress={handleAddToCart}
                disabled={!canAdd || !!product.agotado}
                className={`w-full py-4 rounded-2xl items-center justify-center flex-row gap-2 ${
                  product.agotado
                    ? 'bg-neutral-100 dark:bg-neutral-900'
                    : added ? 'bg-emerald-500' : canAdd ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-800'
                }`}
                activeOpacity={0.8}
              >
                <ShoppingCart size={18} color={product.agotado ? '#9ca3af' : (added || canAdd ? 'white' : '#9ca3af')} />
                <Text className={`font-semibold text-[15px] ${
                  product.agotado
                    ? 'text-neutral-400 dark:text-neutral-600'
                    : added ? 'text-white' : canAdd ? 'text-white dark:text-neutral-900' : 'text-neutral-400 dark:text-neutral-600'
                }`}>
                  {product.agotado ? 'Sin stock' : added ? '¡Agregado!' : canAdd ? 'Agregar al Carrito' : 'Selecciona talla, color y pago'}
                </Text>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Modal Pantalla Completa ── */}
      <Modal
        visible={fullScreenImageVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFullScreenImageVisible(false)}
      >
        <View className="flex-1 bg-black justify-center items-center">
          <TouchableOpacity
            onPress={() => setFullScreenImageVisible(false)}
            className="absolute top-12 right-6 z-50 bg-neutral-900/50 p-2 rounded-full"
          >
            <X size={24} color="white" />
          </TouchableOpacity>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: SCREEN_WIDTH * activeImageIdx, y: 0 }}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveImageIdx(idx);
            }}
          >
            {galleryImages.map((img, idx) => (
              <View key={idx} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center' }}>
                <Image source={{ uri: img }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <QRGeneratorModal
        product={product as any}
        visible={qrModalVisible}
        onClose={() => setQrModalVisible(false)}
      />
    </>
  );
};
