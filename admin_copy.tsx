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


