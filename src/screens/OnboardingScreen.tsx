import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, SafeAreaView, Image, ActivityIndicator } from 'react-native';
import { MotiView, AnimatePresence, MotiText } from 'moti';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { bcvApiService, BcvRates } from '../services/api';

const { width, height } = Dimensions.get('window');

// ─── PALETA NEON CARBON ──────────
const G = {
  p100: "#0dbf69", p200: "#24db86", glow: "#11ee83",
  bg100: "#0d0d0d", bg200: "#141414", bg300: "#1c1c1c", bg400: "#252525",
  t100: "#f0fdf4", t200: "#d3f8e7", t300: "#7beab6", t400: "#3a5a47",
  warning: "#fbbf24", euro: "#3b9eff", usdt: "#39c647", ves: "#ff8c2a",
};

const CURRENCIES = {
  USD: { label: "Dólar", symbol: "$", color: "#4bb462", asset: require("../../assets/flags/USA.png") },
  EUR: { label: "Euro", symbol: "€", color: G.euro, asset: require("../../assets/flags/EU.png") },
  USDT: { label: "Tether", symbol: "₮", color: G.usdt, asset: require("../../assets/flags/TT.png") },
  VES: { label: "Bolívar", symbol: "Bs", color: G.ves, asset: require("../../assets/flags/VE.jpg") },
};

// ─── COMPONENTES COMPARTIDOS ──────────

const GlassCard = ({ children, delay = 0, style = {} }: any) => (
  <MotiView
    from={{ opacity: 0, translateY: 15, scale: 0.97 }}
    animate={{ opacity: 1, translateY: 0, scale: 1 }}
    transition={{ type: 'timing', duration: 400, delay }}
    style={[styles.glassCard, style]}
  >
    {children}
  </MotiView>
);

const MockCurrencyIcon = ({ curr, size = 40 }: { curr: keyof typeof CURRENCIES, size?: number }) => {
  const c = CURRENCIES[curr];
  return (
    <View style={{
      width: size, height: size, borderRadius: size/2,
      backgroundColor: c.color + '18', borderWidth: 1.5, borderColor: c.color + '45',
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
    }}>
      <Image source={c.asset} style={{ width: size*0.72, height: size*0.72, borderRadius: size*0.36 }} resizeMode="cover" />
    </View>
  );
};

// ─── PANTALLA INTRODUCCIÓN (PASO 0) ──────────

const IntroWelcome = ({ onStart, loading }: { onStart: () => void, loading: boolean }) => {
  return (
    <View style={styles.introContainer}>
      <MotiView
        from={{ opacity: 0, translateY: 30 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 1000, delay: 200 }}
        style={{ alignItems: 'center', marginBottom: 50 }}
      >
        <View style={[styles.logoBox, { width: 90, height: 90, borderRadius: 30 }]}>
          {[0, 1, 2].map((i) => (
            <MotiView
              key={i}
              from={{ opacity: 0.6, scale: 0.8 }}
              animate={{ opacity: 0, scale: 2.5 }}
              transition={{
                type: 'timing',
                duration: 10000,
                delay: i * 1300,
                loop: true,
              }}
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: G.p200, borderRadius: 30, zIndex: -1 },
              ]}
            />
          ))}
          <Image source={require('../../assets/icon.png')} style={{ width: 90, height: 90, borderRadius: 25 }} />
        </View>
      </MotiView>
      
      <MotiText
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600, delay: 500 }}
        style={{ fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 12, letterSpacing: -0.5 }}
      >
        Bienvenido a{"\n"}
        <Text style={{ color: G.p100 }}>FinanzasIA</Text>
      </MotiText>

      <MotiText
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600, delay: 700 }}
        style={{ fontSize: 16, color: G.t200, textAlign: 'center', marginHorizontal: 30, lineHeight: 24 }}
      >
        Tu centro de mando financiero inteligente. Domina el mercado cambiario con tasas en tiempo real y herramientas avanzadas.
      </MotiText>

      <MotiView
        from={{ opacity: 0, translateY: 30 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600, delay: 1200 }}
        style={{ marginTop: 60, width: '100%', paddingHorizontal: 40 }}
      >
        <TouchableOpacity style={styles.btnStart} onPress={onStart} disabled={loading}>
          {loading ? (
             <ActivityIndicator color={G.bg100} />
          ) : (
             <>
                <Text style={styles.btnStartTxt}>Aquí encontrarás</Text>
                <Ionicons name="arrow-down" size={20} color={G.bg100} />
             </>
          )}
        </TouchableOpacity>
      </MotiView>
    </View>
  );
}

// ─── PASOS DEL CARRUSEL ──────────

const VisualConversor = ({ rates }: { rates: BcvRates | null }) => {
  const [isSwapped, setIsSwapped] = useState(false);
  const usdRate = rates?.USD || 36.5;
  const fromVal = "100.00";
  const toVal = (100 * usdRate).toFixed(2);
  const toValSwapped = (100 / usdRate).toFixed(2);

  const topData = isSwapped 
    ? { curr: "VES", label: "Bolívar (Bs)", val: fromVal, color: G.ves }
    : { curr: "USD", label: "Dólar ($)", val: fromVal, color: '#fff' };
    
  const botData = isSwapped 
    ? { curr: "USD", label: "Dólar ($)", val: toValSwapped, color: '#fff' }
    : { curr: "VES", label: "Bolívar (Bs)", val: toVal, color: G.ves };

  return (
    <View style={{ gap: 12 }}>
      <GlassCard delay={100} style={{ padding: 16 }}>
        <Text style={styles.sectionTitle}>Conversión Inmediata</Text>
        <View style={{ gap: 12, marginTop: 16 }}>
          {/* Fila Origen */}
          <MotiView
            key={`top-${isSwapped}`}
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400 }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' }}
          >
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1, paddingRight: 8 }}>
               <MockCurrencyIcon curr={topData.curr as any} size={36} />
               <Text style={{ fontSize: 13, color: G.t300, fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit>{topData.label}</Text>
             </View>
             <Text style={{ fontSize: 18, fontWeight: '800', color: topData.color, flexShrink: 1, textAlign: 'right' }} numberOfLines={1} adjustsFontSizeToFit>{topData.val}</Text>
          </MotiView>

          {/* Icono Central Flotante / Interactivo */}
          <View style={{ alignItems: 'center', marginVertical: -20, zIndex: 10 }}>
             <TouchableOpacity activeOpacity={0.8} onPress={() => setIsSwapped(!isSwapped)}>
               <MotiView
                 animate={{ rotate: isSwapped ? '180deg' : '0deg' }}
                 transition={{ type: 'spring', damping: 14 }}
                 style={{ backgroundColor: G.bg200, padding: 6, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(97,188,132,0.3)' }}
               >
                 <Ionicons name="swap-vertical" size={16} color={G.p100} />
               </MotiView>
             </TouchableOpacity>
          </View>
          
          {/* Fila Destino */}
          <MotiView
            key={`bot-${isSwapped}`}
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400 }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' }}
          >
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1, paddingRight: 8 }}>
               <MockCurrencyIcon curr={botData.curr as any} size={36} />
               <Text style={{ fontSize: 13, color: G.t300, fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit>{botData.label}</Text>
             </View>
             <Text style={{ fontSize: 18, fontWeight: '800', color: botData.color, flexShrink: 1, textAlign: 'right' }} numberOfLines={1} adjustsFontSizeToFit>{botData.val}</Text>
          </MotiView>
        </View>
      </GlassCard>
    </View>
  );
};

const VisualTasas = ({ rates }: { rates: BcvRates | null }) => {
  const usdRate = rates?.USD?.toFixed(2) || "36.50";
  const usdtRate = rates?.USDT?.toFixed(2) || "39.80";

  return (
    <View style={{ gap: 12 }}>
      {[
        { curr: "USD", val: usdRate, desc: "BCV Oficial", source: "BCV", color: CURRENCIES.USD.color, delay: 100 },
        { curr: "USDT", val: usdtRate, desc: "Binance P2P", source: "Binance", color: CURRENCIES.USDT.color, delay: 200 }
      ].map((item, i) => (
        <GlassCard key={i} delay={item.delay} style={{ borderLeftWidth: 3, borderLeftColor: item.color, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <MockCurrencyIcon curr={item.curr as any} size={44} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#fff' }}>{item.curr}</Text>
                <View style={{ backgroundColor: item.color + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 9, color: item.color, fontWeight: 'bold' }}>{item.source}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: G.t400, marginTop: 2 }}>{item.desc}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: item.color }}>{item.val}</Text>
              <Text style={{ fontSize: 11, color: G.t400 }}>Bs.</Text>
            </View>
          </View>
        </GlassCard>
      ))}

      <MotiView
        from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 400, delay: 500 }}
        style={{ alignItems: 'center', marginTop: 4 }}
      >
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Tasas de la API obtenidas con éxito</Text>
      </MotiView>
    </View>
  );
};

const VisualCalculadora = () => {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    let to = setTimeout(() => setTyped("5"), 500);
    let to2 = setTimeout(() => setTyped("50"), 800);
    let to3 = setTimeout(() => setTyped("500"), 1100);
    return () => { clearTimeout(to); clearTimeout(to2); clearTimeout(to3); };
  }, []);

  const rows = [ ["7", "8", "9"], ["4", "5", "6"], ["1", "2", "3"] ];

  return (
    <View style={{ gap: 12 }}>
      <GlassCard delay={100} style={{ padding: 16, alignItems: 'flex-end', backgroundColor: G.bg400 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#fff' }}>{typed || "0"}</Text>
        <Text style={{ fontSize: 12, color: G.t300 }}>Monto a calcular</Text>
      </GlassCard>
      
      <MotiView
        from={{ opacity: 0, translateY: 15 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 250 }}
        style={{ gap: 8 }}
      >
        {rows.map((row, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
            {row.map(num => (
              <View key={num} style={{ flex: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{num}</Text>
              </View>
            ))}
          </View>
        ))}
      </MotiView>
    </View>
  );
};

const VisualHeatmap = () => {
  const DAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];
  
  // Create a realistic mockup of the CalendarScreen heatmap (7 columns, 5 rows)
  // Each cell needs { date: string, intensity: number, isBankHoliday?: boolean, isToday?: boolean }
  const mockGrid = Array(35).fill(null).map((_, i) => {
    if (i < 3 || i > 32) return null; // Empty padding for first and last days of month
    let intensity = 0;
    let isBankHoliday = false;
    let isToday = i === 25;
    
    // Some random-looking data distribution
    if (i % 7 === 1 && i === 8) isBankHoliday = true; // Mock a bank holiday on a Monday
    else if (i % 7 !== 0 && i % 7 !== 6) { // Weekdays
      intensity = (i * 17 % 100) / 100; // Pseudo-random 0-1
    }
    
    return { date: i - 2, intensity, isBankHoliday, isToday };
  });

  const getCellStyles = (cell: any) => {
    let fill = "rgba(20,20,20,0.4)";
    let border = "rgba(37,37,37,0.6)";
    
    if (cell.isBankHoliday) {
      fill = "rgba(168,85,247,0.15)";
      border = "rgba(168,85,247,0.5)";
    } else if (cell.intensity > 0) {
      const alpha = 0.12 + cell.intensity * 0.38;
      let col = cell.intensity < 0.33 ? "rgba(36,219,134," : cell.intensity < 0.66 ? "rgba(251,191,36," : "rgba(239,68,68,";
      fill = `${col}${alpha.toFixed(2)})`;
      border = `${col}${(alpha + 0.22).toFixed(2)})`;
    }
    return { backgroundColor: fill, borderColor: cell.isToday ? "rgba(36,219,134,0.55)" : border };
  };

  return (
    <View style={{ gap: 12 }}>
      <GlassCard delay={100} style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", marginBottom: 6 }}>
          {DAY_LABELS.map((d, i) => <Text key={i} style={{ flex: 1, textAlign: "center", color: G.t200, opacity: 0.4, fontSize: 11, fontWeight: "700" }}>{d}</Text>)}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {mockGrid.map((cell, i) => {
            if (!cell) return <View key={i} style={{ width: "13%", aspectRatio: 1, marginBottom: 6 }} />;
            const styles = getCellStyles(cell);
            
            return (
              <MotiView
                key={i}
                from={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 400, delay: 200 + (i * 20) }}
                style={{
                  width: "13%", aspectRatio: 1, marginBottom: 6, borderRadius: 8,
                  borderWidth: 1, alignItems: "center", justifyContent: "center",
                  ...styles
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: cell.isToday ? G.p200 : (cell.intensity > 0 || cell.isBankHoliday) ? G.t100 : "rgba(123,234,182,0.3)" }}>
                  {cell.date}
                </Text>
                {cell.intensity > 0 && <Text style={{ fontSize: 7, fontWeight: "700", marginTop: 1, color: "rgba(240,253,244,0.5)" }}>39</Text>}
                {cell.isBankHoliday && <Ionicons name="briefcase" size={8} color="#a855f7" style={{ marginTop: 1 }} />}
              </MotiView>
            );
          })}
        </View>
        <Text style={{ fontSize: 10, color: G.t400, textAlign: 'center', marginTop: 4 }}>
          Historial estilo calendario con alertas de feriados.
        </Text>
      </GlassCard>
    </View>
  );
};

const VisualAlertas = () => {
  return (
    <View style={{ gap: 12 }}>
      <GlassCard delay={100} style={{ padding: 16, alignItems: 'center' }}>
        <MotiView
          from={{ rotate: '0deg', scale: 1 }}
          animate={{ rotate: ['0deg', '-15deg', '15deg', '-10deg', '10deg', '0deg'], scale: 1.1 }}
          transition={{ type: 'timing', duration: 800, delay: 500 }}
          style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: G.p100 + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
        >
          <Ionicons name="notifications" size={30} color={G.p100} />
        </MotiView>
        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#fff' }}>Alertas Activadas</Text>
        <Text style={{ fontSize: 12, color: G.t400, textAlign: 'center', marginTop: 4 }}>
          Te avisaremos cuando el USDT fluctúe significativamente.
        </Text>
      </GlassCard>

      <MotiView
        from={{ opacity: 0, translateY: -20, scale: 0.9 }}
        animate={{ opacity: 1, translateY: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 12, delay: 1000 }}
        style={{ position: 'absolute', top: -10, left: 10, right: 10, backgroundColor: '#2e2e2e', padding: 12, borderRadius: 12, flexDirection: 'row', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15 }}
      >
        <Image source={CURRENCIES.USDT.asset} style={{ width: 30, height: 30, borderRadius: 15 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#fff' }}>Alerta de USDT</Text>
          <Text style={{ fontSize: 11, color: G.t200 }}>El USDT ha subido un 2.5% en Binance P2P.</Text>
        </View>
      </MotiView>
    </View>
  );
};

// ─── STEP DEFINITIONS ──────────

const STEPS = [
  { icon: "swap-horizontal", title: "Conversor de Monedas", body: "Calcula al instante entre Dólares, Euros, USDT y Bolívares usando tasas oficiales y de mercado.", Visual: VisualConversor },
  { icon: "flash", title: "Tasas en Tiempo Real", body: "Monitorea el BCV y Binance P2P. Tus tasas siempre estarán actualizadas sin que tengas que buscar.", Visual: VisualTasas },
  { icon: "calculator", title: "Calculadora Integrada", body: "Escribe cualquier monto y obtén su equivalente en todas las monedas de forma instantánea.", Visual: VisualCalculadora },
  { icon: "calendar", title: "Historial Inteligente", body: "Analiza un mapa de calor del BCV para identificar los días de mayor volatilidad.", Visual: VisualHeatmap },
  { icon: "notifications-circle", title: "Alertas Inteligentes", body: "Recibe notificaciones automáticas en tu teléfono cuando el USDT suba o baje bruscamente.", Visual: VisualAlertas },
];

// ─── MAIN ONBOARDING SCREEN ──────────

export default function OnboardingScreen({ onFinish }: { onFinish: () => void }) {
  const [showIntro, setShowIntro] = useState(true);
  const [rates, setRates] = useState<BcvRates | null>(null);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'right' | 'left'>('right');
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    // Fetch real rates in the background during the intro
    bcvApiService.fetchExchangeRates().then(res => {
      setRates(res.rates);
      setLoading(false);
    });
  }, []);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const goNext = () => {
    if (isLast) { handleFinish(); return; }
    setDirection('right'); setAnimKey(k => k + 1); setStep(s => s + 1);
  };
  const goPrev = () => {
    if (step > 0) { setDirection('left'); setAnimKey(k => k + 1); setStep(s => s - 1); }
  };

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem('@first_launch', 'false');
      onFinish();
    } catch (e) { onFinish(); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />

      {/* Ambient background particles */}
      <MotiView
        from={{ opacity: 0.1, scale: 0.8, translateY: 20 }}
        animate={{ opacity: 0.25, scale: 1.2, translateY: -20 }}
        transition={{ type: 'timing', duration: 4000, loop: true, repeatReverse: true }}
        style={[styles.glowOrb, { top: '5%', left: '5%', backgroundColor: G.p100 }]}
      />
      <MotiView
        from={{ opacity: 0.1, scale: 0.8, translateX: -20 }}
        animate={{ opacity: 0.2, scale: 1.1, translateX: 20 }}
        transition={{ type: 'timing', duration: 5000, loop: true, repeatReverse: true }}
        style={[styles.glowOrb, { bottom: '15%', right: '5%', backgroundColor: G.glow }]}
      />

      {showIntro ? (
        <IntroWelcome onStart={() => setShowIntro(false)} loading={loading} />
      ) : (
        <MotiView 
          from={{ opacity: 0, translateY: Dimensions.get('window').height * 0.1 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 700 }}
          style={styles.modalContent}
        >
          {/* Progress Bar */}
          <View style={styles.progressBg}>
            <MotiView animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ type: 'timing', duration: 400 }} style={styles.progressFill} />
          </View>

          {/* Header */}
          <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 200 }} style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.headerIcon}>
                <Ionicons name={current.icon as any} size={20} color={G.p100} />
              </View>
              <View>
                <Text style={styles.stepTitle}>Paso {step + 1} de {STEPS.length}</Text>
                <Text style={styles.stepSubtitle}>Descubre FinanzasIA</Text>
              </View>
            </View>
          </MotiView>

          {/* Body */}
          <AnimatePresence exitBeforeEnter>
            <MotiView
              key={animKey}
              from={{ opacity: 0, translateX: direction === 'right' ? 30 : -30 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: direction === 'right' ? -30 : 30 }}
              transition={{ type: 'timing', duration: 350 }}
              style={styles.body}
            >
              <Text style={styles.title}>{current.title}</Text>
              <Text style={styles.desc}>{current.body}</Text>

              <View style={styles.visualContainer}>
                <current.Visual rates={rates} />
              </View>
            </MotiView>
          </AnimatePresence>

          {/* Footer */}
          <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 300 }} style={styles.footer}>
            <View style={styles.dotsContainer}>
              {STEPS.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => { setDirection(i > step ? 'right' : 'left'); setAnimKey(k => k + 1); setStep(i); }}>
                  <MotiView
                    animate={{ width: i === step ? 16 : 5, backgroundColor: i === step ? G.p100 : i < step ? "rgba(97,188,132,0.35)" : "rgba(69,69,69,0.4)" }}
                    transition={{ type: 'timing', duration: 300 }} style={styles.dot}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {step > 0 && (
                <TouchableOpacity style={styles.btnPrev} onPress={goPrev}>
                  <Ionicons name="chevron-back" size={16} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.btnPrevTxt}>Anterior</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.btnNext} onPress={goNext} activeOpacity={0.8}>
                <Text style={styles.btnNextTxt}>{isLast ? "¡Empezar!" : "Siguiente"}</Text>
                <Ionicons name={isLast ? "checkmark-circle" : "chevron-forward"} size={16} color="#000" />
              </TouchableOpacity>
            </View>
          </MotiView>
        </MotiView>
      )}
    </SafeAreaView>
  );
}

// ─── STYLES ──────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: G.bg100, justifyContent: 'center', alignItems: 'center' },
  glowOrb: { position: 'absolute', width: 220, height: 220, borderRadius: 110, filter: 'blur(50px)' },
  
  // Intro Styles
  introContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', paddingHorizontal: 20 },
  logoBox: { justifyContent: 'center', alignItems: 'center', shadowColor: G.p100, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 20 },
  btnStart: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, backgroundColor: G.p100, borderRadius: 16, shadowColor: G.p100, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 },
  btnStartTxt: { color: G.bg100, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  // Carousel Styles
  modalContent: {
    width: '92%', maxWidth: 420, backgroundColor: 'rgba(25,25,25,0.9)',
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(97,188,132,0.15)',
    overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.8, shadowRadius: 30, elevation: 20,
    maxHeight: Dimensions.get('window').height * 0.85
  },
  progressBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.05)' },
  progressFill: { height: '100%', backgroundColor: G.p100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, paddingBottom: 16 },
  headerIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(97,188,132,0.1)', borderWidth: 1, borderColor: 'rgba(97,188,132,0.2)', alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 11, fontWeight: '800', color: G.p100, textTransform: 'uppercase', letterSpacing: 1 },
  stepSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  body: { paddingHorizontal: 24, paddingBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', color: 'rgba(255,255,255,0.95)', marginBottom: 8 },
  desc: { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 22, marginBottom: 20 },
  visualContainer: { padding: 16, borderRadius: 16, backgroundColor: 'rgba(15,15,15,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  dotsContainer: { flexDirection: 'row', gap: 4, alignItems: 'center', flexShrink: 1, paddingRight: 8 },
  dot: { height: 5, borderRadius: 2.5 },
  btnPrev: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', gap: 4 },
  btnPrevTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  btnNext: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: G.p100, flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: G.p100, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
  btnNextTxt: { color: '#000', fontSize: 13, fontWeight: '800' },
  glassCard: { borderRadius: 12, backgroundColor: "rgba(30,30,30,0.6)", borderWidth: 1, borderColor: "rgba(69,69,69,0.3)" },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: G.t300, textTransform: 'uppercase' },
});
