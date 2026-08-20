import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { View, Text, TextInput, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Platform, Dimensions, ActivityIndicator, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
import { historyService, RateSnapshot } from "../services/history";
import { useFocusEffect } from "@react-navigation/native";
import { CurrencyIcon } from "./HomeScreen";
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS, useAnimatedProps, withSpring, useDerivedValue } from 'react-native-reanimated';

const { width, height } = Dimensions.get("window");

const G = {
  p100: "#0dbf69", p200: "#24db86", bg100: "#0d0d0d", bg200: "#141414", bg300: "#1c1c1c",
  bg400: "#252525", t100: "#f0fdf4", t200: "#d3f8e7", t300: "#7beab6", t400: "#3a5a47",
  usdt: "#39c647", eur: "#3b82f6", danger: "#ef4444", warning: "#fbbf24"
};

type Period = "1W" | "1M" | "3M" | "1Y";

// AnimatedTextInput: updates text on the UI thread, bypassing React re-renders entirely
const AnimatedValueInput = Animated.createAnimatedComponent(TextInput);

const ScrubWrapper = ({
    children,
    dataLength,
    chartWidth,
    chartKey,
    navigation,
    setScrubIndex,
    // Precomputed string arrays — stored as SharedValues so worklets can read them instantly
    formattedPrices,
    formattedDates,
    formattedExtras,
    accentColor = G.p200,
    compData = null,
    showValuePanel = true,
    renderHeader,
}: any) => {
    const cx = useSharedValue(-100);
    const active = useSharedValue(0);

    const sharedPrices = useSharedValue<string[]>(formattedPrices ?? []);
    const sharedDates  = useSharedValue<string[]>(formattedDates  ?? []);
    const sharedExtras = useSharedValue<string[]>(formattedExtras ?? []);
    const sharedUsd    = useSharedValue<string[]>(compData?.usd   ?? []);
    const sharedEur    = useSharedValue<string[]>(compData?.eur   ?? []);
    const sharedUsdt   = useSharedValue<string[]>(compData?.usdt  ?? []);

    const priceText = useSharedValue<string>(formattedPrices?.[formattedPrices.length - 1] ?? '');
    const dateText  = useSharedValue<string>(formattedDates?.[formattedDates.length - 1]   ?? '');
    const extraText = useSharedValue<string>(formattedExtras?.[formattedExtras.length - 1] ?? '');
    const usdText   = useSharedValue<string>('');
    const eurText   = useSharedValue<string>('');
    const usdtText  = useSharedValue<string>('');

    useEffect(() => {
        if (formattedPrices?.length) sharedPrices.value = formattedPrices;
        if (formattedDates?.length)  sharedDates.value  = formattedDates;
        if (formattedExtras?.length) sharedExtras.value = formattedExtras;
        if (compData) {
            if (compData.usd?.length)  sharedUsd.value  = compData.usd;
            if (compData.eur?.length)  sharedEur.value  = compData.eur;
            if (compData.usdt?.length) sharedUsdt.value = compData.usdt;
        }
    }, [formattedPrices, formattedDates, compData]);

    const pan = useMemo(() => Gesture.Pan()
        .minDistance(0)
        .activateAfterLongPress(0)
        .activeOffsetX([-5, 5])
        .failOffsetY([-30, 30])
        .onStart((e) => {
            const paddingLeft = 64, paddingRight = 16;
            const activeWidth = chartWidth - paddingLeft - paddingRight;
            let index = Math.round(((e.x - paddingLeft) / activeWidth) * (dataLength - 1));
            index = Math.max(0, Math.min(dataLength - 1, index));
            const newCx = paddingLeft + (index / (dataLength - 1)) * activeWidth;
            cx.value = newCx;
            active.value = withSpring(1, { mass: 0.2, damping: 12 });
            // Update text values directly on UI thread — no JS bridge!
            priceText.value = sharedPrices.value[index] ?? '';
            dateText.value  = sharedDates.value[index]  ?? '';
            extraText.value = sharedExtras.value[index] ?? '';
            usdText.value   = sharedUsd.value[index]    ?? '';
            eurText.value   = sharedEur.value[index]    ?? '';
            usdtText.value  = sharedUsdt.value[index]   ?? '';
            runOnJS(navigation.setOptions)({ swipeEnabled: false });
            if (setScrubIndex) runOnJS(setScrubIndex)({ key: chartKey, index, cx: newCx });
        })
        .onUpdate((e) => {
            const paddingLeft = 64, paddingRight = 16;
            const activeWidth = chartWidth - paddingLeft - paddingRight;
            let index = Math.round(((e.x - paddingLeft) / activeWidth) * (dataLength - 1));
            index = Math.max(0, Math.min(dataLength - 1, index));
            const newCx = paddingLeft + (index / (dataLength - 1)) * activeWidth;
            cx.value = newCx;
            priceText.value = sharedPrices.value[index] ?? '';
            dateText.value  = sharedDates.value[index]  ?? '';
            extraText.value = sharedExtras.value[index] ?? '';
            usdText.value   = sharedUsd.value[index]    ?? '';
            eurText.value   = sharedEur.value[index]    ?? '';
            usdtText.value  = sharedUsdt.value[index]   ?? '';
            if (setScrubIndex) runOnJS(setScrubIndex)({ key: chartKey, index, cx: newCx });
        })
        .onEnd(() => {
            active.value = withSpring(0, { mass: 0.2, damping: 12 });
            runOnJS(navigation.setOptions)({ swipeEnabled: true });
            if (setScrubIndex) runOnJS(setScrubIndex)(null);
        })
        .onFinalize(() => {
            active.value = 0;
            runOnJS(navigation.setOptions)({ swipeEnabled: true });
        }),
    [dataLength, chartWidth, chartKey, navigation, setScrubIndex]);

    const lineStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: cx.value }],
        opacity: active.value,
    }));
    const dotStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: cx.value - 5 }, { scale: active.value }],
        opacity: active.value,
    }));
    const activePanelStyle  = useAnimatedStyle(() => ({ opacity: active.value }));
    const idlePanelStyle    = useAnimatedStyle(() => ({ opacity: 1 - active.value }));

    // Animated props for TextInput — updates happen on UI thread without React re-render
    const priceProps = useAnimatedProps(() => ({ text: priceText.value, defaultValue: priceText.value }));
    const dateProps  = useAnimatedProps(() => ({ text: dateText.value,  defaultValue: dateText.value  }));
    const extraProps = useAnimatedProps(() => ({ text: extraText.value, defaultValue: extraText.value }));
    const usdProps   = useAnimatedProps(() => ({ text: usdText.value,   defaultValue: usdText.value   }));
    const eurProps   = useAnimatedProps(() => ({ text: eurText.value,   defaultValue: eurText.value   }));
    const usdtProps  = useAnimatedProps(() => ({ text: usdtText.value,  defaultValue: usdtText.value  }));

    const isComp = compData !== null;
    const lastPrice = formattedPrices?.[formattedPrices.length - 1] ?? '';
    const lastDate  = formattedDates?.[formattedDates.length  - 1] ?? '';
    const lastExtra = formattedExtras?.[formattedExtras.length - 1] ?? '';

    return (
        <View>
            {renderHeader && renderHeader({ priceProps, dateProps, extraProps, usdProps, eurProps, usdtProps, activePanelStyle, idlePanelStyle, lastPrice, lastDate, lastExtra, extraText })}
            {showValuePanel && !renderHeader && (
                <View style={{ height: 64, position: 'relative', paddingHorizontal: 16, marginBottom: 4 }}>
                    {/* Idle state */}
                    <Animated.View style={[{ position: 'absolute', top: 0, left: 16, right: 16, bottom: 0, justifyContent: 'center' }, idlePanelStyle]}>
                        {!isComp ? (
                            <View>
                                <Text style={{ fontSize: 26, fontWeight: '900', color: G.t100, letterSpacing: -0.5 }}>{lastPrice}</Text>
                                <Text style={{ fontSize: 12, color: accentColor, fontWeight: '700', marginTop: 2 }}>{lastDate}</Text>
                            </View>
                        ) : (
                            <Text style={{ fontSize: 13, color: G.t300, textAlign: 'center' }}>Desliza sobre la gráfica para explorar.</Text>
                        )}
                    </Animated.View>
                    {/* Active scrub state — text driven by UI-thread shared values */}
                    <Animated.View style={[{ position: 'absolute', top: 0, left: 16, right: 16, bottom: 0, justifyContent: 'center' }, activePanelStyle]}>
                        {!isComp ? (
                            <View>
                                <AnimatedValueInput animatedProps={priceProps} editable={false} caretHidden
                                    style={{ fontSize: 26, fontWeight: '900', color: G.t100, letterSpacing: -0.5, padding: 0, height: 34 }} />
                                <AnimatedValueInput animatedProps={dateProps} editable={false} caretHidden
                                    style={{ fontSize: 12, color: accentColor, fontWeight: '700', padding: 0, height: 20, marginTop: 2 }} />
                            </View>
                        ) : (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ fontSize: 11, color: G.t300, marginBottom: 2 }}>USD</Text>
                                    <AnimatedValueInput animatedProps={usdProps} editable={false} caretHidden
                                        style={{ fontSize: 16, fontWeight: '900', color: G.p200, padding: 0, height: 24 }} />
                                </View>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ fontSize: 11, color: G.t300, marginBottom: 2 }}>EUR</Text>
                                    <AnimatedValueInput animatedProps={eurProps} editable={false} caretHidden
                                        style={{ fontSize: 16, fontWeight: '900', color: G.eur, padding: 0, height: 24 }} />
                                </View>
                                {compData.hasUsdt && (
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ fontSize: 11, color: G.t300, marginBottom: 2 }}>USDT</Text>
                                        <AnimatedValueInput animatedProps={usdtProps} editable={false} caretHidden
                                            style={{ fontSize: 16, fontWeight: '900', color: G.usdt, padding: 0, height: 24 }} />
                                    </View>
                                )}
                                <AnimatedValueInput animatedProps={dateProps} editable={false} caretHidden
                                    style={{ fontSize: 12, color: G.t300, fontWeight: '600', padding: 0, height: 20 }} />
                            </View>
                        )}
                    </Animated.View>
                </View>
            )}
            {/* ── Chart + Gesture ── */}
            <GestureDetector gesture={pan}>
                <View style={{ position: 'relative' }}>
                    {children}
                    <Animated.View style={[{ position: 'absolute', top: 16, bottom: 32, width: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.9)' }, lineStyle]} />
                    <Animated.View style={[{ position: 'absolute', top: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff', shadowColor: '#fff', shadowRadius: 6, shadowOpacity: 0.9, elevation: 8 }, dotStyle]} />
                </View>
            </GestureDetector>
        </View>
    );
};

export default function ChartsScreen({ navigation }: any) {
  const [data, setData] = useState<RateSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("1M");

  const [scrubIndex, setScrubIndex] = useState<{ key: string, index: number, cx: number } | null>(null);
  const [proModal, setProModal] = useState<string | null>(null);

  const periodCache = useRef<Record<string, RateSnapshot[]>>({});

  const processRaw = (raw: RateSnapshot[]): RateSnapshot[] => {
    const valid = raw.filter(h => h.usd > 0 && h.eur > 0);
    for (let i = 0; i < valid.length; i++) {
      if (valid[i].usdt === 0) {
        if (i > 0) valid[i].usdt = valid[i - 1].usdt;
        else {
          const next = valid.find(v => v.usdt > 0);
          if (next) valid[i].usdt = next.usdt;
        }
      }
    }
    return valid;
  };

  const loadData = async (p: Period) => {
    // ⚡ Instant load from cache — no spinner needed
    if (periodCache.current[p]) {
      setData(periodCache.current[p]);
      setLoading(false);
      setScrubIndex(null);
      return;
    }
    setLoading(true);
    setScrubIndex(null);
    const raw = await historyService.getHistoryForPeriod(p);
    const processed = processRaw(raw);
    periodCache.current[p] = processed;
    setData(processed);
    setLoading(false);
    // 🔄 Preload all other periods in the background so future switches are instant
    const others: Period[] = (['1W', '1M', '3M', '1Y'] as Period[]).filter(x => x !== p);
    Promise.all(others.map(async (op) => {
      if (periodCache.current[op]) return;
      const raw2 = await historyService.getHistoryForPeriod(op);
      periodCache.current[op] = processRaw(raw2);
    }));
  };

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    // If cached, immediately set data to avoid flicker with old data + new period math
    if (periodCache.current[p]) {
      setData(periodCache.current[p]);
      setScrubIndex(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData(period);
    }, [period])
  );

  const hasUsdtData = useMemo(() => {
    if (!data.length) return false;
    return Math.max(...data.map(d => d.usdt)) > 0;
  }, [data]);

  const chartData = useMemo(() => {
    if (period === "1Y") return data.filter((_, i) => i % 7 === 0 || i === data.length - 1);
    if (period === "3M") return data.filter((_, i) => i % 3 === 0 || i === data.length - 1);
    return data;
  }, [data, period]);

  const labels = useMemo(() => {
    return chartData.map((d, i) => {
      const dateObj = new Date(d.date + "T12:00:00");
      if (period === "1W") {
        // Only show first and last label, blank everything else
        if (i === 0 || i === chartData.length - 1) return dateObj.toLocaleDateString("es-VE", { weekday: "short" });
        return "";
      }
      if (period === "1M") {
        if (i === 0) return "Sem 1";
        if (i === 7) return "Sem 2";
        if (i === 14) return "Sem 3";
        if (i === 21) return "Sem 4";
        if (i === 28) return "Sem 5";
        return "";
      }
      if (period === "3M") {
        return (i === 0 || i === Math.floor(chartData.length / 2) || i === chartData.length - 1) ? dateObj.toLocaleDateString("es-VE", { month: "short" }) : "";
      }
      if (period === "1Y") {
        return (i % 8 === 0) ? dateObj.toLocaleDateString("es-VE", { month: "short" }) : "";
      }
      return "";
    });
  }, [chartData, period]);

  const usdData = chartData.map(d => d.usd);
  const eurData = chartData.map(d => d.eur);
  const usdtData = chartData.map(d => d.usdt);

  const chartConfig = {
    backgroundGradientFrom: G.bg200,
    backgroundGradientTo: G.bg200,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    strokeWidth: 2.5,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 1,
    propsForDots: { r: "4", strokeWidth: "2" },
    propsForBackgroundLines: { stroke: G.bg300, strokeDasharray: "" }
  };

  const analytics = useMemo(() => {
    if (data.length < 2) return null;

    let minUsd = Infinity, maxUsd = -Infinity;
    let minEur = Infinity, maxEur = -Infinity;
    let minUsdt = Infinity, maxUsdt = -Infinity;

    let worstPeak = { name: "", date: "", pctIncrease: -Infinity };

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      if (d.usd < minUsd) minUsd = d.usd;
      if (d.usd > maxUsd) maxUsd = d.usd;
      
      if (d.eur < minEur) minEur = d.eur;
      if (d.eur > maxEur) maxEur = d.eur;
      
      if (hasUsdtData && d.usdt > 0) {
        if (d.usdt < minUsdt) minUsdt = d.usdt;
        if (d.usdt > maxUsdt) maxUsdt = d.usdt;
      }

      if (i > 0) {
        const prev = data[i - 1];
        
        const usdDiff = ((d.usd - prev.usd) / prev.usd) * 100;
        if (usdDiff > worstPeak.pctIncrease) worstPeak = { name: "Dólar BCV", date: d.date, pctIncrease: usdDiff };

        const eurDiff = ((d.eur - prev.eur) / prev.eur) * 100;
        if (eurDiff > worstPeak.pctIncrease) worstPeak = { name: "Euro BCV", date: d.date, pctIncrease: eurDiff };

        if (hasUsdtData && d.usdt > 0 && prev.usdt > 0) {
          const usdtDiff = ((d.usdt - prev.usdt) / prev.usdt) * 100;
          if (usdtDiff > worstPeak.pctIncrease) worstPeak = { name: "USDT Binance", date: d.date, pctIncrease: usdtDiff };
        }
      }
    }

    const volUsd = ((maxUsd - minUsd) / minUsd) * 100;
    const volEur = ((maxEur - minEur) / minEur) * 100;

    const vols = [
      { name: "Dólar BCV", vol: volUsd },
      { name: "Euro BCV", vol: volEur }
    ];

    if (hasUsdtData && minUsdt !== Infinity) {
      const volUsdt = ((maxUsdt - minUsdt) / minUsdt) * 100;
      vols.push({ name: "USDT Binance", vol: volUsdt });
    }

    vols.sort((a, b) => a.vol - b.vol);

    return {
      mostStable: vols[0],
      leastStable: vols[vols.length - 1],
      worstPeak
    };
  }, [data, hasUsdtData]);

  const fmtDate = (ds: string) => {
    const d = new Date(ds + "T12:00:00");
    return d.toLocaleDateString("es-VE", { day: "numeric", month: "long" });
  };
  
  const getFullDate = (index: number) => {
      if (!chartData[index]) return "";
      const d = new Date(chartData[index].date + "T12:00:00");
      return d.toLocaleDateString("es-VE", { day: "2-digit", month: "short" });
  };

  const renderFilter = (p: Period, label: string) => (
    <TouchableOpacity 
      style={[styles.filterBtn, period === p && styles.filterBtnActive]}
      onPress={() => handlePeriodChange(p)}
    >
      <Text style={[styles.filterText, period === p && styles.filterTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  // Removed handleTouch

  const renderChart = (key: "USD" | "EUR" | "USDT", title: string, color: string, dset: number[]) => {
    // Precompute all display strings so worklets can read them at UI-thread speed
    const fmtPrices = dset.map(v => `Bs. ${v.toFixed(2)}`);
    const fmtDates  = chartData.map((_, i) => getFullDate(i));
    const cardW = width - 32;  // content padding 16px each side
    return (
      <View style={styles.chartCard}>
        <View style={[styles.chartHeader, { paddingHorizontal: 14 }]}>
          <CurrencyIcon currency={key} size={24} />
          <Text style={styles.chartTitle}>{title}</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => { setProModal(key); setScrubIndex(null); }} style={{ padding: 4, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: G.bg300, borderRadius: 8, paddingHorizontal: 8 }}>
            <Ionicons name="analytics" size={14} color={G.t300} />
            <Text style={{ color: G.t300, fontSize: 12, fontWeight: "bold" }}>PRO</Text>
          </TouchableOpacity>
        </View>
        <ScrubWrapper
            dataLength={dset.length}
            chartWidth={cardW}
            chartKey={key}
            navigation={navigation}
            setScrubIndex={setScrubIndex}
            formattedPrices={fmtPrices}
            formattedDates={fmtDates}
            accentColor={color}
        >
            <LineChart
              data={{ labels, datasets: [{ data: dset, color: () => color }] }}
              width={cardW + 48} height={180}
              yAxisLabel="Bs. "
              paddingRight={"64"}
              chartConfig={{ ...chartConfig, color: () => color, propsForDots: { r: '0', strokeWidth: '0' }, fillShadowGradientFromOpacity: 0.2, fillShadowGradientToOpacity: 0 }}
              bezier style={styles.chartStyle}
              withInnerLines={true} withOuterLines={false}
            />
        </ScrubWrapper>
      </View>
    );
  };

  const renderComparativeChart = () => {
    const key = "COMP";
    // Precompute all display strings so worklets can read them at UI-thread speed
    const fmtDates = chartData.map((_, i) => getFullDate(i));
    const compDataObj = {
        usd:     usdData.map(v => v.toFixed(2)),
        eur:     eurData.map(v => v.toFixed(2)),
        usdt:    usdtData.map(v => v.toFixed(2)),
        hasUsdt: hasUsdtData,
    };
    const cardW = width - 32;
    return (
      <View style={styles.chartCard}>
        <View style={[styles.chartHeader, { paddingHorizontal: 14 }]}>
          <View style={[styles.iconBox, { backgroundColor: G.bg300 }]}>
            <Ionicons name="git-compare-outline" size={16} color={G.t100} />
          </View>
          <Text style={styles.chartTitle}>Comparativa Global</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => { setProModal(key); setScrubIndex(null); }} style={{ padding: 4, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: G.bg300, borderRadius: 8, paddingHorizontal: 8 }}>
            <Ionicons name="analytics" size={14} color={G.t300} />
            <Text style={{ color: G.t300, fontSize: 12, fontWeight: "bold" }}>PRO</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12, marginBottom: -8, zIndex: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: G.p200 }} />
                <Text style={{ fontSize: 11, color: G.t300, fontWeight: 'bold' }}>USD</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: G.eur }} />
                <Text style={{ fontSize: 11, color: G.t300, fontWeight: 'bold' }}>EUR</Text>
            </View>
            {hasUsdtData && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: G.usdt }} />
                    <Text style={{ fontSize: 11, color: G.t300, fontWeight: 'bold' }}>USDT</Text>
                </View>
            )}
        </View>
        <ScrubWrapper
            dataLength={usdData.length}
            chartWidth={cardW}
            chartKey="COMP"
            navigation={navigation}
            setScrubIndex={setScrubIndex}
            formattedDates={fmtDates}
            compData={compDataObj}
        >
            <LineChart
              data={{
                  labels,
                  datasets: hasUsdtData ? [
                  { data: usdData, color: () => G.p200 },
                  { data: eurData, color: () => G.eur },
                  { data: usdtData, color: () => G.usdt }
                  ] : [
                  { data: usdData, color: () => G.p200 },
                  { data: eurData, color: () => G.eur }
                  ]
              }}
              width={cardW + 48} height={220}
              yAxisLabel="Bs. "
              paddingRight={"64"}
              chartConfig={{ ...chartConfig, color: () => G.t400, propsForDots: { r: "0", strokeWidth: "0" }, fillShadowGradientFromOpacity: 0 }}
              bezier style={styles.chartStyle}
              withInnerLines={true} withOuterLines={false}
            />
        </ScrubWrapper>
      </View>
    );
  };

  const getProStats = (dset: number[]) => {
    if (!dset || dset.length === 0) return null;
    let min = Infinity, max = -Infinity, sum = 0;
    for (const v of dset) {
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
    }
    const avg = sum / dset.length;
    const startVal = dset[0];
    const endVal = dset[dset.length - 1];
    const trend = endVal > startVal ? "Alcista" : endVal < startVal ? "Bajista" : "Lateral";
    const trendIcon = endVal > startVal ? "trending-up" : endVal < startVal ? "trending-down" : "remove";
    const trendColor = endVal > startVal ? G.p200 : endVal < startVal ? G.danger : G.t300;

    return { min, max, avg, trend, trendIcon, trendColor, startVal, endVal };
  };

  const renderProModal = () => {
    if (!proModal) return null;
    const isComp = proModal === "COMP";
    const isUsd = proModal === "USD";
    const isEur = proModal === "EUR";
    
    const title = isComp ? "Comparativa" : isUsd ? "Dólar BCV" : isEur ? "Euro BCV" : "USDT Binance";
    const color = isComp ? G.t100 : isUsd ? G.p200 : isEur ? G.eur : G.usdt;
    const dset = isUsd ? usdData : isEur ? eurData : usdtData;
    
    const containerWidth = width - 40;

    if (isComp) {
      return (
        <Modal visible={true} animationType="slide" transparent={false} onRequestClose={() => setProModal(null)}>
          <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaView style={[styles.container, { backgroundColor: G.bg100 }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setProModal(null)} style={styles.modalCloseBtn}>
                  <Ionicons name="chevron-down" size={24} color={G.t100} />
                </TouchableOpacity>
                <Text style={{ color: G.t100, fontSize: 16, fontWeight: "bold" }}>Análisis Pro</Text>
                <View style={{ width: 40 }} />
              </View>

              <View style={{ alignItems: "center", marginBottom: 30 }}>
                <View style={{ position: "relative", width: containerWidth, overflow: 'hidden', marginVertical: 8 }}>
                    <ScrubWrapper 
                      dataLength={usdData.length} 
                      chartWidth={containerWidth} 
                      chartKey="PRO_COMP" 
                      navigation={navigation} 
                      setScrubIndex={setScrubIndex} 
                      showValuePanel={false}
                      formattedDates={usdData.map((_, i) => getFullDate(i))}
                      compData={{ usd: usdData.map(v=>v.toFixed(2)), eur: eurData.map(v=>v.toFixed(2)), usdt: usdtData.map(v=>v.toFixed(2)), hasUsdt: hasUsdtData }}
                      renderHeader={({ usdProps, eurProps, usdtProps, dateProps, activePanelStyle, idlePanelStyle, lastDate }) => (
                        <View style={{ backgroundColor: G.bg300, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 24, alignItems: "center", alignSelf: "center", marginBottom: 20, marginTop: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10, width: width - 48 }}>
                          <Text style={{ color: G.t300, fontSize: 14, fontWeight: "800", textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Comparativa Global</Text>
                          
                          <View style={{ height: 100, width: '100%', position: 'relative' }}>
                            <Animated.View style={[{ position: 'absolute', width: '100%', height: '100%', alignItems: 'center' }, idlePanelStyle]}>
                                <Text style={{ color: G.t100, fontSize: 24, fontWeight: "900", letterSpacing: -1, textAlign: "center" }}>
                                Comportamiento del Período
                                </Text>
                            </Animated.View>
                            <Animated.View style={[{ position: 'absolute', width: '100%', height: '100%', alignItems: 'center' }, activePanelStyle]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%', paddingHorizontal: 10 }}>
                                    <View style={{ alignItems: 'center', marginHorizontal: 16 }}>
                                        <Text style={{ fontSize: 12, color: G.t300, marginBottom: 4 }}>USD</Text>
                                        <AnimatedValueInput animatedProps={usdProps} editable={false} caretHidden style={{ fontSize: 20, fontWeight: '900', color: G.p200, padding: 0, height: 28, textAlign: 'center', minWidth: 60 }} />
                                    </View>
                                    <View style={{ alignItems: 'center', marginHorizontal: 16 }}>
                                        <Text style={{ fontSize: 12, color: G.t300, marginBottom: 4 }}>EUR</Text>
                                        <AnimatedValueInput animatedProps={eurProps} editable={false} caretHidden style={{ fontSize: 20, fontWeight: '900', color: G.eur, padding: 0, height: 28, textAlign: 'center', minWidth: 60 }} />
                                    </View>
                                    {hasUsdtData && (
                                        <View style={{ alignItems: 'center', marginHorizontal: 16 }}>
                                            <Text style={{ fontSize: 12, color: G.t300, marginBottom: 4 }}>USDT</Text>
                                            <AnimatedValueInput animatedProps={usdtProps} editable={false} caretHidden style={{ fontSize: 20, fontWeight: '900', color: G.usdt, padding: 0, height: 28, textAlign: 'center', minWidth: 60 }} />
                                        </View>
                                    )}
                                </View>
                                <View style={{ width: '100%', alignItems: 'center', marginTop: 8 }}>
                                    <AnimatedValueInput animatedProps={dateProps} editable={false} caretHidden style={{ color: G.t100, fontSize: 11, fontWeight: 'bold', padding: 0, minHeight: 20, textAlign: 'center' }} />
                                </View>
                            </Animated.View>
                          </View>
                        </View>
                      )}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 12, zIndex: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: G.p200 }} />
                                <Text style={{ fontSize: 11, color: G.t300, fontWeight: 'bold' }}>USD</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: G.eur }} />
                                <Text style={{ fontSize: 11, color: G.t300, fontWeight: 'bold' }}>EUR</Text>
                            </View>
                            {hasUsdtData && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: G.usdt }} />
                                    <Text style={{ fontSize: 11, color: G.t300, fontWeight: 'bold' }}>USDT</Text>
                                </View>
                            )}
                        </View>
                        <LineChart
                          data={{
                              labels: [],
                              datasets: hasUsdtData ? [
                              { data: usdData, color: () => G.p200 },
                              { data: eurData, color: () => G.eur },
                              { data: usdtData, color: () => G.usdt }
                              ] : [
                              { data: usdData, color: () => G.p200 },
                              { data: eurData, color: () => G.eur }
                              ]
                          }}
                          width={containerWidth + 48} height={350}
                          withDots={false}
                          withInnerLines={false}
                          withOuterLines={false}
                          withVerticalLabels={false}
                          withHorizontalLabels={false}
                          paddingRight={"64"}
                          chartConfig={{ ...chartConfig, color: () => G.bg400, backgroundGradientFromOpacity: 0, backgroundGradientToOpacity: 0, fillShadowGradientFromOpacity: 0, propsForDots: { r: "0", strokeWidth: "0" } }}
                          bezier style={{ paddingRight: 0 }}
                        />
                    </ScrubWrapper>
                </View>
              </View>

              {/* Estadísticas de Comparación */}
              {analytics && (
                <View style={{ paddingHorizontal: 20 }}>
                  <Text style={{ color: G.t100, fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>Análisis de Estabilidad</Text>
                  
                  <View style={[styles.analyticsCard, { borderColor: G.p200, marginBottom: 12 }]}>
                    <View style={styles.analyticsRow}>
                      <View style={[styles.analyticsIconBox, { backgroundColor: "rgba(36,219,134,0.15)" }]}>
                        <Ionicons name="shield-checkmark" size={24} color={G.p200} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.analyticsTitle}>La Más Estable</Text>
                        <Text style={styles.analyticsDesc}>
                          El <Text style={{ color: G.t100, fontWeight: "bold" }}>{analytics.mostStable.name}</Text> fue la moneda más segura, variando solo un <Text style={{ color: G.p200, fontWeight: "bold" }}>{analytics.mostStable.vol.toFixed(2)}%</Text>.
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.analyticsCard, { borderColor: G.danger }]}>
                    <View style={styles.analyticsRow}>
                      <View style={[styles.analyticsIconBox, { backgroundColor: "rgba(239,68,68,0.15)" }]}>
                        <Ionicons name="warning" size={24} color={G.danger} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.analyticsTitle}>La Más Volátil</Text>
                        <Text style={styles.analyticsDesc}>
                          El <Text style={{ color: G.t100, fontWeight: "bold" }}>{analytics.leastStable.name}</Text> fue la moneda de mayor riesgo, con una volatilidad del <Text style={{ color: G.danger, fontWeight: "bold" }}>{analytics.leastStable.vol.toFixed(2)}%</Text>.
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
          </GestureHandlerRootView>
        </Modal>
      );
    }
    
    const stats = getProStats(dset);
    if (!stats) return null;

    const currentVal = scrubIndex?.key === "PRO" ? dset[scrubIndex.index] : stats.endVal;
    const currentIndex = scrubIndex?.key === "PRO" ? scrubIndex.index : dset.length - 1;
    const pctChange = ((currentVal - stats.startVal) / stats.startVal) * 100;
    const isPositive = pctChange >= 0;

    return (
      <Modal visible={true} animationType="slide" transparent={false} onRequestClose={() => setProModal(null)}>
        <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={[styles.container, { backgroundColor: G.bg100 }]}>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setProModal(null)} style={styles.modalCloseBtn}>
                <Ionicons name="chevron-down" size={24} color={G.t100} />
              </TouchableOpacity>
              <Text style={{ color: G.t100, fontSize: 16, fontWeight: "bold" }}>Análisis Pro</Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Header & Area Chart Wrapped Together */}
            <View style={{ alignItems: "center", marginBottom: 30, paddingHorizontal: 20 }}>
              <View style={{ position: "relative", width: containerWidth, overflow: 'hidden' }}>
                  <ScrubWrapper
                      dataLength={dset.length}
                      chartWidth={containerWidth}
                      chartKey="PRO"
                      navigation={navigation}
                      setScrubIndex={setScrubIndex}
                      formattedPrices={dset.map(v => `Bs. ${v.toFixed(2)}`)}
                      formattedDates={chartData.map((_, i) => getFullDate(i))}
                      formattedExtras={dset.map(v => (((v - stats.startVal) / stats.startVal) * 100).toFixed(2))}
                      accentColor={color}
                      renderHeader={({ priceProps, dateProps, extraProps, extraText, activePanelStyle, idlePanelStyle, lastPrice, lastDate, lastExtra }) => {
                          const isPctPositive = useDerivedValue(() => parseFloat(extraText.value) >= 0);
                          const iconName = useDerivedValue(() => isPctPositive.value ? "caret-up" : "caret-down");
                          const colorStyle = useAnimatedStyle(() => ({ color: isPctPositive.value ? G.p200 : G.danger }));
                          const bgStyle = useAnimatedStyle(() => ({ backgroundColor: isPctPositive.value ? "rgba(36,219,134,0.15)" : "rgba(239,68,68,0.15)" }));
                          
                          return (
                            <View style={{ backgroundColor: G.bg300, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 24, alignItems: "center", alignSelf: "center", marginBottom: 20, marginTop: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10, width: '100%' }}>
                              <Text style={{ color: G.t300, fontSize: 14, fontWeight: "800", textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{title}</Text>
                              
                              <View style={{ position: 'relative', height: 120, width: '100%', alignItems: 'center' }}>
                                {/* Idle State */}
                                <Animated.View style={[{ position: 'absolute', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }, idlePanelStyle]}>
                                  <Text style={{ color: G.t100, fontSize: 40, fontWeight: "900", letterSpacing: -1, textAlign: "center" }} adjustsFontSizeToFit numberOfLines={1}>{lastPrice}</Text>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, backgroundColor: parseFloat(lastExtra) >= 0 ? "rgba(36,219,134,0.15)" : "rgba(239,68,68,0.15)", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 }}>
                                    <Ionicons name={parseFloat(lastExtra) >= 0 ? "caret-up" : "caret-down"} size={16} color={parseFloat(lastExtra) >= 0 ? G.p200 : G.danger} />
                                    <Text style={{ color: parseFloat(lastExtra) >= 0 ? G.p200 : G.danger, fontSize: 16, fontWeight: "900" }}>{Math.abs(parseFloat(lastExtra)).toFixed(2)}%</Text>
                                  </View>
                                  <Text style={{ color: G.t100, fontSize: 11, fontWeight: 'bold', marginTop: 12, textAlign: 'center', width: '100%' }}>{lastDate}</Text>
                                </Animated.View>
                                
                                {/* Active State */}
                                <Animated.View style={[{ position: 'absolute', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }, activePanelStyle]}>
                                  <View style={{ width: '100%', alignItems: 'center' }}>
                                    <AnimatedValueInput animatedProps={priceProps} editable={false} caretHidden style={{ color: G.t100, fontSize: 40, fontWeight: "900", letterSpacing: -1, padding: 0, minHeight: 50, textAlign: 'center', width: '100%' }} />
                                  </View>
                                  <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 }, bgStyle]}>
                                    <AnimatedValueInput animatedProps={extraProps} editable={false} caretHidden style={[{ fontSize: 16, fontWeight: "900", padding: 0, minHeight: 20, textAlign: 'center', minWidth: 40 }, colorStyle]} />
                                    <Animated.Text style={[{ fontSize: 16, fontWeight: "900", marginLeft: -4 }, colorStyle]}>%</Animated.Text>
                                  </Animated.View>
                                  <View style={{ width: '100%', alignItems: 'center', marginTop: 12 }}>
                                    <AnimatedValueInput animatedProps={dateProps} editable={false} caretHidden style={{ color: G.t100, fontSize: 11, fontWeight: 'bold', padding: 0, minHeight: 20, textAlign: 'center', minWidth: 100 }} />
                                  </View>
                                </Animated.View>
                              </View>
                            </View>
                          );
                      }}
                  >
                      <LineChart
                        data={{ labels: [], datasets: [{ data: dset, color: () => color }] }}
                        width={containerWidth + 48}
                        height={220}
                        withDots={false}
                        withInnerLines={false}
                        withOuterLines={false}
                        withVerticalLabels={false}
                        withHorizontalLabels={false}
                        paddingRight={"64"}
                        chartConfig={{ ...chartConfig, color: () => color, backgroundGradientFromOpacity: 0, backgroundGradientToOpacity: 0, fillShadowGradientFrom: color, fillShadowGradientTo: G.bg100, propsForDots: { r: "0", strokeWidth: "0" } }}
                        bezier
                        style={{ paddingRight: 0 }}
                      />
                  </ScrubWrapper>
              </View>
            </View>

            {/* Cuadrícula de Estadísticas Vitales */}
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={{ color: G.t100, fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>Estadísticas del Período</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Promedio</Text>
                  <Text style={styles.statValue}>Bs. {stats.avg.toFixed(2)}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Techo (Max)</Text>
                  <Text style={styles.statValue}>Bs. {stats.max.toFixed(2)}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Suelo (Min)</Text>
                  <Text style={styles.statValue}>Bs. {stats.min.toFixed(2)}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Tendencia</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Ionicons name={stats.trendIcon as any} size={16} color={stats.trendColor} />
                    <Text style={[styles.statValue, { color: stats.trendColor, marginTop: 0 }]}>{stats.trend}</Text>
                  </View>
                </View>
              </View>
            </View>

          </ScrollView>
        </SafeAreaView>
        </GestureHandlerRootView>
      </Modal>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (navigation as any).openDrawer()} style={{ paddingRight: 12 }}>
          <Ionicons name="menu" size={32} color={G.p200} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Gráficas</Text>
          <Text style={{ color: G.t300, fontSize: 13, marginTop: 2 }}>Explora la volatilidad y rendimiento de divisas</Text>
        </View>
      </View>
      
      <View style={styles.filterRow}>
        {renderFilter("1W", "1 Sem")}
        {renderFilter("1M", "1 Mes")}
        {renderFilter("3M", "3 Mes")}
        {renderFilter("1Y", "1 Año")}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={G.p200} />
        </View>
      ) : chartData.length < 2 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 16 }}>
          <Ionicons name="bar-chart-outline" size={48} color={G.t400} />
          <Text style={{ color: G.t400 }}>No hay suficientes datos para graficar en este período.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} scrollEnabled={scrubIndex === null}>
          {renderChart("USD", "Dólar BCV", G.p200, usdData)}
          {renderChart("EUR", "Euro BCV", G.eur, eurData)}
          {hasUsdtData && renderChart("USDT", "USDT Binance", G.usdt, usdtData)}
          {renderComparativeChart()}

          {analytics && (
            <View style={{ gap: 12, marginTop: 10 }}>
              <Text style={styles.analyticsMainTitle}>Conclusiones del Período</Text>
              
              <View style={[styles.analyticsCard, { borderColor: G.p200 }]}>
                <View style={styles.analyticsRow}>
                  <View style={[styles.analyticsIconBox, { backgroundColor: "rgba(36,219,134,0.15)" }]}>
                    <Ionicons name="shield-checkmark" size={24} color={G.p200} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.analyticsTitle}>La Más Estable</Text>
                    <Text style={styles.analyticsDesc}>
                      El <Text style={{ color: G.t100, fontWeight: "bold" }}>{analytics.mostStable.name}</Text> fue la moneda más segura, variando solo un <Text style={{ color: G.p200, fontWeight: "bold" }}>{analytics.mostStable.vol.toFixed(2)}%</Text> entre su punto más bajo y alto.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.analyticsCard, { borderColor: G.danger }]}>
                <View style={styles.analyticsRow}>
                  <View style={[styles.analyticsIconBox, { backgroundColor: "rgba(239,68,68,0.15)" }]}>
                    <Ionicons name="warning" size={24} color={G.danger} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.analyticsTitle}>La Menos Estable</Text>
                    <Text style={styles.analyticsDesc}>
                      El <Text style={{ color: G.t100, fontWeight: "bold" }}>{analytics.leastStable.name}</Text> tuvo fluctuaciones salvajes, alcanzando una variación de <Text style={{ color: G.danger, fontWeight: "bold" }}>{analytics.leastStable.vol.toFixed(2)}%</Text>.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.analyticsCard, { borderColor: G.warning }]}>
                <View style={styles.analyticsRow}>
                  <View style={[styles.analyticsIconBox, { backgroundColor: "rgba(251,191,36,0.15)" }]}>
                    <Ionicons name="trending-up" size={24} color={G.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.analyticsTitle}>El Peor Salto (Día Pico)</Text>
                    <Text style={styles.analyticsDesc}>
                      El <Text style={{ color: G.t100, fontWeight: "bold" }}>{fmtDate(analytics.worstPeak.date)}</Text>, el <Text style={{ color: G.t100, fontWeight: "bold" }}>{analytics.worstPeak.name}</Text> saltó bruscamente un <Text style={{ color: G.warning, fontWeight: "bold" }}>+{analytics.worstPeak.pctIncrease.toFixed(2)}%</Text> de un día para otro.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {renderProModal()}

    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: G.bg100 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: Platform.OS === "android" ? 35 : 15, paddingBottom: 12 },
  headerTitle: { color: G.t100, fontSize: 20, fontWeight: "900" },
  
  filterRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 10, gap: 8 },
  filterBtn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, backgroundColor: G.bg300, borderWidth: 1, borderColor: G.bg400 },
  filterBtnActive: { backgroundColor: "rgba(36,219,134,0.15)", borderColor: G.p200 },
  filterText: { color: G.t400, fontSize: 13, fontWeight: "700" },
  filterTextActive: { color: G.p200 },

  content: { padding: 16, gap: 16, paddingBottom: 40 },
  
  chartCard: { backgroundColor: G.bg200, borderRadius: 20, paddingTop: 14, paddingBottom: 14, paddingHorizontal: 0, borderWidth: 1, borderColor: G.bg300, overflow: 'hidden' },
  chartHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  iconBox: { width: 30, height: 30, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  chartTitle: { color: G.t100, fontSize: 16, fontWeight: "700" },
  chartStyle: { borderRadius: 0, marginTop: 4 },

  tooltipContainer: { position: "absolute", backgroundColor: "rgba(0,0,0,0.8)", padding: 8, borderRadius: 12, borderWidth: 1, borderColor: G.p200, alignItems: "center", zIndex: 100 },
  tooltipValue: { color: G.t100, fontSize: 14, fontWeight: "900" },
  tooltipDate: { color: G.t300, fontSize: 11, fontWeight: "600", marginTop: 2 },

  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, paddingTop: Platform.OS === "android" ? 40 : 20 },
  modalCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: G.bg200, justifyContent: "center", alignItems: "center" },
  
  statBox: { width: "48%", backgroundColor: G.bg200, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: G.bg300 },
  statLabel: { color: G.t400, fontSize: 12, fontWeight: "bold", textTransform: "uppercase" },
  statValue: { color: G.t100, fontSize: 16, fontWeight: "800", marginTop: 4 },

  analyticsMainTitle: { color: G.t100, fontSize: 18, fontWeight: "800", marginBottom: 4, marginLeft: 4 },
  analyticsCard: { backgroundColor: G.bg200, borderRadius: 20, padding: 16, borderWidth: 2 },
  analyticsRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  analyticsIconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  analyticsTitle: { color: G.t100, fontSize: 16, fontWeight: "800", marginBottom: 4 },
  analyticsDesc: { color: G.t200, fontSize: 14, lineHeight: 22 },
});
