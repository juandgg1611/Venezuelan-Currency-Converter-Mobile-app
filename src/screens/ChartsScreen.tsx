import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Platform, Dimensions, ActivityIndicator, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
import { historyService, RateSnapshot } from "../services/history";
import { useFocusEffect } from "@react-navigation/native";
import { CurrencyIcon } from "./HomeScreen";

const { width, height } = Dimensions.get("window");

const G = {
  p100: "#0dbf69", p200: "#24db86", bg100: "#0d0d0d", bg200: "#141414", bg300: "#1c1c1c",
  bg400: "#252525", t100: "#f0fdf4", t200: "#d3f8e7", t300: "#7beab6", t400: "#3a5a47",
  usdt: "#39c647", eur: "#3b82f6", danger: "#ef4444", warning: "#fbbf24"
};

type Period = "1W" | "1M" | "3M" | "1Y";

export default function ChartsScreen({ navigation }: any) {
  const [data, setData] = useState<RateSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("1M");

  const [tooltip, setTooltip] = useState<{ key: string, x: number, y: number, value: number, index: number } | null>(null);
  const [proModal, setProModal] = useState<string | null>(null);

  const loadData = async (p: Period) => {
    setLoading(true);
    setTooltip(null);
    const history = await historyService.getHistoryForPeriod(p);
    const valid = history.filter(h => h.usd > 0 && h.eur > 0);
    
    // Fix USDT drops
    for (let i = 0; i < valid.length; i++) {
      if (valid[i].usdt === 0) {
        if (i > 0) valid[i].usdt = valid[i - 1].usdt;
        else {
          const nextValid = valid.find(v => v.usdt > 0);
          if (nextValid) valid[i].usdt = nextValid.usdt;
        }
      }
    }
    setData(valid);
    setLoading(false);
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
        return dateObj.toLocaleDateString("es-VE", { weekday: "short" });
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
    strokeWidth: 2,
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
      onPress={() => setPeriod(p)}
    >
      <Text style={[styles.filterText, period === p && styles.filterTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const handleDataPointClick = (key: string, data: { value: number, x: number, y: number, index: number }) => {
    setTooltip({ key, x: data.x, y: data.y, value: data.value, index: data.index });
  };

  const renderTooltip = (key: string) => {
    if (tooltip?.key !== key) return null;
    return (
      <View style={[styles.tooltipContainer, { left: Math.max(0, tooltip.x - 30), top: tooltip.y + 10 }]}>
        <Text style={styles.tooltipValue}>Bs. {tooltip.value.toFixed(2)}</Text>
        <Text style={styles.tooltipDate}>{getFullDate(tooltip.index)}</Text>
      </View>
    );
  };

  const renderChart = (key: "USD" | "EUR" | "USDT", title: string, color: string, dset: number[]) => {
    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <CurrencyIcon currency={key} size={24} />
          <Text style={styles.chartTitle}>{title}</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => { setProModal(key); setTooltip(null); }} style={{ padding: 4, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: G.bg300, borderRadius: 8, paddingHorizontal: 8 }}>
            <Ionicons name="analytics" size={14} color={G.t300} />
            <Text style={{ color: G.t300, fontSize: 12, fontWeight: "bold" }}>PRO</Text>
          </TouchableOpacity>
        </View>
        <View style={{ position: "relative" }}>
            <LineChart
              data={{ labels, datasets: [{ data: dset, color: () => color }] }}
              width={width - 56} height={200}
              yAxisLabel="Bs. "
              chartConfig={{ ...chartConfig, color: () => color, propsForDots: { r: "3", strokeWidth: "2", stroke: color } }}
              bezier style={styles.chartStyle}
              withInnerLines={true} withOuterLines={false}
              onDataPointClick={(d) => handleDataPointClick(key, d)}
            />
            {renderTooltip(key)}
        </View>
      </View>
    );
  };

  const renderComparativeChart = () => {
    const key = "COMP";

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View style={[styles.iconBox, { backgroundColor: G.bg300 }]}>
            <Ionicons name="git-compare-outline" size={16} color={G.t100} />
          </View>
          <Text style={styles.chartTitle}>Comparativa Global</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => { setProModal(key); setTooltip(null); }} style={{ padding: 4, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: G.bg300, borderRadius: 8, paddingHorizontal: 8 }}>
            <Ionicons name="analytics" size={14} color={G.t300} />
            <Text style={{ color: G.t300, fontSize: 12, fontWeight: "bold" }}>PRO</Text>
          </TouchableOpacity>
        </View>
        <View style={{ position: "relative" }}>
            <LineChart
              data={{
                  labels,
                  legend: hasUsdtData ? ["USD", "EUR", "USDT"] : ["USD", "EUR"],
                  datasets: hasUsdtData ? [
                  { data: usdData, color: () => G.p200 },
                  { data: eurData, color: () => G.eur },
                  { data: usdtData, color: () => G.usdt }
                  ] : [
                  { data: usdData, color: () => G.p200 },
                  { data: eurData, color: () => G.eur }
                  ]
              }}
              width={width - 56} height={240}
              yAxisLabel="Bs. "
              chartConfig={{ ...chartConfig, color: () => G.t400 }}
              bezier style={styles.chartStyle}
              withInnerLines={true} withOuterLines={false}
              onDataPointClick={(d) => handleDataPointClick(key, d)}
            />
            {renderTooltip(key)}
        </View>
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
    
    const chartWidth = period === "1W" ? width + 150 : period === "1M" ? width + 90 : period === "3M" ? width + 50 : width + 30;

    if (isComp) {
      return (
        <Modal visible={true} animationType="slide" transparent={false} onRequestClose={() => setProModal(null)}>
          <SafeAreaView style={[styles.container, { backgroundColor: G.bg100 }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setProModal(null)} style={styles.modalCloseBtn}>
                  <Ionicons name="chevron-down" size={24} color={G.t100} />
                </TouchableOpacity>
                <Text style={{ color: G.t100, fontSize: 16, fontWeight: "bold" }}>Análisis Pro</Text>
                <View style={{ width: 40 }} />
              </View>

              {/* Dynamic Header */}
              <View style={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 20, alignItems: "center" }}>
                <Text style={{ color: G.t300, fontSize: 16, fontWeight: "600", marginBottom: 8 }}>Comparativa Global</Text>
                <Text style={{ color: G.t100, fontSize: 32, fontWeight: "900", letterSpacing: -1, textAlign: "center" }}>
                  Comportamiento del Período
                </Text>
              </View>

              <View style={{ alignItems: "center", marginBottom: 30, position: "relative" }}>
                <LineChart
                  data={{
                      labels: [],
                      legend: hasUsdtData ? ["USD", "EUR", "USDT"] : ["USD", "EUR"],
                      datasets: hasUsdtData ? [
                      { data: usdData, color: () => G.p200 },
                      { data: eurData, color: () => G.eur },
                      { data: usdtData, color: () => G.usdt }
                      ] : [
                      { data: usdData, color: () => G.p200 },
                      { data: eurData, color: () => G.eur }
                      ]
                  }}
                  width={chartWidth} height={350}
                  withDots={true}
                  withInnerLines={false}
                  withOuterLines={false}
                  withVerticalLabels={false}
                  withHorizontalLabels={false}
                  chartConfig={{ ...chartConfig, color: () => G.bg400, backgroundGradientFromOpacity: 0, backgroundGradientToOpacity: 0, fillShadowGradientFromOpacity: 0, propsForDots: { r: "3", strokeWidth: "0" } }}
                  bezier style={{ paddingRight: 0, marginLeft: -30, marginVertical: 8 }}
                  onDataPointClick={(d) => handleDataPointClick("PRO_COMP", d)}
                />
                {renderTooltip("PRO_COMP")}
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
        </Modal>
      );
    }
    
    const stats = getProStats(dset);
    if (!stats) return null;

    const currentVal = tooltip?.key === "PRO" ? tooltip.value : stats.endVal;
    const currentIndex = tooltip?.key === "PRO" ? tooltip.index : dset.length - 1;
    const pctChange = ((currentVal - stats.startVal) / stats.startVal) * 100;
    const isPositive = pctChange >= 0;

    return (
      <Modal visible={true} animationType="slide" transparent={false} onRequestClose={() => setProModal(null)}>
        <SafeAreaView style={[styles.container, { backgroundColor: G.bg100 }]}>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setProModal(null)} style={styles.modalCloseBtn}>
                <Ionicons name="chevron-down" size={24} color={G.t100} />
              </TouchableOpacity>
              <Text style={{ color: G.t100, fontSize: 16, fontWeight: "bold" }}>Análisis Pro</Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Dynamic Header */}
            <View style={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 20, alignItems: "center" }}>
              <Text style={{ color: G.t300, fontSize: 16, fontWeight: "600", marginBottom: 8 }}>{title}</Text>
              <Text style={{ color: G.t100, fontSize: 48, fontWeight: "900", letterSpacing: -1 }}>Bs. {currentVal.toFixed(2)}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, backgroundColor: isPositive ? "rgba(36,219,134,0.15)" : "rgba(239,68,68,0.15)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                <Ionicons name={isPositive ? "caret-up" : "caret-down"} size={16} color={isPositive ? G.p200 : G.danger} />
                <Text style={{ color: isPositive ? G.p200 : G.danger, fontSize: 16, fontWeight: "bold" }}>
                  {Math.abs(pctChange).toFixed(2)}%
                </Text>
              </View>
              <Text style={{ color: G.t400, fontSize: 12, marginTop: 8 }}>
                {getFullDate(currentIndex)}
              </Text>
            </View>

            {/* Area Chart using ChartKit */}
            <View style={{ alignItems: "center", marginBottom: 30, position: "relative" }}>
              <LineChart
                data={{ labels: [], datasets: [{ data: dset, color: () => color }] }}
                width={chartWidth}
                height={220}
                withDots={true}
                withInnerLines={false}
                withOuterLines={false}
                withVerticalLabels={false}
                withHorizontalLabels={false}
                chartConfig={{ ...chartConfig, color: () => color, backgroundGradientFromOpacity: 0, backgroundGradientToOpacity: 0, fillShadowGradientFrom: color, fillShadowGradientTo: G.bg100, propsForDots: { r: "3", strokeWidth: "0" } }}
                bezier
                style={{ paddingRight: 0, marginLeft: -30 }}
                onDataPointClick={(d) => handleDataPointClick("PRO", d)}
              />
              {renderTooltip("PRO")}
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
      </Modal>
    );
  };

  return (
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
        <ScrollView contentContainerStyle={styles.content}>
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
  
  chartCard: { backgroundColor: G.bg200, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: G.bg300 },
  chartHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  iconBox: { width: 30, height: 30, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  chartTitle: { color: G.t100, fontSize: 16, fontWeight: "700" },
  chartStyle: { borderRadius: 12, marginTop: 10 },

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
