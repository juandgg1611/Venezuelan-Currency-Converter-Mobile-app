// src/screens/HomeScreen.tsx
// FinanzasAI — Paleta NEON Carbon Green
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  Platform,
  Animated,
  Image,
  Keyboard,
  Modal,
  RefreshControl,
} from "react-native";
import { MotiView } from "moti";
import { scheduleDailyRateNotifications, cancelDailyNotifications, areDailyNotificationsScheduled } from "../services/notifications";
import {
  scheduleUsdtAlerts,
  cancelUsdtAlerts,
  areUsdtAlertsActive,
  checkUsdtMovement,
} from "../services/usdtAlertTask";
import { historyService } from "../services/history";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import {
  bcvApiService,
  BcvRates,
  CurrencyCode,
  HistoricalRate,
} from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { captureRef } from "react-native-view-shot";

// ─── PALETA NEON CARBON ──────────────────────────────────────
const G = {
  p100: "#0dbf69",
  p200: "#24db86",
  p300: "#7beab6",
  p400: "#a0f8cd",
  glow: "#11ee83",

  bg100: "#0d0d0d",
  bg200: "#141414",
  bg300: "#1c1c1c",
  bg400: "#252525",
  bg500: "#2e2e2e",

  t100: "#f0fdf4",
  t200: "#d3f8e7",
  t300: "#7beab6",
  t400: "#3a5a47",

  warning: "#fbbf24",
  euro: "#3b9eff",
  usdt: "#39c647",
  ves: "#ff8c2a",
};

// ─── CONFIGURACIÓN ───────────────────────────────────────────
const CURRENCY_CONFIG: Record<
  CurrencyCode,
  {
    label: string;
    desc: string;
    symbol: string;
    color: string;
    flagAsset?: any;
    logoUrl?: string;
    fullName: string;
  }
> = {
  USD: {
    label: "Dólar",
    desc: "Dólar · BCV oficial",
    symbol: "$",
    color: "#4bb462",
    fullName: "Dólares Estadounidenses",
    flagAsset: require("../../assets/flags/USA.png"),
  },
  EUR: {
    label: "Euro",
    desc: "Euro · BCV oficial",
    symbol: "€",
    color: G.euro,
    fullName: "Euros",
    flagAsset: require("../../assets/flags/EU.png"),
  },
  USDT: {
    label: "Tether",
    desc: "USDT · Binance P2P",
    symbol: "₮",
    color: G.usdt,
    fullName: "Tether (USDT)",
    flagAsset: require("../../assets/flags/TT.png"),
  },
  VES: {
    label: "Bolívar",
    desc: "Bs. · Venezuela",
    symbol: "Bs",
    color: G.ves,
    fullName: "Bolívares Venezolanos",
    flagAsset: require("../../assets/flags/VE.jpg"),
  },
};

const CURRENCIES: CurrencyCode[] = ["USD", "EUR", "USDT", "VES"];

// ─── HELPER: Mensaje profesional para compartir ──────────────
function buildShareMessage(
  amount: string,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  conversion: string,
  convRate: string | null,
  formatNumber: (n: string) => string,
): string {
  const fromCfg = CURRENCY_CONFIG[fromCurrency];
  const toCfg = CURRENCY_CONFIG[toCurrency];
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-VE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const rateSource =
    fromCurrency === "USDT" || toCurrency === "USDT" ? "Binance P2P" : "BCV";

  return (
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📊 CONVERSIÓN DE DIVISAS\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🔁 Conversión realizada:\n` +
    `   ${formatNumber(amount)} ${fromCfg.fullName} (${fromCurrency})\n` +
    `   ➜  ${formatNumber(conversion)} ${toCfg.fullName} (${toCurrency})\n\n` +
    (convRate
      ? `📈 Tasa aplicada:\n` +
        `   1 ${fromCurrency} = ${formatNumber(convRate)} ${toCurrency}\n\n`
      : "") +
    `🏦 Fuente de la tasa: ${rateSource}\n\n` +
    `📅 Fecha: ${dateStr}\n` +
    `🕐 Hora: ${timeStr}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Calculado con FinanzasIA\n` +
    `Tasas BCV · Binance P2P\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━`
  );
}

// ─── COMPONENTES DE ANIMACIÓN ────────────────────────────────
const FadeSlide = ({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
        easing: (t) => t,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
        easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out-cubic
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
};

const PulseAnimation = ({ children }: { children: React.ReactNode }) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
          easing: (t) => Math.sin((t * Math.PI) / 2), // ease-in-out suave
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
          easing: (t) => Math.sin((t * Math.PI) / 2),
        }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
  );
};

// ─── COMPONENTES DE ANIMACIÓN UI ───────────────────────────────────
const AnimatedSwitch = ({ active, activeColor }: { active: boolean; activeColor: string }) => {
  const anim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: active ? 1 : 0,
      useNativeDriver: false,
      bounciness: 10,
      speed: 18,
    }).start();
  }, [active]);

  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [G.bg400, activeColor],
  });

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 20],
  });

  return (
    <Animated.View style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: bgColor, justifyContent: "center" }}>
      <Animated.View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: G.bg100, transform: [{ translateX }] }} />
    </Animated.View>
  );
};

// ─── COMPONENTES DE MONEDA ───────────────────────────────────
export const CurrencyIcon = ({
  currency,
  size = 48,
}: {
  currency: CurrencyCode;
  size?: number;
}) => {
  const cfg = CURRENCY_CONFIG[currency];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: cfg.color + "18",
        borderWidth: 1.5,
        borderColor: cfg.color + "45",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {cfg.logoUrl ? (
        <Image
          source={{ uri: cfg.logoUrl }}
          style={{ width: size * 0.65, height: size * 0.65 }}
          resizeMode="contain"
        />
      ) : cfg.flagAsset ? (
        <Image
          source={cfg.flagAsset}
          style={{
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: size * 0.36,
          }}
          resizeMode="cover"
        />
      ) : null}
    </View>
  );
};

const CurrencyPill = ({
  currency,
  selected,
  onPress,
}: {
  currency: CurrencyCode;
  selected: boolean;
  onPress: () => void;
}) => {
  const cfg = CURRENCY_CONFIG[currency];
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.92,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
      <Animated.View
        style={[
          styles.currencyPill,
          { transform: [{ scale }] },
          selected && {
            backgroundColor: cfg.color + "20", // Fondo más sutil
            borderColor: cfg.color, // Borde del color de la moneda
            borderWidth: 2,
          },
        ]}
      >
        <CurrencyIcon currency={currency} size={42} />
        <Text style={[styles.pillCode, selected && { color: cfg.color }]}>
          {currency}
        </Text>
        <Text style={[styles.pillLabel, selected && { color: cfg.color }]}>
          {cfg.label}
        </Text>
        {selected && (
          <View
            style={[
              styles.selectedDot,
              {
                backgroundColor: cfg.color,
                shadowColor: cfg.color,
                shadowOpacity: 0.8,
                shadowRadius: 4,
              },
            ]}
          />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── CARD DE TASA ───────────────────────────────────
export const RateCard = ({
  currency,
  value,
  source,
  delay,
}: {
  currency: CurrencyCode;
  value: number;
  source?: string;
  delay: number;
}) => {
  const cfg = CURRENCY_CONFIG[currency];
  const hasValue = value > 0;
  const isLive = source && source !== "sin datos" && source !== "estimado";

  return (
    <FadeSlide delay={delay}>
      <View style={[styles.rateCard, { borderLeftColor: cfg.color }]}>
        <CurrencyIcon currency={currency} size={50} />

        <View style={styles.rateCardInfo}>
          <View style={styles.rateCardTopRow}>
            <Text style={styles.rateCardCode}>{currency}</Text>
            <View
              style={[
                styles.sourcePill,
                {
                  backgroundColor: isLive ? cfg.color + "18" : G.warning + "18",
                },
              ]}
            >
              <View
                style={[
                  styles.sourceDot,
                  {
                    backgroundColor: isLive ? cfg.color : G.warning,
                    shadowColor: isLive ? cfg.color : G.warning,
                    shadowOpacity: 0.9,
                    shadowRadius: 4,
                  },
                ]}
              />
              <Text
                style={[
                  styles.sourceLabel,
                  { color: isLive ? cfg.color : G.warning },
                ]}
              >
                {source ?? "—"}
              </Text>
            </View>
          </View>
          <Text style={styles.rateCardDesc}>{cfg.desc}</Text>
        </View>

        <View style={styles.rateCardValueBox}>
          <Text
            style={[
              styles.rateCardValue,
              { color: hasValue ? cfg.color : G.t400 },
            ]}
          >
            {hasValue ? value.toFixed(2) : "—"}
          </Text>
          <Text style={styles.rateCardBs}>Bs.</Text>
        </View>
      </View>
    </FadeSlide>
  );
};

// ─── TOAST SUPERIOR GRANDE ──────────────────────────
const SuccessToast = ({
  visible,
  message,
  onHide,
}: {
  visible: boolean;
  message: string;
  onHide: () => void;
}) => {
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset
      translateY.setValue(-150);
      opacity.setValue(0);

      Animated.sequence([
        // Entrada
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: 380,
            useNativeDriver: true,
            easing: (t) => 1 - Math.pow(1 - t, 3),
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
        ]),
        // Pausa visible (delay puro)
        Animated.delay(2000),
        // Salida
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -150,
            duration: 300,
            useNativeDriver: true,
            easing: (t) => t * t,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => onHide());
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.toastContainer, { transform: [{ translateY }], opacity }]}
    >
      <View style={styles.toastContent}>
        <View style={[styles.toastIcon, { backgroundColor: G.p200 }]}>
          <Ionicons name="checkmark" size={28} color={G.bg100} />
        </View>
        <View style={styles.toastTextContainer}>
          <Text style={styles.toastTitle}>¡Actualizado!</Text>
          <Text style={styles.toastMessage}>{message}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

// ─── CALENDARIO MODAL ────────────────────────────────────────
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const DAY_NAMES = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];

export const CalendarModal = ({
  visible,
  onClose,
  onSelectDate,
  selectedDate,
  loading,
  holidayError,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  selectedDate: string | null;
  loading: boolean;
  holidayError: string | null;
}) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [mounted, setMounted] = useState(false);
  const [monthStats, setMonthStats] = useState<any[] | null>(null);

  useEffect(() => {
    let cancel = false;
    historyService.getHistory(viewYear, viewMonth + 1).then((data) => {
      if (!cancel) setMonthStats(data);
    }).catch(() => {
      if (!cancel) setMonthStats(null);
    });
    return () => { cancel = true; };
  }, [viewYear, viewMonth]);

  // Todos useNativeDriver: true — corre 100% en el UI thread nativo
  const slideAnim = useRef(new Animated.Value(420)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      slideAnim.setValue(500);
      overlayOpacity.setValue(0);
      sheetOpacity.setValue(0);

      // Spring para el sheet — física real, sin easing artificial
      // tension alta + friction alta = slide suave sin rebote
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();

      // Overlay y fade más lentos para que el sheet "llegue primero"
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
          easing: (t) => t,
        }),
        Animated.timing(sheetOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Salida: timing rápido y limpio
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 500,
          duration: 260,
          useNativeDriver: true,
          easing: (t) => t * (2 - t), // ease-in-out suave
        }),
        Animated.timing(sheetOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (!visible) setMounted(false);
      });
    }
  }, [visible]);

  // Generar semanas — matriz de 7 columnas para grid perfecto
  const weeks = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Rellenar con nulls al inicio
    const flat: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) flat.push(d);
    // Rellenar al final para completar última fila
    while (flat.length % 7 !== 0) flat.push(null);
    // Partir en semanas de 7
    const result: (number | null)[][] = [];
    for (let i = 0; i < flat.length; i += 7) result.push(flat.slice(i, i + 7));
    // Rellenar con semanas vacías hasta llegar a 6 (altura constante)
    while (result.length < 6) result.push(Array(7).fill(null));
    return result;
  }, [viewYear, viewMonth]);

  const formatDateStr = useCallback(
    (day: number) => {
      const mm = String(viewMonth + 1).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${viewYear}-${mm}-${dd}`;
    },
    [viewYear, viewMonth],
  );

  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const isFuture = useCallback(
    (day: number) =>
      new Date(viewYear, viewMonth, day) >= new Date(todayY, todayM, todayD),
    [viewYear, viewMonth],
  );

  const isWeekend = useCallback(
    (day: number) => {
      const dow = new Date(viewYear, viewMonth, day).getDay();
      return dow === 0 || dow === 6; // domingo o sábado
    },
    [viewYear, viewMonth],
  );

  const isToday = useCallback(
    (day: number) =>
      day === todayD && viewMonth === todayM && viewYear === todayY,
    [viewYear, viewMonth],
  );

  const isBankHoliday = useCallback(
    (day: number) => {
      if (!monthStats) return false;
      if (isFuture(day)) return false;
      const dow = new Date(viewYear, viewMonth, day).getDay();
      if (dow !== 1) return false; // Solo lunes
      const ds = formatDateStr(day);
      const snap = monthStats.find((s: any) => s.date === ds);
      const val = snap ? snap.usd : 0;
      return val === 0;
    },
    [monthStats, viewYear, viewMonth, isFuture, formatDateStr]
  );

  const isSelected = useCallback(
    (day: number) => formatDateStr(day) === selectedDate,
    [formatDateStr, selectedDate],
  );

  const isPrevDisabled = viewYear < 2023 || (viewYear === 2023 && viewMonth === 0);

  const prevMonth = useCallback(() => {
    if (isPrevDisabled) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  }, [viewMonth, isPrevDisabled]);

  const nextMonth = useCallback(() => {
    if (viewYear === todayY && viewMonth === todayM) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  }, [viewMonth, viewYear]);

  const isNextDisabled = viewYear === todayY && viewMonth === todayM;

  if (!mounted && !visible) return null;

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Overlay — opacity nativa, sin backgroundColor animado */}
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: "rgba(0,0,0,0.78)",
          opacity: overlayOpacity,
        }}
        pointerEvents={visible ? "auto" : "none"}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Sheet — translateY + opacity, ambos nativos */}
      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          transform: [{ translateY: slideAnim }],
          opacity: sheetOpacity,
          backgroundColor: G.bg200,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          borderWidth: 1,
          borderColor: G.bg500,
          paddingBottom: Platform.OS === "ios" ? 36 : 24,
          shadowColor: "#000",
          shadowOpacity: 0.4,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: -6 },
          elevation: 24,
        }}
      >
        {/* Handle */}
        <View style={{ alignItems: "center", paddingTop: 12, marginBottom: 4 }}>
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: G.bg500,
            }}
          />
        </View>

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderColor: G.bg400,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: G.p100 + "18",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="calendar" size={18} color={G.p200} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: G.t100 }}>
              Tasa histórica BCV
            </Text>
            <Text style={{ fontSize: 11, color: G.t400, marginTop: 1 }}>
              Selecciona un día para ver la tasa oficial
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: G.bg400,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="close" size={16} color={G.t300} />
          </TouchableOpacity>
        </View>

        {/* Nav mes */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}
        >
          <TouchableOpacity
            onPress={prevMonth}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isPrevDisabled ? G.bg300 : G.bg400,
              justifyContent: "center",
              alignItems: "center",
              opacity: isPrevDisabled ? 0.35 : 1,
            }}
            disabled={isPrevDisabled}
          >
            <Ionicons name="chevron-back" size={18} color={G.p200} />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: "800", color: G.t100 }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
          <TouchableOpacity
            onPress={nextMonth}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isNextDisabled ? G.bg300 : G.bg400,
              justifyContent: "center",
              alignItems: "center",
              opacity: isNextDisabled ? 0.35 : 1,
            }}
            disabled={isNextDisabled}
          >
            <Ionicons name="chevron-forward" size={18} color={G.p200} />
          </TouchableOpacity>
        </View>

        {/* Error feriado — dentro del modal para no cerrarlo */}
        {holidayError ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginHorizontal: 16,
              marginBottom: 10,
              backgroundColor: G.warning + "15",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 9,
              borderWidth: 1,
              borderColor: G.warning + "30",
            }}
          >
            <Ionicons name="alert-circle" size={15} color={G.warning} />
            <Text
              style={{
                fontSize: 12,
                color: G.warning,
                fontWeight: "600",
                flex: 1,
              }}
            >
              {holidayError}
            </Text>
          </View>
        ) : null}

        {/* Nombres días */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            marginBottom: 4,
          }}
        >
          {DAY_NAMES.map((d, i) => (
            <Text
              key={d}
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: 11,
                fontWeight: "700",
                // Domingos (0) y Sábados (6) en color apagado
                color: i === 0 || i === 6 ? G.t400 + "80" : G.t400,
                textTransform: "uppercase",
              }}
            >
              {d}
            </Text>
          ))}
        </View>

        {/* Grid días — por filas para que el layout sea perfecto */}
        <View style={{ paddingHorizontal: 16, gap: 2 }}>
          {weeks.map((week, wIdx) => (
            <View key={`w-${wIdx}`} style={{ flexDirection: "row" }}>
              {week.map((day, dIdx) => {
                if (day === null) {
                  return (
                    <View
                      key={`e-${wIdx}-${dIdx}`}
                      style={{ flex: 1, height: 44 }}
                    />
                  );
                }
                const future = isFuture(day);
                const weekend = isWeekend(day);
                const bankHoliday = isBankHoliday(day);
                const disabled = future; // fines de semana YA NO están deshabilitados
                const sel = isSelected(day);
                const tod = isToday(day);

                return (
                  <TouchableOpacity
                    key={`d-${day}`}
                    disabled={disabled}
                    onPress={() => onSelectDate(formatDateStr(day))}
                    activeOpacity={0.6}
                    style={{
                      flex: 1,
                      height: 44,
                      justifyContent: "center",
                      alignItems: "center",
                      borderRadius: 12,
                      backgroundColor: sel
                        ? G.p100
                        : tod
                          ? G.p100 + "22"
                          : "transparent",
                      borderWidth: tod && !sel ? 1 : 0,
                      borderColor: G.p200 + "55",
                      opacity: future ? 0.15 : 1,
                    }}
                  >
                    {loading && sel ? (
                      <ActivityIndicator size="small" color={G.bg100} />
                    ) : (
                      <>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: sel ? "800" : tod ? "700" : "500",
                            color: sel
                              ? G.bg100
                              : tod
                                ? G.p200
                                : weekend
                                  ? G.t300 + "99" // fines de semana ligeramente distintos
                                  : G.t200,
                          }}
                        >
                          {day}
                        </Text>
                        {/* Puntito indicador para fines de semana (naranja) o lunes bancarios (morado) */}
                        {(weekend || bankHoliday) && !sel && !future && (
                          <View
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: bankHoliday ? "#a855f7" : G.warning + "aa",
                              position: "absolute",
                              bottom: 5,
                            }}
                          />
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Info nota */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginHorizontal: 20,
            marginTop: 14,
            backgroundColor: G.bg300,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Ionicons
            name="information-circle-outline"
            size={15}
            color={G.t400}
          />
          <Text style={{ fontSize: 11, color: G.t400, flex: 1 }}>
            Los fines de semana (•) usan la tasa del lunes siguiente.
          </Text>
        </View>
      </Animated.View>
    </Modal>
  );
};

// ─── FAB DE ACCIONES ─────────────────────────────────────────
const ActionFab = ({
  onCopy,
  onShare,
  onExportPdf,
  onExportJpg,
  disabled,
}: {
  onCopy: () => void;
  onShare: () => void;
  onExportPdf: () => void;
  onExportJpg: () => void;
  disabled?: boolean;
}) => {
  // Estado: usamos useRef en lugar de useState para que los cambios
  // sean síncronos y no generen re-renders que retrasen pointerEvents
  const openRef = useRef(false);
  const exportOpenRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const rotation = useRef(new Animated.Value(0)).current;
  const btn1Anim = useRef(new Animated.Value(0)).current; // Copiar
  const btn2Anim = useRef(new Animated.Value(0)).current; // Compartir
  const btn3Anim = useRef(new Animated.Value(0)).current; // Exportar
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabColor = useRef(new Animated.Value(0)).current; // 0=verde, 1=oscuro
  const exportBtn1 = useRef(new Animated.Value(0)).current; // JPG
  const exportBtn2 = useRef(new Animated.Value(0)).current; // PDF

  const toggleOpen = (forceClose = false) => {
    if (disabled) return;
    const isOpen = forceClose ? true : openRef.current;
    const toValue = isOpen ? 0 : 1;

    // FIX #1: actualizamos openRef de forma síncrona ANTES de arrancar animaciones
    // para que pointerEvents cambie inmediatamente sin esperar el callback
    openRef.current = !isOpen;
    setOpen(!isOpen); // re-render para que los Animated.View lean el nuevo valor

    if (isOpen && exportOpenRef.current) {
      Animated.parallel([
        Animated.spring(exportBtn1, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
        }),
        Animated.spring(exportBtn2, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
        }),
      ]).start();
      exportOpenRef.current = false;
      setExportOpen(false);
    }

    // FIX #2: el color del FAB cambia junto con la animación, no al final
    Animated.timing(fabColor, {
      toValue,
      duration: 160,
      useNativeDriver: false,
    }).start();

    Animated.parallel([
      Animated.timing(rotation, {
        toValue,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(fabScale, {
          toValue: 0.88,
          duration: 70,
          useNativeDriver: true,
        }),
        Animated.spring(fabScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 28,
        }),
      ]),
      Animated.stagger(45, [
        Animated.spring(btn1Anim, {
          toValue,
          useNativeDriver: true,
          speed: 22,
          bounciness: 8,
        }),
        Animated.spring(btn2Anim, {
          toValue,
          useNativeDriver: true,
          speed: 22,
          bounciness: 8,
        }),
        Animated.spring(btn3Anim, {
          toValue,
          useNativeDriver: true,
          speed: 22,
          bounciness: 8,
        }),
      ]),
    ]).start();
  };

  const toggleExport = () => {
    const toValue = exportOpenRef.current ? 0 : 1;
    exportOpenRef.current = !exportOpenRef.current;
    setExportOpen(exportOpenRef.current);
    Animated.stagger(45, [
      Animated.spring(exportBtn1, {
        toValue,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }),
      Animated.spring(exportBtn2, {
        toValue,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }),
    ]).start();
  };

  const handleAction = (fn: () => void) => {
    toggleOpen(true);
    setTimeout(fn, 120);
  };

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  // FIX #2: color del FAB interpolado — instantáneo al tocar
  const fabBg = fabColor.interpolate({
    inputRange: [0, 1],
    outputRange: [G.p100, G.bg400],
  });
  const fabIconColor = fabColor.interpolate({
    inputRange: [0, 1],
    outputRange: [G.bg100, G.p200],
  });
  const fabBorderColor = fabColor.interpolate({
    inputRange: [0, 1],
    outputRange: ["transparent", G.p200],
  });

  const childStyle = (anim: Animated.Value, offsetY: number) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, offsetY],
        }),
      },
      {
        scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
      },
    ],
  });

  // FIX #3: sub-botones de exportar se despliegan HACIA ARRIBA, no hacia la izquierda
  // así no tapan el label "Exportar"
  const exportSubStyle = (anim: Animated.Value, offsetY: number) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, offsetY],
        }),
      },
      {
        scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
      },
    ],
  });

  return (
    <View style={styles.fabContainer} pointerEvents="box-none">
      {/* ── Botón 1: COPIAR ── */}
      <Animated.View
        style={[styles.fabChildWrap, childStyle(btn1Anim, -64)]}
        pointerEvents={open ? "auto" : "none"}
      >
        <View style={styles.fabChildLabelWrap}>
          <Text style={styles.fabChildLabel}>Copiar</Text>
        </View>
        <TouchableOpacity
          style={[styles.fabChild, { borderColor: G.p200 + "55" }]}
          onPress={() => handleAction(onCopy)}
          activeOpacity={0.8}
        >
          <Ionicons name="copy-outline" size={20} color={G.p200} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Botón 2: COMPARTIR ── */}
      <Animated.View
        style={[styles.fabChildWrap, childStyle(btn2Anim, -124)]}
        pointerEvents={open ? "auto" : "none"}
      >
        <View style={styles.fabChildLabelWrap}>
          <Text style={styles.fabChildLabel}>Compartir</Text>
        </View>
        <TouchableOpacity
          style={[styles.fabChild, { borderColor: G.p200 + "55" }]}
          onPress={() => handleAction(onShare)}
          activeOpacity={0.8}
        >
          <Ionicons name="share-social-outline" size={20} color={G.p200} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Botón 3: EXPORTAR + sub-botones hacia arriba ── */}
      <Animated.View
        style={[styles.fabChildWrap, childStyle(btn3Anim, -184)]}
        pointerEvents={open ? "auto" : "none"}
      >
        {/* Sub-botón JPG — sube desde el botón Exportar */}
        <Animated.View
          style={[styles.exportSubWrap, exportSubStyle(exportBtn1, -54)]}
          pointerEvents={exportOpen ? "auto" : "none"}
        >
          <TouchableOpacity
            style={[
              styles.fabChildSmall,
              { borderColor: "#a78bfa55", backgroundColor: "#a78bfa12" },
            ]}
            onPress={() => handleAction(onExportJpg)}
            activeOpacity={0.8}
          >
            <Ionicons name="image-outline" size={17} color="#a78bfa" />
          </TouchableOpacity>
          <Text style={[styles.exportSubLabel, { color: "#a78bfa" }]}>JPG</Text>
        </Animated.View>

        {/* Sub-botón PDF — sube más */}
        <Animated.View
          style={[styles.exportSubWrap, exportSubStyle(exportBtn2, -112)]}
          pointerEvents={exportOpen ? "auto" : "none"}
        >
          <TouchableOpacity
            style={[
              styles.fabChildSmall,
              { borderColor: "#ff4d4d55", backgroundColor: "#ff4d4d12" },
            ]}
            onPress={() => handleAction(onExportPdf)}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={17} color="#ff4d4d" />
          </TouchableOpacity>
          <Text style={[styles.exportSubLabel, { color: "#ff4d4d" }]}>PDF</Text>
        </Animated.View>

        <View style={styles.fabChildLabelWrap}>
          <Text style={styles.fabChildLabel}>Exportar</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.fabChild,
            exportOpen
              ? { backgroundColor: G.ves + "18", borderColor: G.ves + "55" }
              : { borderColor: G.p200 + "55" },
          ]}
          onPress={toggleExport}
          activeOpacity={0.8}
        >
          <Ionicons
            name="download-outline"
            size={20}
            color={exportOpen ? G.ves : G.p200}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* ── FAB PRINCIPAL — color animado sin esperar callback ── */}
      <Animated.View style={{ transform: [{ scale: fabScale }] }}>
        <Animated.View
          style={[
            styles.fabMain,
            { backgroundColor: fabBg, borderColor: fabBorderColor },
            disabled && { opacity: 0.4 },
          ]}
        >
          <TouchableOpacity
            style={styles.fabMainInner}
            onPress={() => toggleOpen()}
            activeOpacity={0.9}
            disabled={disabled}
          >
            <Animated.View
              style={{ transform: [{ rotate: rotateInterpolate }] }}
            >
              <Animated.Text
                style={{ color: fabIconColor, fontSize: 28, lineHeight: 30 }}
              >
                ＋
              </Animated.Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
};
// ─── FAB CALCULADORA CON PULSO ──────────────────────────────────
const CalcFAB = ({ onPress }: { onPress: () => void }) => {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale, { toValue: 1.06, duration: 1500, useNativeDriver: true, easing: (t) => Math.sin((t * Math.PI) / 2) }),
          Animated.timing(glowOpacity, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale, { toValue: 1, duration: 1500, useNativeDriver: true, easing: (t) => Math.sin((t * Math.PI) / 2) }),
          Animated.timing(glowOpacity, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
        ]),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.calcFloatBtn, { transform: [{ scale: pulseScale }] }]}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: G.bg200,
          borderWidth: 2,
          borderColor: G.p200 + "40",
          shadowColor: G.p200,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        <Ionicons name="calculator" size={28} color={G.p200} />
      </TouchableOpacity>
    </Animated.View>
  );
};


// ─── CALCULADORA INTEGRADA + PAGO MIXTO ──────────────────────────────────
import * as Haptics from "expo-haptics";

// Motor de cálculo robusto (sin eval)
class CalcEngine {
  private currentValue: number = 0;
  private pendingOperator: string | null = null;
  private pendingValue: number = 0;
  private waitingForOperand: boolean = true;
  private displayValue: string = "0";
  private expressionParts: string[] = [];
  private lastResult: number | null = null;

  reset() {
    this.currentValue = 0;
    this.pendingOperator = null;
    this.pendingValue = 0;
    this.waitingForOperand = true;
    this.displayValue = "0";
    this.expressionParts = [];
    this.lastResult = null;
  }

  getDisplay(): string { return this.displayValue; }
  getExpression(): string { return this.expressionParts.join(" "); }
  
  // Extrae número real desde string formateado en es-VE (Ej: "20.000,50" -> 20000.50)
  private parseValue(str: string): number {
    if (!str) return 0;
    const cleaned = str.replace(/\./g, "").replace(/,/g, ".");
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  }
  
  getNumericResult(): number {
    return this.parseValue(this.displayValue);
  }

  private calculate(left: number, op: string, right: number): number {
    switch (op) {
      case "+": return left + right;
      case "−": return left - right;
      case "×": return left * right;
      case "÷": return right !== 0 ? left / right : 0;
      default: return right;
    }
  }

  private formatDisplay(value: number): string {
    if (Number.isInteger(value) && Math.abs(value) < 1e15) {
      return value.toLocaleString("es-VE");
    }
    const str = value.toFixed(10).replace(/\.?0+$/, "");
    const parts = str.split(".");
    const intPart = parseInt(parts[0]).toLocaleString("es-VE");
    return parts.length > 1 ? `${intPart},${parts[1]}` : intPart;
  }

  inputDigit(digit: string) {
    if (this.waitingForOperand) {
      this.displayValue = digit;
      this.waitingForOperand = false;
    } else {
      if (this.displayValue === "0" && digit !== "0") {
        this.displayValue = digit;
      } else if (this.displayValue !== "0") {
        // Concatenar el dígito quitando los puntos de miles temporalmente
        const raw = this.displayValue.replace(/\./g, "") + digit;
        // Si hay coma, no volvemos a formatear la parte entera para evitar dañar los decimales
        if (raw.includes(",")) {
          this.displayValue = this.displayValue + digit;
          return;
        } else {
          this.displayValue = raw;
        }
      }
    }
    
    // Si no hay coma decimal, re-formateamos los miles
    if (!this.displayValue.includes(",")) {
      const raw = this.displayValue.replace(/\./g, "");
      const num = parseInt(raw);
      if (!isNaN(num)) this.displayValue = num.toLocaleString("es-VE");
    }
  }

  inputDot() {
    if (this.waitingForOperand) {
      this.displayValue = "0,";
      this.waitingForOperand = false;
      return;
    }
    if (!this.displayValue.includes(",")) {
      this.displayValue = this.displayValue + ",";
    }
  }

  inputOperator(op: string) {
    const current = this.parseValue(this.displayValue);
    if (this.pendingOperator && !this.waitingForOperand) {
      const result = this.calculate(this.pendingValue, this.pendingOperator, current);
      this.pendingValue = result;
      this.displayValue = this.formatDisplay(result);
      this.expressionParts = [this.formatDisplay(result), op];
    } else {
      if (this.waitingForOperand && this.pendingOperator) {
        // Swap operator
        this.expressionParts[this.expressionParts.length - 1] = op;
        this.pendingOperator = op;
        return;
      }
      this.pendingValue = current;
      this.expressionParts = [this.displayValue, op];
    }
    this.pendingOperator = op;
    this.waitingForOperand = true;
  }

  inputEquals() {
    const current = this.parseValue(this.displayValue);
    if (this.pendingOperator) {
      const result = this.calculate(this.pendingValue, this.pendingOperator, current);
      this.expressionParts = [...this.expressionParts];
      if (!this.waitingForOperand) {
        this.expressionParts.push(this.displayValue);
      }
      this.expressionParts.push("=");
      this.displayValue = this.formatDisplay(result);
      this.lastResult = result;
      this.pendingOperator = null;
      this.pendingValue = 0;
      this.waitingForOperand = true;
    }
  }

  inputPercent() {
    const current = this.parseValue(this.displayValue);
    if (this.pendingOperator && (this.pendingOperator === "+" || this.pendingOperator === "−")) {
      const pct = this.pendingValue * (current / 100);
      this.displayValue = this.formatDisplay(pct);
    } else {
      this.displayValue = this.formatDisplay(current / 100);
    }
    this.waitingForOperand = false;
  }

  toggleSign() {
    const value = this.parseValue(this.displayValue);
    if (value !== 0) {
      this.displayValue = this.formatDisplay(-value);
    }
  }

  backspace() {
    if (this.waitingForOperand) return;
    const raw = this.displayValue.replace(/\./g, ""); // Quitar miles para borrar
    if (raw.length <= 1 || (raw.length === 2 && raw.startsWith("-"))) {
      this.displayValue = "0";
      this.waitingForOperand = true;
    } else {
      const newRaw = raw.slice(0, -1);
      if (!newRaw.includes(",")) {
        const num = parseInt(newRaw);
        this.displayValue = isNaN(num) ? "0" : num.toLocaleString("es-VE");
      } else {
        // Re-agregar puntos de miles a la parte entera si tiene decimales
        const parts = newRaw.split(",");
        const intPart = parseInt(parts[0]);
        const formattedInt = isNaN(intPart) ? "0" : intPart.toLocaleString("es-VE");
        this.displayValue = parts.length > 1 ? `${formattedInt},${parts[1]}` : formattedInt;
      }
    }
  }
}

// Equivalencias en divisas
const EquivalencePanel = ({ valueBs, rates }: { valueBs: number; rates: BcvRates | null }) => {
  if (!rates || valueBs <= 0) return null;
  const equivs = [
    { symbol: "$", code: "USD", value: rates.USD > 0 ? valueBs / rates.USD : 0, color: "#4bb462" },
    { symbol: "€", code: "EUR", value: rates.EUR > 0 ? valueBs / rates.EUR : 0, color: G.euro },
    { symbol: "₮", code: "USDT", value: rates.USDT > 0 ? valueBs / rates.USDT : 0, color: G.usdt },
  ].filter(e => e.value > 0);
  if (equivs.length === 0) return null;

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, marginBottom: 4 }}>
      {equivs.map(e => (
        <View key={e.code} style={{ flexDirection: "row", alignItems: "center", backgroundColor: e.color + "14", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: e.color + "25" }}>
          <Text style={{ color: e.color, fontSize: 13, fontWeight: "800", marginRight: 4 }}>≈ {e.symbol}{e.value.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={{ color: e.color + "99", fontSize: 10, fontWeight: "700" }}>{e.code}</Text>
        </View>
      ))}
    </View>
  );
};

// Componente de la pestaña Pago Mixto
const MixedPaymentTab = ({ rates }: { rates: BcvRates | null }) => {
  const [total, setTotal] = useState("");
  const [cash, setCash] = useState("");
  const [totalCurrency, setTotalCurrency] = useState<"USD" | "EUR">("USD");
  const [cashCurrency, setCashCurrency] = useState<"USD" | "EUR">("USD");

  const remainingBs = useMemo(() => {
    if (!rates) return 0;
    const t = parseFloat(total || "0");
    const c = parseFloat(cash || "0");
    const tRate = totalCurrency === "USD" ? rates.USD : rates.EUR;
    const cRate = cashCurrency === "USD" ? rates.USD : rates.EUR;
    return Math.max(0, t * tRate - c * cRate);
  }, [total, cash, totalCurrency, cashCurrency, rates]);

  const equivalences = useMemo(() => {
    if (!rates || remainingBs <= 0) return [];
    return [
      { label: "USD", value: rates.USD > 0 ? remainingBs / rates.USD : 0, symbol: "$", color: "#4bb462" },
      { label: "EUR", value: rates.EUR > 0 ? remainingBs / rates.EUR : 0, symbol: "€", color: G.euro },
      { label: "USDT", value: rates.USDT > 0 ? remainingBs / rates.USDT : 0, symbol: "₮", color: G.usdt },
    ].filter(e => e.value > 0);
  }, [remainingBs, rates]);

  const CurrencyToggle = ({ value, onChange }: { value: "USD" | "EUR"; onChange: (v: "USD" | "EUR") => void }) => (
    <View style={{ flexDirection: "row", borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: G.bg500 }}>
      {(["USD", "EUR"] as const).map(c => (
        <TouchableOpacity
          key={c}
          onPress={() => onChange(c)}
          style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: value === c ? G.p100 + "25" : G.bg300 }}
        >
          <Text style={{ color: value === c ? G.p200 : G.t400, fontSize: 12, fontWeight: "800" }}>{c}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={{ paddingHorizontal: 4 }}>
      {/* Total */}
      <View style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={{ color: G.t300, fontSize: 13, fontWeight: "600" }}>Total de la compra</Text>
          <CurrencyToggle value={totalCurrency} onChange={setTotalCurrency} />
        </View>
        <TextInput
          style={styles.mixedInput}
          value={total}
          onChangeText={t => setTotal(t.replace(/[^0-9.]/g, ""))}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={G.t400}
        />
      </View>

      {/* Efectivo entregado */}
      <View style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={{ color: G.t300, fontSize: 13, fontWeight: "600" }}>Efectivo entregado</Text>
          <CurrencyToggle value={cashCurrency} onChange={setCashCurrency} />
        </View>
        <TextInput
          style={styles.mixedInput}
          value={cash}
          onChangeText={c => setCash(c.replace(/[^0-9.]/g, ""))}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={G.t400}
        />
      </View>

      {/* Resultado */}
      <View style={{ backgroundColor: G.bg100, borderRadius: 20, padding: 20, borderWidth: 1.5, borderColor: G.p200 + "30", alignItems: "center" }}>
        <Text style={{ color: G.t400, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Restante a pagar</Text>
        <Text style={{ color: G.p200, fontSize: 32, fontWeight: "800" }}>Bs {remainingBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        {equivalences.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, justifyContent: "center" }}>
            {equivalences.map(e => (
              <View key={e.label} style={{ flexDirection: "row", alignItems: "center", backgroundColor: e.color + "14", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: e.color + "25" }}>
                <Text style={{ color: e.color, fontSize: 12, fontWeight: "700" }}>≈ {e.symbol}{e.value.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {e.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Botón limpiar */}
      <TouchableOpacity
        onPress={() => { setTotal(""); setCash(""); }}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, paddingVertical: 10, backgroundColor: G.bg300, borderRadius: 14, borderWidth: 1, borderColor: G.bg500 }}
      >
        <Ionicons name="trash-outline" size={16} color={G.t400} />
        <Text style={{ color: G.t400, fontSize: 13, fontWeight: "600" }}>Limpiar</Text>
      </TouchableOpacity>
    </View>
  );
};

// Modal unificado: Calculadora + Pago Mixto con tabs
const CalculatorModal = ({ visible, onClose, rates }: { visible: boolean; onClose: () => void; rates: BcvRates | null }) => {
  const [activeTab, setActiveTab] = useState<"calc" | "mixed">("calc");
  const [, forceUpdate] = useState(0);
  const engineRef = useRef(new CalcEngine());
  const slideAnim = useRef(new Animated.Value(800)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const tabIndicatorPos = useRef(new Animated.Value(0)).current;

  const engine = engineRef.current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      slideAnim.setValue(800);
      overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 12, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 800, duration: 280, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setMounted(false);
        engine.reset();
        forceUpdate(n => n + 1);
      });
    }
  }, [visible]);

  useEffect(() => {
    Animated.spring(tabIndicatorPos, {
      toValue: activeTab === "calc" ? 0 : 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  }, [activeTab]);

  const handlePress = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (key === "C") { engine.reset(); }
    else if (key === "⌫") { engine.backspace(); }
    else if (key === "±") { engine.toggleSign(); }
    else if (key === "%") { engine.inputPercent(); }
    else if (key === ".") { engine.inputDot(); }
    else if (["÷", "×", "−", "+"].includes(key)) { engine.inputOperator(key); }
    else if (key === "=") { engine.inputEquals(); }
    else { engine.inputDigit(key); }

    forceUpdate(n => n + 1);
  };

  const display = engine.getDisplay();
  const expression = engine.getExpression();
  const numericResult = engine.getNumericResult();

  // Adaptive font size
  const rawLen = display.replace(/,/g, "").length;
  const displayFontSize = rawLen > 12 ? 28 : rawLen > 9 ? 34 : rawLen > 7 ? 40 : 48;

  const keys = [
    ["C", "⌫", "%", "÷"],
    ["7", "8", "9", "×"],
    ["4", "5", "6", "−"],
    ["1", "2", "3", "+"],
    ["0", "0_wide", ".", "="],
  ];

  if (!mounted && !visible) return null;

  const tabIndicatorTranslate = tabIndicatorPos.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1], // Will be multiplied by width
  });

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.85)", opacity: overlayOpacity }} pointerEvents={visible ? "auto" : "none"}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View style={{ position: "absolute", bottom: 0, left: 0, right: 0, transform: [{ translateY: slideAnim }], backgroundColor: G.bg200, borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingBottom: 34, elevation: 24, maxHeight: "92%" }}>
        {/* Handle pill */}
        <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 4 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: G.bg500 }} />
        </View>

        {/* Header con tabs */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 }}>
          <View style={{ flex: 1, flexDirection: "row", backgroundColor: G.bg300, borderRadius: 14, padding: 3 }}>
            <TouchableOpacity
              onPress={() => setActiveTab("calc")}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: "center", backgroundColor: activeTab === "calc" ? G.bg100 : "transparent" }}
            >
              <Text style={{ color: activeTab === "calc" ? G.t100 : G.t400, fontSize: 13, fontWeight: "700" }}>Calculadora</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("mixed")}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: "center", backgroundColor: activeTab === "mixed" ? G.bg100 : "transparent" }}
            >
              <Text style={{ color: activeTab === "mixed" ? G.t100 : G.t400, fontSize: 13, fontWeight: "700" }}>Pago Mixto</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={onClose} style={{ marginLeft: 12, padding: 4 }}>
            <Ionicons name="close-circle" size={28} color={G.t400} />
          </TouchableOpacity>
        </View>

        {activeTab === "calc" ? (
          <View style={{ paddingHorizontal: 20 }}>
            {/* Display */}
            <View style={{ backgroundColor: G.bg100, borderRadius: 22, padding: 20, marginBottom: 6, alignItems: "flex-end", borderWidth: 1, borderColor: G.bg400 }}>
              <Text style={{ color: G.t400, fontSize: 15, minHeight: 20, fontWeight: "500" }} numberOfLines={1}>{expression || " "}</Text>
              <Text style={{ color: G.t100, fontSize: displayFontSize, fontWeight: "800", marginTop: 4 }} numberOfLines={1} adjustsFontSizeToFit>{display}</Text>
            </View>

            {/* Equivalencias */}
            <EquivalencePanel valueBs={numericResult} rates={rates} />

            {/* Teclado */}
            <View style={{ gap: 10, marginTop: 8 }}>
              {keys.map((row, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 10 }}>
                  {row.map((k, j) => {
                    if (k === "0_wide") return null; // El 0 ya ocupa doble
                    const isZero = k === "0" && i === 4;
                    const isNum = /[0-9]/.test(k) || k === ".";
                    const isOp = ["÷", "×", "−", "+"].includes(k);
                    const isEquals = k === "=";
                    const isFunc = ["C", "±", "%"].includes(k);
                    const isBksp = k === "⌫";

                    let bg = G.bg300;
                    let textColor = G.t100;
                    if (isOp) { bg = G.p100 + "20"; textColor = G.p200; }
                    if (isEquals) { bg = G.p200; textColor = G.bg100; }
                    if (isFunc) { bg = G.bg400; textColor = G.t200; }
                    if (isBksp) { bg = G.bg400; textColor = G.t300; }

                    return (
                      <TouchableOpacity
                        key={j}
                        activeOpacity={0.6}
                        style={{
                          flex: isZero ? 2.1 : 1,
                          height: 58,
                          backgroundColor: bg,
                          borderRadius: isEquals ? 18 : 16,
                          justifyContent: "center",
                          alignItems: isZero ? "flex-start" : "center",
                          paddingLeft: isZero ? 24 : 0,
                          borderWidth: isEquals ? 0 : 1,
                          borderColor: G.bg500,
                          ...(isEquals && {
                            shadowColor: G.p200,
                            shadowOpacity: 0.35,
                            shadowRadius: 8,
                            shadowOffset: { width: 0, height: 3 },
                            elevation: 6,
                          }),
                        }}
                        onPress={() => handlePress(k)}
                      >
                        {isBksp ? (
                          <Ionicons name="backspace-outline" size={24} color={textColor} />
                        ) : (
                          <Text style={{ color: textColor, fontSize: isEquals ? 28 : 22, fontWeight: isEquals ? "900" : "700" }}>{k}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        ) : (
          <ScrollView style={{ paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <MixedPaymentTab rates={rates} />
          </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
};

// ─── PANTALLA PRINCIPAL ─────────────────────────────────────
export default function HomeScreen({ navigation }: any) {
  const [amount, setAmount] = useState("1");
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>("USD");
  const [toCurrency, setToCurrency] = useState<CurrencyCode>("VES");
  const [swapRotation, setSwapRotation] = useState(0);
  const [rates, setRates] = useState<BcvRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [successToastVisible, setSuccessToastVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [fabLoading, setFabLoading] = useState(false);

  const [notificationsOn, setNotificationsOn] = useState(false);
  const [usdtAlertsOn, setUsdtAlertsOn] = useState(false);
  const [calcVisible, setCalcVisible] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);

  // Cargar estado de alertas USDT y BCV al montar
  useEffect(() => {
    areUsdtAlertsActive().then(setUsdtAlertsOn);
    areDailyNotificationsScheduled().then(setNotificationsOn);
  }, []);

  const toggleUsdtAlerts = async () => {
    try {
      if (usdtAlertsOn) {
        await cancelUsdtAlerts();
        setUsdtAlertsOn(false);
        setSuccessMessage("Alertas USDT desactivadas");
      } else {
        await scheduleUsdtAlerts();
        setUsdtAlertsOn(true);
        setSuccessMessage("Alertas USDT activadas, recibirás notificaciones cuando cambie el precio");
      }
      setSuccessToastVisible(true);
    } catch (e) {
      console.log("Error toggling USDT alerts:", e);
    }
  };

  const toggleBcvNotifications = async () => {
    try {
      if (notificationsOn) {
        await cancelDailyNotifications();
        setNotificationsOn(false);
        setSuccessMessage("Notificaciones BCV desactivadas");
      } else {
        await scheduleDailyRateNotifications();
        setNotificationsOn(true);
        setSuccessMessage("Notificaciones BCV activadas — recibirás tasas a las 8am y 2pm");
      }
      setSuccessToastVisible(true);
    } catch (e) {
      console.log("Error toggling BCV notifications:", e);
    }
  };

  // ── MODO HISTÓRICO ──────────────────────────────────────────
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [historicalDate, setHistoricalDate] = useState<string | null>(null);
  const [historicalRates, setHistoricalRates] = useState<BcvRates | null>(null);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [historicalError, setHistoricalError] = useState<string | null>(null);
  // resolvedDate: fecha real consultada (lunes siguiente si el usuario eligió sábado/domingo)
  const [resolvedDate, setResolvedDate] = useState<string | null>(null);

  // activeRates: usa históricas si hay fecha seleccionada, sino las en vivo
  const activeRates =
    historicalDate && historicalRates ? historicalRates : rates;
  const isHistoricalMode = !!historicalDate && !!historicalRates;

  const showUsdt = !isHistoricalMode || (historicalDate && new Date(historicalDate + "T12:00:00") >= new Date("2026-01-24T00:00:00") && (activeRates?.USDT ?? 0) > 0);
  const availableCurrencies = CURRENCIES.filter(c => c !== "USDT" || showUsdt);

  useEffect(() => {
    if (!showUsdt) {
      if (fromCurrency === "USDT") setFromCurrency("USD");
      if (toCurrency === "USDT") setToCurrency("VES");
    }
  }, [showUsdt]);

  // Ref para captura de pantalla (exportar JPG)
  const resultBoxRef = useRef<View>(null);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedFrom = await AsyncStorage.getItem("fromCurrency");
        const savedTo = await AsyncStorage.getItem("toCurrency");
        if (savedFrom) setFromCurrency(JSON.parse(savedFrom));
        if (savedTo) setToCurrency(JSON.parse(savedTo));
      } catch (error) {
        console.log("Error loading preferences:", error);
      }
    };
    loadPreferences();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("fromCurrency", JSON.stringify(fromCurrency));
  }, [fromCurrency]);

  useEffect(() => {
    AsyncStorage.setItem("toCurrency", JSON.stringify(toCurrency));
  }, [toCurrency]);

  const loadRates = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const result = await bcvApiService.fetchExchangeRates();
      setRates(result.rates);
      if (result.rates?.USDT > 0) historyService.appendUsdtEntry(result.rates.USDT).catch(() => {}); if (result.rates?.lastUpdated) {
        setLastUpdate(result.rates.lastUpdated);
      } else {
        setLastUpdate(new Date().toLocaleTimeString());
      }
      if (result.error) setError(result.error);
      // Check USDT movement for alerts (non-blocking)
      if (result.rates?.USDT > 0) {
        checkUsdtMovement(result.rates.USDT).catch(() => {});
        historyService.appendUsdtEntry(result.rates.USDT).catch(() => {});
      }
    } catch (err) {
      setError("Error al cargar las tasas");
      console.log("Error loading rates:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
    const interval = setInterval(() => loadRates(true), 300000);
    return () => clearInterval(interval);
  }, [loadRates]);

  // ── HANDLER FECHA HISTÓRICA ─────────────────────────────────

  // Dado un string "YYYY-MM-DD", devuelve el lunes siguiente si es sábado o domingo
  const resolveToWeekday = (
    dateStr: string,
  ): { resolved: string; wasWeekend: boolean } => {
    const d = new Date(dateStr + "T12:00:00");
    const dow = d.getDay(); // 0=Dom, 6=Sáb
    if (dow === 6) {
      // Sábado → lunes (+2)
      d.setDate(d.getDate() + 2);
    } else if (dow === 0) {
      // Domingo → lunes (+1)
      d.setDate(d.getDate() + 1);
    } else {
      return { resolved: dateStr, wasWeekend: false };
    }
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return { resolved: `${d.getFullYear()}-${mm}-${dd}`, wasWeekend: true };
  };

  const handleSelectDate = async (dateStr: string) => {
    try {
      setHistoricalLoading(true);
      setHistoricalError(null);

      const { resolved, wasWeekend } = resolveToWeekday(dateStr);

      setHistoricalDate(dateStr); // fecha que el usuario eligió (para mostrar en banner)
      setResolvedDate(resolved); // fecha real consultada en la API

      const histList = await bcvApiService.fetchHistoricalRates(
        resolved,
        resolved,
      );

      if (!histList || histList.length === 0) {
        // Feriado bancario en la fecha resuelta
        setHistoricalError(
          "Día feriado bancario sin tasa BCV. Elige otro día.",
        );
        setHistoricalRates(null);
        setHistoricalDate(null);
        setResolvedDate(null);
        return;
      }

      const hist = histList[0];
      const [y, m] = dateStr.split("-").map(Number); // Fetch the month for the un-resolved date
      const historyMonth = await historyService.getHistory(y, m);
      const usdtSnap = historyMonth.find(s => s.date === dateStr);
      const historicalUSDT = usdtSnap?.usdt || 0; // No fallback to live rates

      const converted = bcvApiService.historicalToBcvRates(hist, historicalUSDT);

      // Si fue fin de semana, anotamos en lastUpdated la fecha real para el banner
      if (wasWeekend) {
        const resolvedDisplay = new Date(
          resolved + "T12:00:00",
        ).toLocaleDateString("es-VE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        converted.lastUpdated = resolvedDisplay;
      }

      setHistoricalRates(converted);
      setCalendarVisible(false);
    } catch (err) {
      setHistoricalError("Error de conexión. Intenta de nuevo.");
      setHistoricalRates(null);
      setHistoricalDate(null);
      setResolvedDate(null);
    } finally {
      setHistoricalLoading(false);
    }
  };

  const handleClearHistorical = () => {
    setHistoricalDate(null);
    setHistoricalRates(null);
    setHistoricalError(null);
    setResolvedDate(null);
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const result = await bcvApiService.refreshRates();
      setRates(result.rates);
      if (result.rates?.USDT > 0) historyService.appendUsdtEntry(result.rates.USDT).catch(() => {}); if (result.rates?.lastUpdated) {
        setLastUpdate(result.rates.lastUpdated);
      }
      if (result.error) {
        setError(result.error);
      } else {
        setSuccessMessage("Tasas actualizadas correctamente");
        setSuccessToastVisible(true);
      }
    } catch (err) {
      setError("No se pudo actualizar");
    } finally {
      setRefreshing(false);
    }
  };

  const usdtReady = !(
    (fromCurrency === "USDT" || toCurrency === "USDT") &&
    (activeRates?.USDT ?? 0) === 0
  );

  const conversion = (() => {
    if (!activeRates || !usdtReady || !amount || parseFloat(amount) === 0)
      return "0.00";
    try {
      return bcvApiService.convertAmount(
        amount,
        fromCurrency,
        toCurrency,
        activeRates,
      );
    } catch (err) {
      console.log("Conversion error:", err);
      return "—";
    }
  })();

  const convRate = (() => {
    if (!activeRates || !usdtReady) return null;
    try {
      return bcvApiService.getConversionRate(
        fromCurrency,
        toCurrency,
        activeRates,
      );
    } catch (err) {
      return null;
    }
  })();

  const fromCfg = CURRENCY_CONFIG[fromCurrency];
  const toCfg = CURRENCY_CONFIG[toCurrency];

  const clearInput = () => {
    setAmount("");
    inputRef.current?.focus();
  };

  const formatNumber = (num: string) => {
    if (!num || num === "—") return "0";
    const value = parseFloat(num);
    if (isNaN(value)) return "0";
    return value.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ─── ACCIONES DEL FAB ─────────────────────────────────────

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setSuccessToastVisible(true);
  };

  const handleCopy = async () => {
    // Solo el número limpio — listo para pegar directamente en un banco
    const rawNumber = parseFloat(conversion).toFixed(2);
    await Clipboard.setStringAsync(rawNumber);
    showToast("Monto copiado al portapapeles");
  };

  const handleShare = async () => {
    try {
      const msg = buildShareMessage(
        amount,
        fromCurrency,
        toCurrency,
        conversion,
        convRate,
        formatNumber,
      );
      // Share nativo de RN — abre el sheet del OS como texto plano (WhatsApp, Telegram, etc.)
      const { Share } = require("react-native");
      await Share.share({
        message: msg,
        title: "Conversión de divisas — FinanzasIA",
      });
    } catch (err) {
      console.log("Share error:", err);
      Alert.alert("Error", "No se pudo compartir el resultado.");
    }
  };

  const handleExportPdf = async () => {
    try {
      setFabLoading(true);
      if (!resultBoxRef.current) {
        Alert.alert("Error", "No se pudo capturar el resultado.");
        return;
      }
      // 1. Capturar como archivo temporal (más confiable que result:"base64" en Expo Go)
      const tmpUri = await captureRef(resultBoxRef, {
        format: "jpg",
        quality: 0.97,
        result: "tmpfile",
      });
      // 2. Leer el archivo como base64 via fetch (no requiere expo-file-system)
      const response = await fetch(tmpUri);
      const blob = await response.blob();
      const imgBase64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          // Extraer solo el base64 sin el prefijo "data:image/jpeg;base64,"
          resolve(dataUrl.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      // 3. Embeber la imagen en HTML y generar PDF con nombre Conversion.pdf
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0d0d0d;
      display: flex;
      justify-content: center;
      padding: 32px 24px;
    }
    img {
      width: 100%;
      max-width: 480px;
      border-radius: 26px;
      display: block;
    }
  </style>
</head>
<body>
  <img src="data:image/jpeg;base64,${imgBase64}" />
</body>
</html>`;
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      // Renombrar a Conversion.pdf usando expo-sharing directamente
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Exportar como PDF",
        UTI: "com.adobe.pdf",
        // El nombre del archivo lo pone el sistema al guardar
      });
    } catch (err) {
      console.log("PDF export error:", err);
      Alert.alert("Error", "No se pudo exportar el PDF.");
    } finally {
      setFabLoading(false);
    }
  };

  const handleExportJpg = async () => {
    try {
      setFabLoading(true);
      if (!resultBoxRef.current) {
        Alert.alert("Error", "No se pudo capturar el resultado.");
        return;
      }
      // captureRef con result:"tmpfile" ya devuelve una URI de archivo temporal
      // lista para compartir — no necesitamos copiarla con expo-file-system
      const uri = await captureRef(resultBoxRef, {
        format: "jpg",
        quality: 0.97,
        result: "tmpfile",
      });
      await Sharing.shareAsync(uri, {
        mimeType: "image/jpeg",
        dialogTitle: "Exportar como imagen",
        UTI: "public.jpeg",
      });
    } catch (err) {
      console.log("JPG export error:", err);
      Alert.alert("Error", "No se pudo exportar la imagen.");
    } finally {
      setFabLoading(false);
    }
  };

  const hasResult =
    !loading && conversion !== "0.00" && conversion !== "—" && usdtReady;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={G.bg100} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={G.p200}
            colors={[G.p200]}
          />
        }
      >
        {/* HEADER */}
        <FadeSlide style={styles.header}>
          <View style={styles.brandRow}>
            {/* Menu Button */}
            <TouchableOpacity onPress={() => (navigation as any).openDrawer()} style={{ paddingRight: 12 }}>
              <Ionicons name="menu" size={32} color={G.p200} />
            </TouchableOpacity>
            
            <Image source={require("../../assets/icon.png")} style={{ width: 34, height: 34, borderRadius: 8, marginRight: 8 }} resizeMode="contain" />
            <View>
              <Text style={styles.brandName}>FinanzasIA</Text>
              <View style={styles.brandTagRow}>
                <View
                  style={[
                    styles.liveIndicator,
                    {
                      backgroundColor: isHistoricalMode ? G.warning : G.glow,
                      shadowColor: isHistoricalMode ? G.warning : G.glow,
                      shadowOpacity: 0.9,
                      shadowRadius: 6,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.brandTag,
                    { color: isHistoricalMode ? G.warning : G.p200 },
                  ]}
                >
                  {isHistoricalMode ? "Tasa histórica" : "Tasas en vivo"}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            {/* Botón calendario */}
            <TouchableOpacity onPress={() => setCalendarVisible(true)} style={styles.refreshBtn}>
              <Ionicons name="calendar-outline" size={20} color={G.p200} />
            </TouchableOpacity>

            {/* Menú de Notificaciones */}
            <View>
              
              
              <Modal visible={notifMenuOpen} transparent animationType="fade" onRequestClose={() => setNotifMenuOpen(false)}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => setNotifMenuOpen(false)} activeOpacity={1}>
                  <View style={{ position: "absolute", top: 80, right: 20, backgroundColor: G.bg200, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: G.bg400, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10, width: 220, gap: 12 }}>
                    
                    {/* Toggle BCV */}
                    <TouchableOpacity
                      onPress={() => {
                        toggleBcvNotifications();
                        setNotifMenuOpen(false);
                      }}
                      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Ionicons name="calendar-outline" size={18} color={G.t300} />
                        <Text style={{ color: G.t100, fontSize: 13, fontWeight: "600" }}>Tasas BCV Diarias</Text>
                      </View>
                      <AnimatedSwitch active={notificationsOn} activeColor={G.p200} />
                    </TouchableOpacity>

                    {/* Separador */}
                    <View style={{ height: 1, backgroundColor: G.bg400 }} />

                    {/* Toggle USDT */}
                    <TouchableOpacity
                      onPress={() => {
                        toggleUsdtAlerts();
                        setNotifMenuOpen(false);
                      }}
                      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Ionicons name="pulse" size={18} color={G.usdt} />
                        <Text style={{ color: G.t100, fontSize: 13, fontWeight: "600" }}>Alertas USDT</Text>
                      </View>
                      <AnimatedSwitch active={usdtAlertsOn} activeColor={G.usdt} />
                    </TouchableOpacity>

                  </View>
                </TouchableOpacity>
              </Modal>
            </View>

            {/* Botón refresh (oculto en modo histórico) */}
            {!isHistoricalMode && (
              <TouchableOpacity
                style={[
                  styles.refreshBtn,
                  refreshing && { borderColor: G.p200 },
                ]}
                onPress={handleRefresh}
                disabled={refreshing || loading}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={G.p200} />
                ) : (
                  <Ionicons name="refresh" size={20} color={G.p200} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </FadeSlide>

        {/* BANNER MODO HISTÓRICO */}
        {isHistoricalMode && (
          <FadeSlide delay={0}>
            <View style={styles.historicalBanner}>
              {/* Fila superior: ícono + textos */}
              <View style={styles.historicalBannerLeft}>
                <View style={styles.historicalBannerIconWrap}>
                  <Ionicons name="time" size={20} color={G.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historicalBannerTitle}>
                    Modo histórico activo
                  </Text>
                  {/* Fecha seleccionada por el usuario */}
                  <Text style={styles.historicalBannerDate}>
                    {historicalDate
                      ? new Date(
                          historicalDate + "T12:00:00",
                        ).toLocaleDateString("es-VE", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : ""}
                  </Text>
                  {/* Nota de resolución fin de semana */}
                  {resolvedDate && resolvedDate !== historicalDate && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 4,
                      }}
                    >
                      <Ionicons
                        name="arrow-forward"
                        size={11}
                        color={G.warning + "cc"}
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          color: G.warning + "cc",
                          fontWeight: "600",
                        }}
                      >
                        {"Usando tasa del "}
                        {new Date(
                          resolvedDate + "T12:00:00",
                        ).toLocaleDateString("es-VE", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Botón grande abajo */}
              <TouchableOpacity
                onPress={handleClearHistorical}
                style={styles.historicalBannerClose}
                activeOpacity={0.75}
              >
                <Ionicons name="radio-button-on" size={16} color={G.bg100} />
                <Text style={styles.historicalBannerCloseText}>
                  Volver a tasas en vivo
                </Text>
              </TouchableOpacity>
            </View>
          </FadeSlide>
        )}

        {/* TIMESTAMP Y ESTADO */}
        <FadeSlide delay={50} style={styles.statusRow}>
          <View style={styles.statusLeft}>
            <Ionicons name="time-outline" size={14} color={G.t400} />
            <Text style={styles.timestamp}>
              {isHistoricalMode
                ? `Tasa del ${activeRates?.lastUpdated ?? ""}`
                : lastUpdate
                  ? `Actualizado ${lastUpdate}`
                  : "Cargando..."}
            </Text>
          </View>
          {activeRates && (
            <View style={styles.statusRight}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isHistoricalMode ? G.warning : G.glow,
                    shadowColor: isHistoricalMode ? G.warning : G.glow,
                    shadowOpacity: 0.9,
                    shadowRadius: 4,
                  },
                ]}
              />
              <Text style={styles.statusText}>
                {isHistoricalMode ? "Histórico" : "En vivo"}
              </Text>
            </View>
          )}
        </FadeSlide>

        {/* ERROR BANNER */}
        {error && (
          <FadeSlide delay={70}>
            <View style={styles.errorBanner}>
              <Ionicons name="warning-outline" size={18} color={G.warning} />
              <Text style={styles.errorMsg}>{error}</Text>
              <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          </FadeSlide>
        )}

        {/* CARD CONVERSOR */}
        <FadeSlide delay={90} style={styles.conversorCard}>
          <Text style={styles.sectionLabel}>Convertir de</Text>
          <View style={styles.pillsRow}>
            {availableCurrencies.map((c) => (
              <CurrencyPill
                key={c}
                currency={c}
                selected={fromCurrency === c}
                onPress={() => setFromCurrency(c)}
              />
            ))}
          </View>

          {/* INPUT */}
          <View
            style={[styles.amountRow, { borderColor: fromCfg.color + "40" }]}
          >
            <View
              style={[
                styles.symbolOrb,
                { backgroundColor: fromCfg.color + "12" },
              ]}
            >
              <Text style={[styles.symbolChar, { color: fromCfg.color }]}>
                {fromCfg.symbol}
              </Text>
            </View>

            <TextInput
              ref={inputRef}
              style={[styles.amountField, { color: fromCfg.color }]}
              value={amount}
              onChangeText={(t) => {
                const cleaned = t.replace(/[^0-9.]/g, "");
                const parts = cleaned.split(".");
                if (parts.length > 2) return;
                setAmount(cleaned);
              }}
              onFocus={() => setAmount("")}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={G.t400}
              selectionColor={fromCfg.color}
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="done"
            />

            {amount.length > 0 && (
              <TouchableOpacity onPress={clearInput} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={20} color={G.t400} />
              </TouchableOpacity>
            )}

            <View
              style={[
                styles.currBadge,
                { backgroundColor: fromCfg.color + "12" },
              ]}
            >
              <Text style={[styles.currBadgeText, { color: fromCfg.color }]}>
                {fromCurrency}
              </Text>
            </View>
          </View>

          {/* INDICADOR DE EQUIVALENCIA */}
          {convRate && (
            <View style={styles.equivRow}>
              <Ionicons name="swap-horizontal" size={14} color={G.t400} />
              <Text style={styles.equivText}>
                1 {fromCurrency} ≈ {formatNumber(convRate)} {toCurrency}
              </Text>
            </View>
          )}

          {/* SWAP BUTTON */}
          <View style={styles.swapRow}>
            <View style={styles.swapDivider} />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setFromCurrency(toCurrency);
                setToCurrency(fromCurrency);
                setSwapRotation((r) => r + 180);
              }}
            >
              <MotiView
                animate={{ rotate: `${swapRotation}deg` }}
                transition={{ type: "spring", damping: 14 }}
                style={[styles.swapBtn, { borderColor: G.p200 + "45", backgroundColor: G.bg200 }]}
              >
                <Ionicons name="swap-vertical" size={22} color={G.p200} />
              </MotiView>
            </TouchableOpacity>
            <View style={styles.swapDivider} />
          </View>

          <Text style={styles.sectionLabel}>Convertir a</Text>
          <View style={styles.pillsRow}>
            {availableCurrencies.map((c) => (
              <CurrencyPill
                key={c}
                currency={c}
                selected={toCurrency === c}
                onPress={() => setToCurrency(c)}
              />
            ))}
          </View>

          {/* RESULTADO */}
          <View style={styles.resultDivider} />

          {/* Result box con ref para captura JPG */}
          <View
            ref={resultBoxRef}
            collapsable={false}
            style={[styles.resultBox, { borderColor: toCfg.color + "30" }]}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={G.p200} />
                <Text style={styles.loadingText}>Calculando...</Text>
              </View>
            ) : (
              <>
                <CurrencyIcon currency={toCurrency} size={70} />
                <Text style={styles.resultEyebrow}>RESULTADO</Text>
                <TouchableOpacity
                  onLongPress={handleCopy}
                  delayLongPress={350}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.resultNumber, { color: toCfg.color }]}>
                    {formatNumber(conversion)}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.resultCurrName, { color: toCfg.color }]}>
                  {toCfg.label} · {toCurrency}
                </Text>

                {convRate && (
                  <View style={styles.conversionDetail}>
                    <Text style={styles.detailText}>
                      {amount || "1"} {fromCurrency} × {formatNumber(convRate)}{" "}
                      = {formatNumber(conversion)} {toCurrency}
                    </Text>
                  </View>
                )}

                {!usdtReady && (
                  <View style={styles.warningContainer}>
                    <Ionicons name="alert-circle" size={16} color={G.warning} />
                    <Text style={styles.warningText}>
                      Precio USDT no disponible. Presiona actualizar.
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* FAB FUERA del resultBox — no tapa el contenido ni aparece en capturas */}
          {hasResult && !loading && (
            <View style={styles.fabAnchor}>
              {fabLoading && (
                <View style={styles.fabLoadingRow}>
                  <ActivityIndicator size="small" color={G.p200} />
                  <Text style={styles.fabLoadingText}>
                    Generando archivo...
                  </Text>
                </View>
              )}
              <ActionFab
                onCopy={handleCopy}
                onShare={handleShare}
                onExportPdf={handleExportPdf}
                onExportJpg={handleExportJpg}
                disabled={fabLoading}
              />
            </View>
          )}
        </FadeSlide>

        {/* TASAS DEL DÍA */}
        <FadeSlide delay={120}>
          <View style={styles.ratesHeader}>
            <Text style={styles.ratesTitle}>
              {isHistoricalMode ? "Tasas históricas" : "Tasas del día"}
            </Text>
            <View
              style={[
                styles.ratesBadge,
                isHistoricalMode && { backgroundColor: G.warning + "15" },
              ]}
            >
              <Ionicons
                name="time"
                size={12}
                color={isHistoricalMode ? G.warning : G.p200}
              />
              <Text
                style={[
                  styles.ratesBadgeText,
                  isHistoricalMode && { color: G.warning },
                ]}
              >
                {isHistoricalMode ? "BCV histórico" : "Tiempo real"}
              </Text>
            </View>
          </View>
        </FadeSlide>

        {/* Error histórico */}
        {historicalError && (
          <FadeSlide delay={0}>
            <View style={[styles.errorBanner, { marginBottom: 16 }]}>
              <Ionicons name="warning-outline" size={18} color={G.warning} />
              <Text style={styles.errorMsg}>{historicalError}</Text>
              <TouchableOpacity
                onPress={() => setHistoricalError(null)}
                style={styles.retryBtn}
              >
                <Text style={styles.retryText}>OK</Text>
              </TouchableOpacity>
            </View>
          </FadeSlide>
        )}

        {loading && !activeRates ? (
          <View style={styles.ratesLoading}>
            <ActivityIndicator size="large" color={G.p200} />
          </View>
        ) : activeRates ? (
          <View style={styles.ratesList}>
            <RateCard
              currency="USD"
              value={activeRates.USD}
              source={isHistoricalMode ? "BCV hist." : "BCV"}
              delay={150}
            />
            <RateCard
              currency="EUR"
              value={activeRates.EUR}
              source={isHistoricalMode ? "BCV hist." : "BCV"}
              delay={180}
            />
            {showUsdt && (
              <RateCard
                currency="USDT"
                value={activeRates.USDT}
                source={isHistoricalMode ? "Binance hist." : (activeRates.usdtSource || "Binance")}
                delay={210}
              />
            )}
          </View>
        ) : null}

        {/* FOOTER */}
        <FadeSlide delay={250}>
          <View style={styles.footer}>
            <Ionicons
              name="shield-checkmark-outline"
              size={14}
              color={G.t400}
            />
            <Text style={styles.footerText}>
              Datos BCV · Binance P2P · Actualización cada 5 min
            </Text>
          </View>
        </FadeSlide>

      </ScrollView>
      
      {/* BOTÓN FLOTANTE CALCULADORA (GLOBAL) */}
      <CalcFAB onPress={() => setCalcVisible(true)} />

      {/* TOAST SUPERIOR GRANDE */}
      <SuccessToast
        visible={successToastVisible}
        message={successMessage}
        onHide={() => setSuccessToastVisible(false)}
      />

      {/* CALENDARIO HISTÓRICO */}
      <CalendarModal
        visible={calendarVisible}
        onClose={() => {
          setCalendarVisible(false);
          setHistoricalError(null);
        }}
        onSelectDate={handleSelectDate}
        selectedDate={historicalDate}
        loading={historicalLoading}
        holidayError={historicalError}
      />
    
      <CalculatorModal visible={calcVisible} onClose={() => setCalcVisible(false)} rates={rates} />

    </SafeAreaView>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  calcFloatBtn: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  mixedInput: {
    height: 50,
    backgroundColor: G.bg100,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: G.t100,
    fontSize: 18,
    borderWidth: 1,
    borderColor: G.bg400,
  },

  safe: {
    flex: 1,
    backgroundColor: G.bg100,
  },
  scroll: {
    flex: 1,
    backgroundColor: G.bg100,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 40 : 20,
    paddingBottom: 30,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandOrb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: G.p100 + "18",
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  brandName: {
    fontSize: 24,
    fontWeight: "800",
    color: G.t100,
    letterSpacing: -0.5,
  },
  brandTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  brandTag: {
    fontSize: 12,
    fontWeight: "600",
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: G.bg300,
    borderWidth: 1.5,
    borderColor: G.bg400,
    justifyContent: "center",
    alignItems: "center",
  },

  // Status
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timestamp: {
    fontSize: 12,
    color: G.t400,
    fontWeight: "500",
  },
  statusRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    color: G.t400,
    fontWeight: "600",
  },

  // Error
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: G.warning + "12",
    borderWidth: 1,
    borderColor: G.warning + "28",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  errorMsg: {
    flex: 1,
    color: G.warning,
    fontSize: 13,
    fontWeight: "500",
  },
  retryBtn: {
    backgroundColor: G.warning + "22",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  retryText: {
    color: G.warning,
    fontSize: 12,
    fontWeight: "700",
  },

  // Conversor Card
  conversorCard: {
    backgroundColor: G.bg200,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: G.bg400,
    marginBottom: 24,
    shadowColor: G.p200,
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: G.t400,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  // Pills
  pillsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  currencyPill: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: G.bg300,
    borderWidth: 1.5,
    borderColor: "transparent",
    width: 72,
    height: 90,
    gap: 4,
  },
  pillCode: {
    fontSize: 13,
    fontWeight: "800",
    color: G.t200,
  },
  pillLabel: {
    fontSize: 9,
    color: G.t400,
    fontWeight: "600",
  },
  selectedDot: {
    display: "none",
  },

  // Input
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: G.bg100,
    borderRadius: 22,
    borderWidth: 1.5,
    minHeight: 70,
    maxHeight: 70,
    paddingVertical: 6,
  },
  symbolOrb: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    marginRight: 4,
  },
  symbolChar: {
    fontSize: 22,
    fontWeight: "700",
  },
  amountField: {
    flex: 1,
    fontSize: 34,
    maxHeight: 60,
    fontWeight: "700",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  clearBtn: {
    padding: 8,
  },
  currBadge: {
    marginRight: 12,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  currBadgeText: {
    fontSize: 14,
    fontWeight: "800",
  },

  // Equivalencia
  equivRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  equivText: {
    fontSize: 12,
    color: G.t400,
    fontWeight: "500",
  },

  // Swap
  swapRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },
  swapDivider: {
    flex: 1,
    height: 1,
    backgroundColor: G.bg400,
  },
  swapBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: G.p100 + "18",
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 12,
  },

  // Resultado
  resultDivider: {
    height: 1,
    backgroundColor: G.bg400,
    marginVertical: 20,
  },
  resultBox: {
    alignItems: "center",
    backgroundColor: G.bg100,
    borderRadius: 26,
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  loadingContainer: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: G.t400,
    fontWeight: "500",
  },
  resultEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: G.t400,
    letterSpacing: 2,
  },
  resultNumber: {
    fontSize: 54,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 60,
  },
  resultCurrName: {
    fontSize: 16,
    fontWeight: "600",
  },
  conversionDetail: {
    backgroundColor: G.bg300,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  detailText: {
    fontSize: 12,
    color: G.t400,
    fontWeight: "500",
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: G.warning + "10",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: G.warning,
    fontWeight: "500",
  },

  // FAB anchor — fuera del resultBox, no tapa contenido ni aparece en capturas
  fabAnchor: {
    width: "100%",
    alignItems: "flex-end",
    marginTop: 12,
    // Sin height fijo — el FAB flota sobre el contenido de abajo via zIndex
    zIndex: 50,
    overflow: "visible",
  },

  // FAB container
  fabContainer: {
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "visible",
  },

  // FAB principal
  fabMain: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    shadowColor: G.p200,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    overflow: "hidden",
  },
  fabMainInner: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  // FAB hijos
  fabChildWrap: {
    position: "absolute",
    bottom: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  fabChild: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: G.bg300,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  fabChildLabelWrap: {
    position: "absolute",
    right: 54,
    backgroundColor: G.bg400,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  fabChildLabel: {
    fontSize: 12,
    color: G.t200,
    fontWeight: "700",
  },

  // FAB hijo pequeño (sub-exportar)
  fabChildSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: G.bg300,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: G.p200,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  exportSubWrap: {
    position: "absolute",
    bottom: 0,
    right: 0,
    alignItems: "center",
  },
  exportSubLabel: {
    fontSize: 9,
    fontWeight: "800",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // FAB loading
  fabLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  fabLoadingText: {
    fontSize: 12,
    color: G.t400,
    fontWeight: "500",
  },

  // Tasas
  ratesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 4,
  },
  ratesTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: G.t100,
  },
  ratesBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: G.p100 + "12",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ratesBadgeText: {
    fontSize: 11,
    color: G.p200,
    fontWeight: "600",
  },
  ratesLoading: {
    paddingVertical: 50,
    alignItems: "center",
  },
  ratesList: {
    gap: 12,
    marginBottom: 24,
  },

  // Rate Card
  rateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: G.bg200,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: G.bg400,
    borderLeftWidth: 4,
    gap: 12,
  },
  rateCardInfo: {
    flex: 1,
  },
  rateCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  rateCardCode: {
    fontSize: 18,
    fontWeight: "800",
    color: G.t100,
  },
  sourcePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sourceDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  sourceLabel: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  rateCardDesc: {
    fontSize: 12,
    color: G.t400,
    fontWeight: "500",
  },
  rateCardValueBox: {
    alignItems: "flex-end",
  },
  rateCardValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  rateCardBs: {
    fontSize: 11,
    color: G.t400,
    fontWeight: "700",
    marginTop: -2,
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 11,
    color: G.t400,
    fontWeight: "500",
  },

  // Banner modo histórico
  historicalBanner: {
    flexDirection: "column",
    backgroundColor: G.warning + "12",
    borderWidth: 1,
    borderColor: G.warning + "40",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    marginBottom: 12,
    gap: 14,
  },
  historicalBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  historicalBannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: G.warning + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  historicalBannerTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: G.warning,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  historicalBannerDate: {
    fontSize: 14,
    fontWeight: "600",
    color: G.t100,
    textTransform: "capitalize",
  },
  historicalBannerClose: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: G.warning,
    borderRadius: 16,
    paddingVertical: 13,
    width: "100%",
    shadowColor: G.warning,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  historicalBannerCloseText: {
    fontSize: 14,
    fontWeight: "800",
    color: G.bg100,
    letterSpacing: 0.3,
  },

  // Toast
  toastContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 1000,
    elevation: 1000,
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: G.bg200,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: G.p200,
    shadowColor: G.p200,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
    width: "100%",
  },
  toastIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  toastTextContainer: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: G.t100,
    marginBottom: 4,
  },
  toastMessage: {
    fontSize: 14,
    color: G.t200,
    fontWeight: "500",
  },
});
