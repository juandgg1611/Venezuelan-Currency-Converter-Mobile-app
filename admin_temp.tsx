import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  RefreshCcw, Camera, Pencil, Trash2, Plus, X, Check,
  Package, ImagePlus, Images, Lock, ArrowRight, Ban, ClipboardList, Clock, CheckCircle2, Truck, XCircle, Fingerprint, QrCode
} from 'lucide-react-native';
import { useRatesStore } from '../store/useRatesStore';
import { supabase } from '../utils/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import { decode } from 'base64-arraybuffer';
import { useAuthStore } from '../store/useAuthStore';
import { Talla } from '../types/Product';
import { PALETA_MODA, ColorPreset, hueToHex, addCustomColor } from '../utils/colorPalette';
import { useToastStore } from '../store/useToastStore';
import { ConfirmModal } from '../components/ConfirmModal';
import { QRGeneratorModal } from '../components/QRGeneratorModal';

const TALLAS_DISPONIBLES: Talla[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'SM', 'ML', 'Talla Única'];
const { width: SCREEN_W } = Dimensions.get('window');
const HUE_BAR_W = SCREEN_W - 80;

interface LocalImage {
  uri: string;
  base64: string;
}

interface ColorEntry {
  nombre: string;
  hex: string;
  image_urls?: string[];
  localImages?: LocalImage[];
  image_url?: string;
  base64?: string;
  localUri?: string;
}

interface ProductoDB {
  id: string;
  name: string;
  description: string;
  divisas_price_usd: number;
  image_url: string;
  images: string[];
  sizes: Talla[];
  colors: ColorEntry[];
  agotado?: boolean;
}

// ── Color Picker Modal ─────────────────────────────────────────────────────
import { useColorScheme } from 'react-native';

function ColorPickerModal({ visible, onClose, onSelect }: {
  visible: boolean; onClose: () => void; onSelect: (c: ColorPreset) => void;
}) {
  const [tab, setTab] = useState<'palette' | 'custom'>('palette');
  const [hue, setHue] = useState(180);
  const [customName, setCustomName] = useState('');
  const customHex = hueToHex(hue);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = Math.max(0, Math.min(evt.nativeEvent.pageX - 20, HUE_BAR_W));
        setHue(Math.round((x / HUE_BAR_W) * 360));
      },
      onPanResponderMove: (evt) => {
        const x = Math.max(0, Math.min(evt.nativeEvent.pageX - 20, HUE_BAR_W));
        setHue(Math.round((x / HUE_BAR_W) * 360));
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 999 }}>
      <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={onClose} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' }}
        pointerEvents="box-none"
      >
        <View style={{ backgroundColor: isDark ? '#171717' : '#ffffff', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}>
          <View style={{ width: 40, height: 4, backgroundColor: isDark ? '#404040' : '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#ffffff' : '#171717', marginBottom: 16 }}>Seleccionar Color</Text>

          <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#262626' : '#f3f4f6', borderRadius: 16, padding: 4, marginBottom: 16 }}>
            <TouchableOpacity onPress={() => setTab('palette')}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: tab === 'palette' ? (isDark ? '#0a0a0a' : '#ffffff') : 'transparent', elevation: tab === 'palette' ? 1 : 0 }}>
              <Text style={{ fontWeight: '600', fontSize: 14, color: tab === 'palette' ? (isDark ? '#ffffff' : '#171717') : '#9ca3af' }}>
                Colores de Moda
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTab('custom')}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: tab === 'custom' ? (isDark ? '#0a0a0a' : '#ffffff') : 'transparent', elevation: tab === 'custom' ? 1 : 0 }}>
              <Text style={{ fontWeight: '600', fontSize: 14, color: tab === 'custom' ? (isDark ? '#ffffff' : '#171717') : '#9ca3af' }}>
                Personalizado
              </Text>
            </TouchableOpacity>
          </View>

          {tab === 'palette' ? (
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 8 }}>
                {PALETA_MODA.map((c) => (
                  <TouchableOpacity key={c.hex} onPress={() => onSelect(c)} style={{ alignItems: 'center', width: '25%', marginBottom: 12 }}>
                    <View style={{ backgroundColor: c.hex, width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: isDark ? '#404040' : '#e5e7eb', marginBottom: 4 }} />
                    <Text style={{ fontSize: 9, color: '#6b7280', textAlign: 'center' }} numberOfLines={1}>{c.nombre}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={{ gap: 16 }}>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <View style={{ backgroundColor: customHex, width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#e5e7eb' }} />
                <Text style={{ fontSize: 14, color: '#6b7280', fontFamily: 'monospace' }}>{customHex}</Text>
              </View>

              <View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 8 }}>Arrastra para elegir el matiz</Text>
                <View 
                  {...panResponder.panHandlers}
                  style={{ width: HUE_BAR_W, height: 32, borderRadius: 16, overflow: 'hidden', position: 'relative' }}
                >
                  <View style={{ flexDirection: 'row', width: HUE_BAR_W, height: 32 }}>
                    {Array.from({ length: 36 }, (_, i) => (
                      <View key={i} style={{ flex: 1, backgroundColor: hueToHex(i * 10) }} />
                    ))}
                  </View>
                  <View style={{
                    position: 'absolute', left: (hue / 360) * HUE_BAR_W - 14, top: 4,
                    width: 24, height: 24, borderRadius: 12, borderWidth: 3,
                    borderColor: 'white', backgroundColor: customHex,
                    pointerEvents: 'none'
                  }} />
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 8 }}>Nombre del Color</Text>
                <TextInput value={customName} onChangeText={setCustomName} placeholder="Ej. Verde Bosque"
                  placeholderTextColor="#9ca3af"
                  style={{ backgroundColor: isDark ? '#262626' : '#f9fafb', color: isDark ? '#ffffff' : '#171717', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#404040' : '#e5e7eb' }} />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity onPress={() => {
                  if (!customName.trim()) { useToastStore.getState().showToast('Escribe un nombre para el color', 'error'); return; }
                  onSelect({ nombre: customName, hex: customHex });
                }} style={{ flex: 1, backgroundColor: isDark ? '#262626' : '#f9fafb', paddingVertical: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: isDark ? '#404040' : '#e5e7eb' }}>
                  <Text style={{ color: isDark ? '#ffffff' : '#171717', fontWeight: 'bold' }}>Usar solo ahora</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => {
                  if (!customName.trim()) { useToastStore.getState().showToast('Escribe un nombre para el color', 'error'); return; }
                  const newColor = { nombre: customName, hex: customHex };
                  addCustomColor(newColor);
                  onSelect(newColor);
                }} style={{ flex: 1, backgroundColor: isDark ? '#ffffff' : '#171717', paddingVertical: 12, borderRadius: 16, alignItems: 'center' }}>
                  <Text style={{ color: isDark ? '#171717' : 'white', fontWeight: 'bold' }}>Guardar y Usar</Text>
                </TouchableOpacity>
              </View>

            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Edit Product Modal ─────────────────────────────────────────────────────
function EditProductModal({ product, visible, onClose, onSaved }: {
  product: ProductoDB | null; visible: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [tallas, setTallas] = useState<Talla[]>([]);
  const [colors, setColors] = useState<ColorEntry[]>([]);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [mainImageB64, setMainImageB64] = useState<string | null>(null);
  const [extraImages, setExtraImages] = useState<LocalImage[]>([]);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name); setDesc(product.description || '');
      setPrice(String(product.divisas_price_usd));
      setTallas(product.sizes || []); setColors(product.colors || []);
      setMainImage(product.image_url); setMainImageB64(null);
      setExtraImages([]);
    }
  }, [product]);

  const pickImage = async (multi = false) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: !multi, allowsMultipleSelection: multi,
      aspect: [4, 5], quality: 0.75, base64: true,
    });
    if (!result.canceled) {
      if (multi) {
        const imgs = result.assets.filter(a => a.base64).map(a => ({ uri: a.uri, base64: a.base64! }));
        setExtraImages(prev => [...prev, ...imgs]);
      } else if (result.assets[0].base64) {
        setMainImage(result.assets[0].uri);
        setMainImageB64(result.assets[0].base64);
      }
    }
  };

  const pickColorImage = async (colorNombre: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.75, base64: true,
    });
    if (!result.canceled) {
      const imgs = result.assets.filter(a => a.base64).map(a => ({ uri: a.uri, base64: a.base64! }));
      setColors(prev => prev.map(c =>
        c.nombre === colorNombre ? { ...c, localImages: [...(c.localImages || []), ...imgs] } : c
      ));
    }
  };

  const uploadImage = async (b64: string, prefix: string) => {
    const fn = `${prefix}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('product-images').upload(fn, decode(b64), { contentType: 'image/jpeg' });
    if (error) throw error;
    return supabase.storage.from('product-images').getPublicUrl(fn).data.publicUrl;
  };

  const handleSave = async () => {
    if (!product || !name || !price) return;
    setSaving(true);
    try {
      let imgUrl = mainImage || '';
      if (mainImageB64) imgUrl = await uploadImage(mainImageB64, 'product');

      const uploadedExtras = await Promise.all(extraImages.map(img => uploadImage(img.base64, 'extra')));
      const existingExtras = (product.images || []).filter(u => u !== product.image_url);
      const allImages = [...existingExtras, ...uploadedExtras];

      const finalColors = await Promise.all(colors.map(async (c: any) => {
        const localUrls = c.localImages ? await Promise.all(c.localImages.map((img: any) => uploadImage(img.base64, `color-${c.nombre}`))) : [];
        const existingUrls = c.image_urls || (c.image_url ? [c.image_url] : []);
        return { nombre: c.nombre, hex: c.hex, image_urls: [...existingUrls, ...localUrls] };
      }));

      const { error } = await supabase.from('products').update({
        name, description: desc, divisas_price_usd: parseFloat(price),
        image_url: imgUrl, images: [imgUrl, ...allImages], sizes: tallas, colors: finalColors,
      }).eq('id', product.id);

      if (error) throw error;
      useToastStore.getState().showToast('Los cambios se guardaron exitosamente', 'success');
      onSaved(); onClose();
    } catch (e: any) { useToastStore.getState().showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  if (!visible) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5000, elevation: 500 }}>
      <ColorPickerModal visible={colorPickerVisible} onClose={() => setColorPickerVisible(false)}
        onSelect={(c) => {
          if (!colors.find(ex => ex.nombre === c.nombre))
            setColors(prev => [...prev, { nombre: c.nombre, hex: c.hex, image_url: '' }]);
          setColorPickerVisible(false);
        }} />

      <TouchableOpacity className="flex-1 bg-black/50" activeOpacity={1} onPress={onClose} />
      <View className="bg-white dark:bg-neutral-950 rounded-t-[32px] absolute bottom-0 left-0 right-0 h-[88%]">
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
            <View className="w-10 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full self-center mb-4" />
            <Text className="text-xl font-bold text-neutral-900 dark:text-white mb-5">Editar Producto</Text>

            {/* Imagen principal */}
            <TouchableOpacity onPress={() => pickImage(false)}
              className="w-full h-36 bg-neutral-100 dark:bg-neutral-800 rounded-2xl items-center justify-center mb-3 overflow-hidden border-2 border-dashed border-neutral-300 dark:border-neutral-700">
              {mainImage
                ? <Image source={{ uri: mainImage }} className="w-full h-full" resizeMode="cover" />
                : <View className="items-center gap-1"><Camera size={28} color="#9ca3af" /><Text className="text-neutral-400 text-sm mt-1">Foto portada</Text></View>}
            </TouchableOpacity>

            {/* Imágenes adicionales */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-semibold text-neutral-500">Fotos Adicionales (ángulos)</Text>
              <TouchableOpacity onPress={() => pickImage(true)}
                className="flex-row items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-xl">
                <ImagePlus size={13} color="#6b7280" />
                <Text className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Añadir</Text>
              </TouchableOpacity>
            </View>
            {extraImages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row gap-2">
                  {extraImages.map((img, i) => (
                    <View key={i} className="relative">
                      <Image source={{ uri: img.uri }} style={{ width: 72, height: 72, borderRadius: 12 }} resizeMode="cover" />
                      <TouchableOpacity onPress={() => setExtraImages(p => p.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full items-center justify-center">
                        <X size={10} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            <Text className="text-xs font-semibold text-primary-800 mb-1.5">Nombre</Text>
            <TextInput value={name} onChangeText={setName} placeholderTextColor="#d97706"
              className="bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100 px-4 py-3 rounded-2xl border border-primary-200 dark:border-primary-800/50 mb-4" />

            <Text className="text-xs font-semibold text-primary-800 mb-1.5">Precio Divisas ($)</Text>
            <TextInput value={price} onChangeText={setPrice} keyboardType="numeric" placeholderTextColor="#d97706"
              className="bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100 px-4 py-3 rounded-2xl border border-primary-200 dark:border-primary-800/50 font-bold mb-4" />

            {/* Tallas */}
            <Text className="text-xs font-semibold text-neutral-500 mb-2">Tallas</Text>
            <View className="flex-row gap-2 flex-wrap mb-4">
              {TALLAS_DISPONIBLES.map((t) => {
                const sel = tallas.includes(t);
                return (
                  <TouchableOpacity key={t} onPress={() => setTallas(p => sel ? p.filter(x => x !== t) : [...p, t])}
                    className={`px-5 py-2.5 rounded-2xl border ${sel ? 'bg-neutral-900 dark:bg-white border-neutral-900' : 'border-neutral-200 dark:border-neutral-700'}`}>
                    <Text className={`font-bold text-sm ${sel ? 'text-white dark:text-neutral-900' : 'text-neutral-500'}`}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Colores */}
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-xs font-semibold text-neutral-500">Colores</Text>
              <TouchableOpacity onPress={() => setColorPickerVisible(true)}
                className="flex-row items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-xl">
                <Plus size={12} color="#6b7280" />
                <Text className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Añadir</Text>
              </TouchableOpacity>
            </View>

            <View className="gap-3 mb-5">
              {colors.map((c) => {
                const hasImages = (c.image_urls && c.image_urls.length > 0) || c.image_url || (c.localImages && c.localImages.length > 0);
                return (
                  <View key={c.nombre} className="bg-neutral-50 dark:bg-neutral-800 rounded-[20px] p-4 border border-neutral-100 dark:border-neutral-700">
                    {/* Header del color */}
                    <View className="flex-row items-center gap-3 mb-3">
                      <View style={{ backgroundColor: c.hex, width: 32, height: 32, borderRadius: 16 }} className="border border-neutral-200 shadow-sm" />
                      <Text className="flex-1 text-neutral-900 dark:text-white font-bold text-[15px]">{c.nombre}</Text>
                      
                      <TouchableOpacity onPress={() => pickColorImage(c.nombre)}
                        className="flex-row items-center gap-1.5 bg-neutral-200 dark:bg-neutral-700 px-3 py-2 rounded-xl">
                        <ImagePlus size={14} color="#4b5563" />
                        <Text className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Añadir fotos</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity onPress={() => setColors(p => p.filter(x => x.nombre !== c.nombre))}
                        className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/20 items-center justify-center ml-1">
                        <Trash2 size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>

                    {/* Galería de fotos del color */}
                    {hasImages ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row gap-3 pt-2 pr-2">
                          {(c.image_urls || (c.image_url ? [c.image_url] : [])).map((url: string, i: number) => (
                            <View key={'url-'+i} className="relative">
                              <Image source={{ uri: url }} style={{ width: 64, height: 64, borderRadius: 12 }} resizeMode="cover" />
                              <TouchableOpacity onPress={() => setColors(p => p.map(x => x.nombre === c.nombre ? { ...x, image_urls: (x.image_urls || (x.image_url ? [x.image_url] : [])).filter(u => u !== url), image_url: '' } : x))}
                                className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full items-center justify-center shadow-sm">
                                <X size={14} color="white" />
                              </TouchableOpacity>
                            </View>
                          ))}
                          {c.localImages?.map((img: any, i: number) => (
                            <View key={'loc-'+i} className="relative">
                              <Image source={{ uri: img.uri }} style={{ width: 64, height: 64, borderRadius: 12 }} resizeMode="cover" />
                              <TouchableOpacity onPress={() => setColors(p => p.map(x => x.nombre === c.nombre ? { ...x, localImages: x.localImages!.filter((_, idx) => idx !== i) } : x))}
                                className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full items-center justify-center shadow-sm">
                                <X size={14} color="white" />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    ) : (
                      <View className="h-12 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl items-center justify-center bg-neutral-100/50 dark:bg-neutral-800/50">
                        <Text className="text-xs text-neutral-400 font-medium">Sin fotos específicas (usa las generales)</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <Text className="text-xs font-semibold text-primary-800 mb-1.5">Descripción</Text>
            <TextInput value={desc} onChangeText={setDesc} multiline placeholder="Detalles opcionales..."
              placeholderTextColor="#d97706"
              className="bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100 px-4 py-3 rounded-2xl border border-primary-200 dark:border-primary-800/50 h-20 mb-5"
              textAlignVertical="top" />

            <TouchableOpacity onPress={handleSave} disabled={saving}
              className="bg-primary-500 py-4 rounded-2xl items-center flex-row justify-center gap-2">
              {saving ? <ActivityIndicator color="#171717" size="small" /> : <Check size={18} color="#171717" />}
              <Text className="text-neutral-900 font-bold text-base">{saving ? 'Guardando...' : 'Guardar Cambios'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
  );
}

// ── Main Admin Screen Content ────────────────────────────────────────────────
function AdminScreenContent() {
  const { rates, isLoading, fetchRates } = useRatesStore();

  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productDivisasPrice, setProductDivisasPrice] = useState('');
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [mainImageBase64, setMainImageBase64] = useState<string | null>(null);
  const [extraImages, setExtraImages] = useState<LocalImage[]>([]);
  const [selectedTallas, setSelectedTallas] = useState<Talla[]>([]);
  const [colors, setColors] = useState<ColorEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [products, setProducts] = useState<ProductoDB[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [editProduct, setEditProduct] = useState<ProductoDB | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [qrProduct, setQrProduct] = useState<ProductoDB | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  // ── Pedidos ──
  const [activeTab, setActiveTab] = useState<'catalogo' | 'pedidos'>('catalogo');
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  useEffect(() => { fetchRates(); loadProducts(); loadOrders(); }, []);

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data as ProductoDB[]);
    setIsLoadingProducts(false);
  };

  const loadOrders = async () => {
    setIsLoadingOrders(true);
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(80);
    if (data) setOrders(data);
    setIsLoadingOrders(false);
  };

  const updateOrderStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const resetForm = () => {
    setProductName(''); setProductDesc(''); setProductDivisasPrice('');
    setMainImage(null); setMainImageBase64(null); setExtraImages([]);
    setSelectedTallas([]); setColors([]);
  };

  const pickMainImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.75, base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setMainImage(result.assets[0].uri);
      setMainImageBase64(result.assets[0].base64);
    }
  };

  const pickExtraImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.75, base64: true,
    });
    if (!result.canceled) {
      const imgs = result.assets.filter(a => a.base64).map(a => ({ uri: a.uri, base64: a.base64! }));
      setExtraImages(prev => [...prev, ...imgs]);
    }
  };

  const pickColorImage = async (colorNombre: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.75, base64: true,
    });
    if (!result.canceled) {
      const imgs = result.assets.filter(a => a.base64).map(a => ({ uri: a.uri, base64: a.base64! }));
      setColors(prev => prev.map(c =>
        c.nombre === colorNombre ? { ...c, localImages: [...(c.localImages || []), ...imgs] } : c
      ));
    }
  };

  const uploadImage = async (b64: string, prefix = 'product') => {
    const fn = `${prefix}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('product-images').upload(fn, decode(b64), { contentType: 'image/jpeg' });
    if (error) throw error;
    return supabase.storage.from('product-images').getPublicUrl(fn).data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!productName || !productDivisasPrice || !mainImageBase64) {
      useToastStore.getState().showToast('Nombre, precio y foto son obligatorios', 'error');
      return;
    }
    const price = parseFloat(productDivisasPrice);
    if (isNaN(price)) { useToastStore.getState().showToast('El precio debe ser numérico', 'error'); return; }

    setIsSubmitting(true);
    try {
      const mainUrl = await uploadImage(mainImageBase64, 'product');
      const extraUrls = await Promise.all(extraImages.map(img => uploadImage(img.base64, 'extra')));
      const allImages = [mainUrl, ...extraUrls];

      const colorsWithUrls = await Promise.all(colors.map(async (c: any) => {
        const localUrls = c.localImages ? await Promise.all(c.localImages.map((img: any) => uploadImage(img.base64, `color-${c.nombre}`))) : [];
        const existingUrls = c.image_urls || (c.image_url ? [c.image_url] : []);
        return { nombre: c.nombre, hex: c.hex, image_urls: [...existingUrls, ...localUrls] };
      }));

      const { error } = await supabase.from('products').insert([{
        name: productName, description: productDesc, divisas_price_usd: price,
        image_url: mainUrl, images: allImages, sizes: selectedTallas, colors: colorsWithUrls,
      }]);
      if (error) throw error;
      useToastStore.getState().showToast('Producto publicado en el catálogo', 'success');
      resetForm(); loadProducts();
    } catch (e: any) {
      useToastStore.getState().showToast(e.message, 'error');
    } finally { setIsSubmitting(false); }
  };

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductoDB | null>(null);

  const handleDeleteClick = (p: ProductoDB) => {
    setProductToDelete(p);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    setDeleteModalVisible(false);
    const { error } = await supabase.from('products').delete().eq('id', productToDelete.id);
    if (error) {
      useToastStore.getState().showToast(error.message, 'error');
    } else {
      useToastStore.getState().showToast('Producto eliminado exitosamente', 'success');
      loadProducts();
    }
    setProductToDelete(null);
  };

  const toggleAgotado = async (p: ProductoDB) => {
    const nuevoEstado = !p.agotado;
    const { error } = await supabase
      .from('products')
      .update({ agotado: nuevoEstado })
      .eq('id', p.id);
    if (error) {
      useToastStore.getState().showToast(error.message, 'error');
    } else {
      useToastStore.getState().showToast(
        nuevoEstado ? 'Marcado como agotado' : 'Disponible nuevamente',
        nuevoEstado ? 'error' : 'success'
      );
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, agotado: nuevoEstado } : x));
    }
  };

  return (
    <>
      <ConfirmModal 
        visible={deleteModalVisible} 
        title="Eliminar producto" 
        message={`¿Estás seguro de que deseas eliminar "${productToDelete?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setProductToDelete(null);
        }}
      />
      <ColorPickerModal visible={colorPickerVisible} onClose={() => setColorPickerVisible(false)}
        onSelect={(c) => {
          if (!colors.find(ex => ex.nombre === c.nombre))
            setColors(prev => [...prev, { nombre: c.nombre, hex: c.hex, image_url: '' }]);
          setColorPickerVisible(false);
        }} />
      <EditProductModal product={editProduct} visible={editModalVisible}
        onClose={() => setEditModalVisible(false)} onSaved={loadProducts} />

      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

          {/* Header con Tabs */}
          <View className="px-5 pt-4 pb-0 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-950">
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">Panel Admin</Text>
            <View className="flex-row mt-4 gap-1">
              <TouchableOpacity
                onPress={() => setActiveTab('catalogo')}
                className={`flex-1 py-2.5 rounded-t-2xl flex-row items-center justify-center gap-2 ${
                  activeTab === 'catalogo'
                    ? 'bg-primary-500'
                    : 'bg-neutral-100 dark:bg-neutral-800'
                }`}
              >
                <Package size={15} color={activeTab === 'catalogo' ? '#171717' : '#9ca3af'} />
                <Text className={`font-bold text-sm ${
                  activeTab === 'catalogo' ? 'text-neutral-900' : 'text-neutral-400'
                }`}>Catálogo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setActiveTab('pedidos'); loadOrders(); }}
                className={`flex-1 py-2.5 rounded-t-2xl flex-row items-center justify-center gap-2 ${
                  activeTab === 'pedidos'
                    ? 'bg-primary-500'
                    : 'bg-neutral-100 dark:bg-neutral-800'
                }`}
              >
                <ClipboardList size={15} color={activeTab === 'pedidos' ? '#171717' : '#9ca3af'} />
                <Text className={`font-bold text-sm ${
                  activeTab === 'pedidos' ? 'text-neutral-900' : 'text-neutral-400'
                }`}>Pedidos {orders.length > 0 ? `(${orders.length})` : ''}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── TAB: CATÁLOGO ── */}
          {activeTab === 'catalogo' && (<>

          {/* Tasas */}
          <View className="mx-5 mt-5 bg-white dark:bg-neutral-900 rounded-3xl p-4 border border-neutral-100 dark:border-neutral-800 mb-5">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Tasas · DolarVzla</Text>
            {isLoading && !rates ? <ActivityIndicator color="#666" /> : (
              <View className="flex-row gap-3">
                <View className="flex-1 bg-neutral-50 dark:bg-neutral-800 p-3 rounded-2xl">
                  <Text className="text-[10px] font-semibold text-neutral-400 mb-1">USDT</Text>
                  <Text className="text-base font-bold text-neutral-900 dark:text-white">{rates?.USDT?.toFixed(2) || '---'} Bs</Text>
                </View>
                <View className="flex-1 bg-neutral-50 dark:bg-neutral-800 p-3 rounded-2xl">
                  <Text className="text-[10px] font-semibold text-neutral-400 mb-1">BCV USD</Text>
                  <Text className="text-base font-bold text-emerald-600 dark:text-emerald-400">{rates?.USD?.toFixed(2) || '---'} Bs</Text>
                </View>
                <TouchableOpacity onPress={() => fetchRates(true)}
                  className="justify-center items-center px-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl">
                  <RefreshCcw size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Formulario */}
          <View className="px-5 mb-2">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Nuevo Producto</Text>
          </View>

          <View className="mx-5 bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-100 dark:border-neutral-800 mb-5">

            {/* Foto portada */}
            <Text className="text-xs font-semibold text-neutral-500 mb-1.5">Foto de Portada</Text>
            <TouchableOpacity onPress={pickMainImage}
              className="w-full h-44 bg-neutral-100 dark:bg-neutral-800 rounded-2xl items-center justify-center mb-4 overflow-hidden border-2 border-dashed border-neutral-300 dark:border-neutral-700">
              {mainImage
                ? <Image source={{ uri: mainImage }} className="w-full h-full" resizeMode="cover" />
                : <View className="items-center gap-2">
                    <Camera size={32} color="#9ca3af" />
                    <Text className="text-neutral-500 font-semibold text-sm">Foto Principal</Text>
                    <Text className="text-neutral-400 text-xs">Toca para elegir de tu galería</Text>
                  </View>}
            </TouchableOpacity>

            {/* Fotos adicionales */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-semibold text-neutral-500">
                Fotos Adicionales{extraImages.length > 0 ? ` (${extraImages.length})` : ''}
              </Text>
              <TouchableOpacity onPress={pickExtraImages}
                className="flex-row items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-xl">
                <ImagePlus size={13} color="#6b7280" />
                <Text className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Añadir</Text>
              </TouchableOpacity>
            </View>

            {extraImages.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row gap-2 py-1">
                  {extraImages.map((img, i) => (
                    <View key={i} className="relative">
                      <Image source={{ uri: img.uri }} style={{ width: 76, height: 76, borderRadius: 14 }} resizeMode="cover" />
                      <TouchableOpacity onPress={() => setExtraImages(p => p.filter((_, idx) => idx !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full items-center justify-center">
                        <X size={10} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <View className="h-12 bg-neutral-50 dark:bg-neutral-800 rounded-xl items-center justify-center border border-dashed border-neutral-200 dark:border-neutral-700 mb-4">
                <Text className="text-neutral-400 text-xs">Sin fotos adicionales</Text>
              </View>
            )}

            {/* Nombre */}
            <Text className="text-xs font-semibold text-primary-800 mb-1.5">Nombre del Producto</Text>
            <TextInput value={productName} onChangeText={setProductName}
              placeholder="Ej. Pantalón Palazzo" placeholderTextColor="#d97706"
              className="bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100 px-4 py-3 rounded-2xl border border-primary-200 dark:border-primary-800/50 font-semibold mb-4" />

            {/* Precio */}
            <Text className="text-xs font-semibold text-primary-800 mb-1.5">Precio en Divisas ($)</Text>
            <TextInput value={productDivisasPrice} onChangeText={setProductDivisasPrice}
              keyboardType="numeric" placeholder="20.00" placeholderTextColor="#d97706"
              className="bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100 px-4 py-3 rounded-2xl border border-primary-200 dark:border-primary-800/50 font-bold mb-4" />

            {/* Tallas */}
            <Text className="text-xs font-semibold text-neutral-500 mb-2">Tallas Disponibles</Text>
            <View className="flex-row gap-2 flex-wrap mb-5">
              {TALLAS_DISPONIBLES.map((t) => {
                const selected = selectedTallas.includes(t);
                return (
                  <TouchableOpacity key={t}
                    onPress={() => setSelectedTallas(p => selected ? p.filter(s => s !== t) : [...p, t])}
                    className={`px-5 py-2.5 rounded-2xl border ${selected ? 'bg-neutral-900 dark:bg-white border-neutral-900' : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'}`}>
                    <Text className={`font-bold text-sm ${selected ? 'text-white dark:text-neutral-900' : 'text-neutral-500'}`}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Colores */}
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-xs font-semibold text-neutral-500">Variantes de Color</Text>
              <TouchableOpacity onPress={() => setColorPickerVisible(true)}
                className="flex-row items-center gap-1.5 bg-neutral-900 dark:bg-white px-3.5 py-2 rounded-xl">
                <Plus size={13} color="white" />
                <Text className="text-white dark:text-neutral-900 font-semibold text-xs">Añadir Color</Text>
              </TouchableOpacity>
            </View>

            {colors.length === 0 ? (
              <View className="bg-neutral-50 dark:bg-neutral-800 rounded-2xl py-5 items-center border border-dashed border-neutral-200 dark:border-neutral-700 mb-4">
                <Text className="text-neutral-400 text-sm">Sin colores añadidos</Text>
              </View>
            ) : (
              <View className="gap-3 mb-5">
                {colors.map((c) => {
                  const hasImages = (c.image_urls && c.image_urls.length > 0) || c.image_url || (c.localImages && c.localImages.length > 0);
                  return (
                    <View key={c.nombre} className="bg-neutral-50 dark:bg-neutral-800 rounded-[20px] p-4 border border-neutral-100 dark:border-neutral-700">
                      {/* Header del color */}
                      <View className="flex-row items-center gap-3 mb-3">
                        <View style={{ backgroundColor: c.hex, width: 32, height: 32, borderRadius: 16 }} className="border border-neutral-200 shadow-sm" />
                        <Text className="flex-1 text-neutral-900 dark:text-white font-bold text-[15px]">{c.nombre}</Text>
                        
                        <TouchableOpacity onPress={() => pickColorImage(c.nombre)}
                          className="flex-row items-center gap-1.5 bg-neutral-200 dark:bg-neutral-700 px-3 py-2 rounded-xl">
                          <ImagePlus size={14} color="#4b5563" />
                          <Text className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Añadir fotos</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={() => setColors(p => p.filter(x => x.nombre !== c.nombre))}
                          className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/20 items-center justify-center ml-1">
                          <Trash2 size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>

                      {/* Galería de fotos del color */}
                      {hasImages ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View className="flex-row gap-3 pt-2 pr-2">
                            {(c.image_urls || (c.image_url ? [c.image_url] : [])).map((url: string, i: number) => (
                              <View key={'url-'+i} className="relative">
                                <Image source={{ uri: url }} style={{ width: 64, height: 64, borderRadius: 12 }} resizeMode="cover" />
                                <TouchableOpacity onPress={() => setColors(p => p.map(x => x.nombre === c.nombre ? { ...x, image_urls: (x.image_urls || (x.image_url ? [x.image_url] : [])).filter(u => u !== url), image_url: '' } : x))}
                                  className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full items-center justify-center shadow-sm">
                                  <X size={14} color="white" />
                                </TouchableOpacity>
                              </View>
                            ))}
                            {c.localImages?.map((img: any, i: number) => (
                              <View key={'loc-'+i} className="relative">
                                <Image source={{ uri: img.uri }} style={{ width: 64, height: 64, borderRadius: 12 }} resizeMode="cover" />
                                <TouchableOpacity onPress={() => setColors(p => p.map(x => x.nombre === c.nombre ? { ...x, localImages: x.localImages!.filter((_, idx) => idx !== i) } : x))}
                                  className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full items-center justify-center shadow-sm">
                                  <X size={14} color="white" />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        </ScrollView>
                      ) : (
                        <View className="h-12 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl items-center justify-center bg-neutral-100/50 dark:bg-neutral-800/50">
                          <Text className="text-xs text-neutral-400 font-medium">Sin fotos específicas (usa las generales)</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Descripción */}
            <Text className="text-xs font-semibold text-primary-800 mb-1.5">Descripción (Opcional)</Text>
            <TextInput value={productDesc} onChangeText={setProductDesc} multiline
              placeholder="Detalles del producto..." placeholderTextColor="#d97706"
              className="bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100 px-4 py-3 rounded-2xl border border-primary-200 dark:border-primary-800/50 text-sm h-20 mb-5"
              textAlignVertical="top" />

            <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}
              className="bg-emerald-500 py-4 rounded-2xl items-center flex-row justify-center gap-2">
              {isSubmitting ? <ActivityIndicator color="white" size="small" /> : <Package size={18} color="white" />}
              <Text className="text-white font-bold text-base">{isSubmitting ? 'Subiendo...' : 'Publicar Producto'}</Text>
            </TouchableOpacity>
          </View>

          {/* Lista */}
          <View className="px-5 mb-3 flex-row justify-between items-center">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Catálogo ({products.length})
            </Text>
            <TouchableOpacity onPress={loadProducts}><RefreshCcw size={14} color="#9ca3af" /></TouchableOpacity>
          </View>

          <View className="mx-5 gap-3">
            {isLoadingProducts ? (
              <ActivityIndicator color="#666" className="my-6" />
            ) : products.length === 0 ? (
              <View className="py-10 items-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800">
                <Package size={36} color="#d1d5db" />
                <Text className="text-neutral-400 mt-3 font-medium">Catálogo vacío</Text>
              </View>
            ) : (
              products.map((p) => (
                <View key={p.id} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
                  <View className="flex-row">
                    <Image source={{ uri: p.image_url || '' }} style={{ width: 88, height: 88 }} resizeMode="cover" />
                    <View className="flex-1 px-4 py-3">
                      <Text className="text-neutral-900 dark:text-white font-bold text-[15px]" numberOfLines={1}>{p.name}</Text>
                      <Text className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm mb-1.5">${p.divisas_price_usd}</Text>
                      <View className="flex-row gap-1.5 items-center">
                        {p.colors?.slice(0, 5).map((c) => (
                          <View key={c.nombre} style={{ backgroundColor: c.hex, width: 11, height: 11, borderRadius: 6 }}
                            className="border border-neutral-200" />
                        ))}
                        {(p.images?.length || 0) > 1 && (
                          <Text className="text-[9px] text-neutral-400 ml-1">
                            <Images size={9} color="#9ca3af" /> {p.images.length} fotos
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                <View className="flex-row border-t border-neutral-100 dark:border-neutral-800">
                    {/* Toggle Agotado */}
                    <TouchableOpacity
                      onPress={() => toggleAgotado(p)}
                      className={`flex-1 flex-row items-center justify-center gap-2 py-3.5 border-r border-neutral-100 dark:border-neutral-800 ${
                        p.agotado
                          ? 'bg-rose-50 dark:bg-rose-950/40'
                          : ''
                      }`}
                    >
                      <Ban size={15} color={p.agotado ? '#ef4444' : '#9ca3af'} />
                      <Text className={`font-semibold text-sm ${
                        p.agotado ? 'text-rose-500' : 'text-neutral-400 dark:text-neutral-500'
                      }`}>
                        {p.agotado ? 'Agotado' : 'Disponible'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setQrProduct(p); setQrModalVisible(true); }}
                      className="flex-1 flex-row items-center justify-center gap-2 py-3.5 border-r border-neutral-100 dark:border-neutral-800">
                      <QrCode size={16} color="#10b981" />
                      <Text className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">QR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setEditProduct(p); setEditModalVisible(true); }}
                      className="flex-1 flex-row items-center justify-center gap-2 py-3.5 border-r border-neutral-100 dark:border-neutral-800">
                      <Pencil size={16} color="#374151" />
                      <Text className="text-neutral-700 dark:text-neutral-300 font-semibold text-sm">Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteClick(p)}
                      className="flex-1 flex-row items-center justify-center gap-2 py-3.5">
                      <Trash2 size={16} color="#ef4444" />
                      <Text className="text-red-500 font-semibold text-sm">Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
          </>
          )}

          {/* ── TAB: PEDIDOS ── */}
          {activeTab === 'pedidos' && (
            <View className="px-5 mt-5">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Pedidos ({orders.length})
                </Text>
                <TouchableOpacity onPress={loadOrders} className="flex-row items-center gap-1.5">
                  <RefreshCcw size={14} color="#9ca3af" />
                  <Text className="text-neutral-400 text-xs font-semibold">Actualizar</Text>
                </TouchableOpacity>
              </View>

              {isLoadingOrders ? (
                <ActivityIndicator color="#d97706" className="my-10" />
              ) : orders.length === 0 ? (
                <View className="py-16 items-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800">
                  <ClipboardList size={40} color="#d1d5db" />
                  <Text className="text-neutral-400 mt-3 font-semibold text-base">Sin pedidos aún</Text>
                  <Text className="text-neutral-400 text-sm mt-1">Los pedidos aparecen aquí cuando los clientes confirman por WhatsApp</Text>
                </View>
              ) : (
                <View className="gap-4">
                  {orders.map((order) => {
                    const fecha = new Date(order.created_at);
                    const fechaStr = fecha.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
                    const horaStr = fecha.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

                    const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
                      pendiente:   { label: 'Pendiente',   color: '#d97706', bg: 'rgba(217,119,6,0.1)',   icon: Clock },
                      confirmado:  { label: 'Confirmado',  color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle2 },
                      entregado:   { label: 'Entregado',   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: Truck },
                      cancelado:   { label: 'Cancelado',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  icon: XCircle },
                    };
                    const st = statusConfig[order.status] ?? statusConfig.pendiente;
                    const StatusIcon = st.icon;

                    return (
                      <View key={order.id} className="bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-100 dark:border-neutral-800">

                        {/* Cabecera del pedido */}
                        <View className="flex-row items-center p-4 border-b border-neutral-100 dark:border-neutral-800">
                          <View className="flex-1">
                            <Text className="font-bold text-[13px] text-neutral-900 dark:text-white">
                              {fechaStr} · {horaStr}
                            </Text>
                            <Text className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                              {order.items?.length ?? 0} {(order.items?.length ?? 0) === 1 ? 'prenda' : 'prendas'}
                            </Text>
                          </View>
                          {/* Badge de estado */}
                          <View style={{ backgroundColor: st.bg }} className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full">
                            <StatusIcon size={13} color={st.color} />
                            <Text style={{ color: st.color }} className="text-[11px] font-extrabold tracking-wide">{st.label.toUpperCase()}</Text>
                          </View>
                        </View>

                        {/* Items del pedido */}
                        <View className="p-4 gap-3">
                          {(order.items ?? []).map((item: any, idx: number) => (
                            <View key={idx} className="flex-row items-center gap-3">
                              {item.imagen ? (
                                <Image source={{ uri: item.imagen }} style={{ width: 64, height: 64, borderRadius: 14 }} resizeMode="cover" />
                              ) : (
                                <View className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
                                  <Package size={24} color="#9ca3af" />
                                </View>
                              )}
                              <View className="flex-1">
                                <Text className="font-bold text-sm text-neutral-900 dark:text-white" numberOfLines={1}>{item.nombre}</Text>
                                <View className="flex-row items-center gap-1.5 mt-1">
                                  {item.colorHex ? (
                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.colorHex }} className="border border-neutral-200 dark:border-neutral-700" />
                                  ) : null}
                                  <Text className="text-xs text-neutral-500 dark:text-neutral-400">{item.color} · Talla {item.talla}</Text>
                                </View>
                                <Text className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                                  {item.cantidad} und. · {item.metodoPago === 'bolivares' ? 'Bs' : '$'}{' '}
                                  {item.metodoPago === 'bolivares'
                                    ? Number(item.precioPagado).toFixed(2)
                                    : Number(item.precioPagado).toFixed(2)}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>

                        {/* Totales */}
                        <View className="bg-neutral-50 dark:bg-neutral-900/50 p-4 gap-1.5 border-t border-neutral-100 dark:border-neutral-800">
                          {order.es_pago_mixto ? (
                            <>
                              <View className="flex-row justify-between">
                                <Text className="text-[13px] text-[#10b981] font-semibold">Abono divisas</Text>
                                <Text className="text-[13px] text-neutral-900 dark:text-white font-bold">${Number(order.abono_divisas).toFixed(2)}</Text>
                              </View>
                              <View className="flex-row justify-between">
                                <Text className="text-[13px] text-[#eab308] font-semibold">Restante Bs</Text>
                                <Text className="text-[13px] text-neutral-900 dark:text-white font-bold">Bs {Number(order.restante_bolivares).toFixed(2)}</Text>
                              </View>
                            </>
                          ) : (
                            <>
                              {Number(order.total_divisas) > 0 && (
                                <View className="flex-row justify-between">
                                  <Text className="text-[13px] text-[#10b981] font-semibold">Total Divisas</Text>
                                  <Text className="text-sm text-neutral-900 dark:text-white font-extrabold">${Number(order.total_divisas).toFixed(2)}</Text>
                                </View>
                              )}
                              {Number(order.total_bolivares) > 0 && (
                                <View className="flex-row justify-between">
                                  <Text className="text-[13px] text-[#eab308] font-semibold">Total Bolívares</Text>
                                  <Text className="text-sm text-neutral-900 dark:text-white font-extrabold">Bs {Number(order.total_bolivares).toFixed(2)}</Text>
                                </View>
                              )}
                            </>
                          )}
                          {order.tasa_usd && (
                            <Text className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">Tasa BCV USD: {Number(order.tasa_usd).toFixed(2)} Bs/$</Text>
                          )}
                        </View>

                        {/* Botones de estado */}
                        <View className="flex-row border-t border-neutral-100 dark:border-neutral-800">
                          {order.status === 'pendiente' && (
                            <TouchableOpacity
                              onPress={() => updateOrderStatus(order.id, 'confirmado')}
                              className="flex-1 flex-row items-center justify-center gap-1.5 py-3.5 border-r border-neutral-100 dark:border-neutral-800"
                              style={{ backgroundColor: 'rgba(16,185,129,0.05)' }}
                            >
                              <CheckCircle2 size={15} color="#10b981" />
                              <Text className="font-bold text-[13px] text-[#10b981]">Confirmar</Text>
                            </TouchableOpacity>
                          )}
                          {order.status === 'confirmado' && (
                            <TouchableOpacity
                              onPress={() => updateOrderStatus(order.id, 'entregado')}
                              className="flex-1 flex-row items-center justify-center gap-1.5 py-3.5 border-r border-neutral-100 dark:border-neutral-800"
                              style={{ backgroundColor: 'rgba(59,130,246,0.05)' }}
                            >
                              <Truck size={15} color="#3b82f6" />
                              <Text className="font-bold text-[13px] text-[#3b82f6]">Marcar Entregado</Text>
                            </TouchableOpacity>
                          )}
                          {order.status !== 'cancelado' && order.status !== 'entregado' && (
                            <TouchableOpacity
                              onPress={() => updateOrderStatus(order.id, 'cancelado')}
                              className="flex-1 flex-row items-center justify-center gap-1.5 py-3.5"
                              style={{ backgroundColor: 'rgba(239,68,68,0.04)' }}
                            >
                              <XCircle size={15} color="#ef4444" />
                              <Text className="font-bold text-[13px] text-[#ef4444]">Cancelar</Text>
                            </TouchableOpacity>
                          )}
                          {(order.status === 'entregado' || order.status === 'cancelado') && (
                            <View className="flex-1 items-center justify-center py-3.5">
                              <Text className="text-xs text-neutral-400 dark:text-neutral-500 font-semibold">Pedido finalizado</Text>
                            </View>
                          )}
                        </View>

                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

        </ScrollView>
      </SafeAreaView>

      <QRGeneratorModal
        product={qrProduct as any}
        visible={qrModalVisible}
        onClose={() => setQrModalVisible(false)}
      />
    </>
  );
}

// ── Admin Auth Wrapper ─────────────────────────────────────────────────────
export default function AdminScreen() {
  const { isAdminAuthenticated, isBiometricTrusted, isLoaded, loadTrustStatus, setAuthenticated, trustBiometric } = useAuthStore();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  // Cargar estado de confianza al iniciar
  useEffect(() => {
    loadTrustStatus();
  }, []);

  // Solo verificar y lanzar huella si ya se cargó la BD y el dispositivo es de confianza
  useEffect(() => {
    if (isLoaded && isBiometricTrusted && !isAdminAuthenticated) {
      checkAndTriggerBiometric();
    }
  }, [isLoaded, isBiometricTrusted, isAdminAuthenticated]);

  const checkAndTriggerBiometric = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(hasHardware);
    setBiometricEnrolled(isEnrolled);
    if (hasHardware && isEnrolled) {
      await triggerBiometric();
    }
  };

  const triggerBiometric = async () => {
    setBiometricLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Accede al Panel Admin',
        cancelLabel: 'Usar contraseña',
        fallbackLabel: 'Usar contraseña',
        disableDeviceFallback: true,
      });
      if (result.success) {
        setAuthenticated(true);
      }
    } catch (_) {
      // ignorar errores de cancelación
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleLogin = () => {
    if (password === 'diego1611') {
      setAuthenticated(true);
      setError(false);
      // Primera vez que ingresa correctamente → marcar dispositivo de confianza
      if (!isBiometricTrusted) {
        trustBiometric();
      }
    } else {
      setError(true);
      useToastStore.getState().showToast('Contraseña incorrecta', 'error');
      setTimeout(() => setError(false), 2000);
    }
  };

  if (isAdminAuthenticated) {
    return <AdminScreenContent />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0a0a0a' : '#fafafa' }}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >

        {/* Ícono central */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View style={{
            width: 88, height: 88, borderRadius: 28,
            backgroundColor: isDark ? 'rgba(217,119,6,0.12)' : 'rgba(217,119,6,0.08)',
            borderWidth: 1.5, borderColor: isDark ? 'rgba(217,119,6,0.3)' : 'rgba(217,119,6,0.2)',
            alignItems: 'center', justifyContent: 'center', marginBottom: 20,
          }}>
            <Lock size={38} color="#d97706" />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: isDark ? '#fff' : '#111827', marginBottom: 6 }}>
            Panel Admin
          </Text>
          <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20 }}>
            {isBiometricTrusted && biometricAvailable && biometricEnrolled
              ? 'Usa tu huella digital o la contraseña para acceder'
              : !isBiometricTrusted
                ? 'Ingresa la contraseña para activar el acceso con huella'
                : 'Ingresa la contraseña para acceder'}
          </Text>
        </View>

        {/* Botón de Huella — solo si el dispositivo es de confianza y tiene biometría */}
        {isBiometricTrusted && biometricAvailable && biometricEnrolled && (
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <TouchableOpacity
              onPress={triggerBiometric}
              disabled={biometricLoading}
              style={{
                width: 76, height: 76, borderRadius: 38,
                backgroundColor: isDark ? '#1c1c1c' : '#fff',
                borderWidth: 1.5,
                borderColor: isDark ? '#2a2a2a' : '#e5e7eb',
                alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
              }}
              activeOpacity={0.7}
            >
              {biometricLoading
                ? <ActivityIndicator color="#d97706" size="small" />
                : <Fingerprint size={32} color="#d97706" />
              }
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 10, fontWeight: '600' }}>
              {biometricLoading ? 'Verificando...' : 'Toca para usar huella'}
            </Text>

            {/* Divisor */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 28, width: '100%' }}>
              <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#1f1f1f' : '#e5e7eb' }} />
              <Text style={{ fontSize: 11, color: '#9ca3af', marginHorizontal: 12, fontWeight: '600' }}>
                O CON CONTRASEÑA
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#1f1f1f' : '#e5e7eb' }} />
            </View>
          </View>
        )}

        {/* Input de contraseña */}
        <View style={{ gap: 12 }}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña"
            placeholderTextColor="#9ca3af"

            onSubmitEditing={handleLogin}
            style={{
              backgroundColor: isDark ? '#111' : '#fff',
              color: isDark ? '#fff' : '#111827',
              paddingHorizontal: 20, paddingVertical: 16,
              borderRadius: 18,
              borderWidth: 1.5,
              borderColor: error
                ? '#ef4444'
                : isDark ? '#1f1f1f' : '#e5e7eb',
              fontSize: 16, fontWeight: '500',
            }}
          />
          <TouchableOpacity
            onPress={handleLogin}
            className="bg-primary-500 py-4 rounded-2xl flex-row items-center justify-center gap-2"
            activeOpacity={0.85}
          >
            <Text className="text-neutral-900 font-bold text-base">Ingresar</Text>
            <ArrowRight size={18} color="#171717" />
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

