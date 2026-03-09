// src/screens/HomeScreen.tsx
// FinanzasAI — Paleta NEON Carbon Green
import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { bcvApiService, BcvRates, CurrencyCode } from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── PALETA NEON CARBON ──────────────────────────────────────
const G = {
  // Verdes neón
  p100: "#0dbf69", // turf-green-600 — acento principal
  p200: "#24db86", // turf-green-500 — neón brillante
  p300: "#7beab6", // turf-green-300 — suave
  p400: "#a0f8cd", // deep-forest-200 — highlight
  glow: "#11ee83", // deep-forest-500 — máximo neón

  // Fondos carbón
  bg100: "#0d0d0d", // negro carbón puro
  bg200: "#141414", // carbón oscuro
  bg300: "#1c1c1c", // carbón medio
  bg400: "#252525", // carbón claro
  bg500: "#2e2e2e", // borde sutil

  // Textos
  t100: "#f0fdf4", // blanco verdoso
  t200: "#d3f8e7", // turf-green-100
  t300: "#7beab6", // turf-green-300
  t400: "#3a5a47", // verde apagado

  // Estados
  warning: "#fbbf24",
  euro: "#3b9eff", // azul neón
  usdt: "#39c647", // forest-green-500 — verde neón alternativo
  ves: "#ff8c2a", // naranja neón
};

// ─── CONFIGURACIÓN ───────────────────────────────────────────
const USDT_LOGO = "https://cryptologos.cc/logos/tether-usdt-logo.png";

const CURRENCY_CONFIG: Record<
  CurrencyCode,
  {
    label: string;
    desc: string;
    symbol: string;
    color: string;
    flagAsset?: any;
    logoUrl?: string;
  }
> = {
  USD: {
    label: "Dólar",
    desc: "Dólar · BCV oficial",
    symbol: "$",
    color: "#4bb462", // emerald-500 — verde neón USD
    flagAsset: require("../../assets/flags/USA.png"),
  },
  EUR: {
    label: "Euro",
    desc: "Euro · BCV oficial",
    symbol: "€",
    color: G.euro,
    flagAsset: require("../../assets/flags/EU.png"),
  },
  USDT: {
    label: "Tether",
    desc: "USDT · Binance P2P",
    symbol: "₮",
    color: G.usdt,
    flagAsset: require("../../assets/flags/TT.png"),
  },
  VES: {
    label: "Bolívar",
    desc: "Bs. · Venezuela",
    symbol: "Bs",
    color: G.ves,
    flagAsset: require("../../assets/flags/VE.jpg"),
  },
};

const CURRENCIES: CurrencyCode[] = ["USD", "EUR", "USDT", "VES"];

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
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
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
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
  );
};

// ─── COMPONENTES DE MONEDA ───────────────────────────────────
const CurrencyIcon = ({
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
            backgroundColor: cfg.color + "18",
            borderColor: cfg.color,
            shadowColor: cfg.color,
            shadowOpacity: 0.45,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 0 },
            elevation: 10,
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
const RateCard = ({
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
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -150,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start(() => onHide());
      }, 2000);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
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

// ─── PANTALLA PRINCIPAL ─────────────────────────────────────
export default function HomeScreen() {
  const [amount, setAmount] = useState("1");
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>("USD");
  const [toCurrency, setToCurrency] = useState<CurrencyCode>("VES");
  const [rates, setRates] = useState<BcvRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [successToastVisible, setSuccessToastVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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
      if (result.rates?.lastUpdated) {
        setLastUpdate(result.rates.lastUpdated);
      } else {
        setLastUpdate(new Date().toLocaleTimeString());
      }
      if (result.error) setError(result.error);
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

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const result = await bcvApiService.refreshRates();
      setRates(result.rates);
      if (result.rates?.lastUpdated) {
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
    rates?.USDT === 0
  );

  const conversion = (() => {
    if (!rates || !usdtReady || !amount || parseFloat(amount) === 0)
      return "0.00";
    try {
      return bcvApiService.convertAmount(
        amount,
        fromCurrency,
        toCurrency,
        rates,
      );
    } catch (err) {
      console.log("Conversion error:", err);
      return "—";
    }
  })();

  const convRate = (() => {
    if (!rates || !usdtReady) return null;
    try {
      return bcvApiService.getConversionRate(fromCurrency, toCurrency, rates);
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
            <View style={[styles.brandOrb, { borderColor: G.p200 }]}>
              <PulseAnimation>
                <Ionicons name="analytics" size={24} color={G.p200} />
              </PulseAnimation>
            </View>
            <View>
              <Text style={styles.brandName}>FinanzasIA</Text>
              <View style={styles.brandTagRow}>
                <View
                  style={[
                    styles.liveIndicator,
                    {
                      backgroundColor: G.glow,
                      shadowColor: G.glow,
                      shadowOpacity: 0.9,
                      shadowRadius: 6,
                    },
                  ]}
                />
                <Text style={[styles.brandTag, { color: G.p200 }]}>
                  Tasas en vivo
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.refreshBtn, refreshing && { borderColor: G.p200 }]}
            onPress={handleRefresh}
            disabled={refreshing || loading}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={G.p200} />
            ) : (
              <Ionicons name="refresh" size={20} color={G.p200} />
            )}
          </TouchableOpacity>
        </FadeSlide>

        {/* TIMESTAMP Y ESTADO */}
        <FadeSlide delay={50} style={styles.statusRow}>
          <View style={styles.statusLeft}>
            <Ionicons name="time-outline" size={14} color={G.t400} />
            <Text style={styles.timestamp}>
              {lastUpdate ? `Actualizado ${lastUpdate}` : "Cargando..."}
            </Text>
          </View>
          {rates && (
            <View style={styles.statusRight}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: G.glow,
                    shadowColor: G.glow,
                    shadowOpacity: 0.9,
                    shadowRadius: 4,
                  },
                ]}
              />
              <Text style={styles.statusText}>En vivo</Text>
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
            {CURRENCIES.map((c) => (
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
              style={[styles.swapBtn, { borderColor: G.p200 + "45" }]}
              onPress={() => {
                setFromCurrency(toCurrency);
                setToCurrency(fromCurrency);
              }}
            >
              <Ionicons name="swap-vertical" size={22} color={G.p200} />
            </TouchableOpacity>
            <View style={styles.swapDivider} />
          </View>

          <Text style={styles.sectionLabel}>Convertir a</Text>
          <View style={styles.pillsRow}>
            {CURRENCIES.map((c) => (
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

          <View style={[styles.resultBox, { borderColor: toCfg.color + "30" }]}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={G.p200} />
                <Text style={styles.loadingText}>Calculando...</Text>
              </View>
            ) : (
              <>
                <CurrencyIcon currency={toCurrency} size={70} />
                <Text style={styles.resultEyebrow}>RESULTADO</Text>
                <Text style={[styles.resultNumber, { color: toCfg.color }]}>
                  {formatNumber(conversion)}
                </Text>
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
        </FadeSlide>

        {/* TASAS DEL DÍA */}
        <FadeSlide delay={120}>
          <View style={styles.ratesHeader}>
            <Text style={styles.ratesTitle}>Tasas del día</Text>
            <View style={styles.ratesBadge}>
              <Ionicons name="time" size={12} color={G.p200} />
              <Text style={styles.ratesBadgeText}>Tiempo real</Text>
            </View>
          </View>
        </FadeSlide>

        {loading && !rates ? (
          <View style={styles.ratesLoading}>
            <ActivityIndicator size="large" color={G.p200} />
          </View>
        ) : rates ? (
          <View style={styles.ratesList}>
            <RateCard
              currency="USD"
              value={rates.USD}
              source="BCV"
              delay={150}
            />
            <RateCard
              currency="EUR"
              value={rates.EUR}
              source="BCV"
              delay={180}
            />
            <RateCard
              currency="USDT"
              value={rates.USDT}
              source={rates.usdtSource || "Binance"}
              delay={210}
            />
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

      {/* TOAST SUPERIOR GRANDE */}
      <SuccessToast
        visible={successToastVisible}
        message={successMessage}
        onHide={() => setSuccessToastVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────
const styles = StyleSheet.create({
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
    position: "absolute",
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Input
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: G.bg100,
    borderRadius: 22,
    borderWidth: 1.5,
    minHeight: 70,
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
