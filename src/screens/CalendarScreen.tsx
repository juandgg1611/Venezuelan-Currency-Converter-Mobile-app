import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View, Platform, StatusBar, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ActivityIndicator, FlatList, TextInput, SectionList
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { historyService, RateSnapshot, UsdtRawEntry } from "../services/history";
import { RateCard, CurrencyIcon } from "./HomeScreen";
import { CurrencyCode } from "../services/api";

const G = {
  p100: "#0dbf69", p200: "#24db86", bg100: "#0d0d0d", bg200: "#141414", bg300: "#1c1c1c",
  bg400: "#252525", t100: "#f0fdf4", t200: "#d3f8e7", t300: "#7beab6", t400: "#3a5a47",
  warning: "#fbbf24", usdt: "#16a34a", glow: "#24db8640", eur: "#3b82f6", red: "#ef4444"
};

type Tab = "CALENDAR" | "BCV" | "USDT";
type HeatmapCurrency = "USD" | "EUR" | "USDT";

// ─── Helpers ───────────────────────────────────────────────────────
function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function fmt(dateStr: string) {
  try {
    const d = new Date(dateStr + "T12:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("es-VE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  } catch { return dateStr; }
}

function fmtLong(dateStr: string) {
  try {
    const d = new Date(dateStr + "T12:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch { return dateStr; }
}

const DAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];
const MONTH_LABELS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function getIntensity(v: number, min: number, max: number) {
  if (max === min) return 0.5;
  return (v - min) / (max - min);
}
function heatColor(intensity: number) {
  if (intensity < 0.33) return "rgba(36,219,134,";
  if (intensity < 0.66) return "rgba(251,191,36,";
  return "rgba(239,68,68,";
}

// ─── Heatmap Component ─────────────────────────────────────────────
function HeatmapCalendar({
  snapMap, viewYear, viewMonth, activeCurrency, selectedDate, onSelectDate, loading
}: {
  snapMap: Record<string, RateSnapshot>;
  viewYear: number; viewMonth: number;
  activeCurrency: HeatmapCurrency;
  selectedDate: string | null;
  onSelectDate: (d: string) => void;
  loading: boolean;
}) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const grid = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthStats = useMemo(() => {
    const vals = grid
      .filter((d): d is Date => d !== null)
      .map(d => snapMap[d.toISOString().split("T")[0]])
      .filter(Boolean)
      .map(s => s[activeCurrency.toLowerCase() as "usd" | "eur" | "usdt"])
      .filter(v => v > 0);
    if (!vals.length) return null;
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [grid, snapMap, activeCurrency]);

  return (
    <View style={s.calendarCard}>
      <View style={s.daysRow}>
        {DAY_LABELS.map((d, i) => <Text key={i} style={s.dayLabel}>{d}</Text>)}
      </View>
      <View style={s.grid}>
        {grid.map((date, i) => {
          if (!date) return <View key={i} style={s.cellEmpty} />;
          const ds = date.toISOString().split("T")[0];
          const snap = snapMap[ds];
          const hasData = !!snap;
          const isToday = ds === todayStr;
          const isSelected = ds === selectedDate;
          const isFuture = date > today;
          const val = snap ? snap[activeCurrency.toLowerCase() as "usd" | "eur" | "usdt"] : 0;
          const isBankHoliday = activeCurrency !== "USDT" && !loading && monthStats && date.getDay() === 1 && val === 0 && !isFuture;

          let fill = "rgba(20,20,20,0.4)";
          let border = "rgba(37,37,37,0.6)";

          if (isBankHoliday) {
            fill = "rgba(168,85,247,0.15)";
            border = "rgba(168,85,247,0.5)";
          } else if (hasData && monthStats && val > 0) {
            const inten = getIntensity(val, monthStats.min, monthStats.max);
            const col = heatColor(inten);
            const alpha = 0.12 + inten * 0.38;
            fill = `${col}${alpha.toFixed(2)})`;
            border = `${col}${(alpha + 0.22).toFixed(2)})`;
          }

          return (
            <TouchableOpacity
              key={i}
              disabled={(!hasData && !isBankHoliday) || isFuture}
              onPress={() => hasData && onSelectDate(ds)}
              style={[
                s.cell,
                { backgroundColor: isSelected ? "rgba(36,219,134,0.18)" : fill },
                { borderColor: isSelected ? G.p200 : isToday ? "rgba(36,219,134,0.55)" : border },
                isFuture && { opacity: 0.28 }
              ]}
            >
              <Text style={[s.cellDate,
                isSelected ? { color: G.p200 } :
                isToday ? { color: G.p200 } :
                hasData || isBankHoliday ? { color: G.t100 } :
                { color: "rgba(123,234,182,0.3)" }
              ]}>
                {date.getDate()}
              </Text>
              {hasData && val > 0 && (
                <Text style={[s.cellValue, isSelected && { color: G.p200 }]}>
                  {val >= 1000 ? `${(val/1000).toFixed(1)}k` : val.toFixed(0)}
                </Text>
              )}
              {isBankHoliday && (
                <Ionicons name="briefcase" size={10} color="#a855f7" style={{ marginTop: 2 }} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {loading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color={G.p200} />
        </View>
      )}
      <View style={s.legend}>
        <Ionicons name="snow" size={12} color={G.p200} />
        <Text style={s.legendText}> Bajo </Text>
        <View style={s.legendBar} />
        <Text style={s.legendText}> Alto </Text>
        <Ionicons name="flame" size={12} color={G.red} />
      </View>
      
      {/* Info nota */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginHorizontal: 8,
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
        <Text style={{ fontSize: 11, color: G.t400, flex: 1, lineHeight: 16 }}>
          Los fines de semana usan la tasa del lunes siguiente. Los <Text style={{color: "#a855f7", fontWeight: "bold"}}>lunes bancarios</Text> no reportan tasa oficial.
        </Text>
      </View>
    </View>
  );
}

// ─── Detail Popup (shown below calendar on tap) ────────────────────
function DayDetail({ snap, onClose }: { snap: RateSnapshot; onClose: () => void }) {
  return (
    <View style={s.detailCard}>
      <View style={s.detailHeader}>
        <Text style={s.detailDate}>{fmtLong(snap.date)}</Text>
        <TouchableOpacity onPress={onClose} style={s.detailClose}>
          <Ionicons name="close" size={18} color={G.t200} />
        </TouchableOpacity>
      </View>
      <View style={s.detailBody}>
        <View style={{ gap: 12 }}>
          <RateCard currency="USD" value={snap.usd} source="BCV" delay={50} />
          <RateCard currency="EUR" value={snap.eur} source="BCV" delay={100} />
          {snap.usdt > 0 && (
            <RateCard currency="USDT" value={snap.usdt} source="Binance" delay={150} />
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────
export default function CalendarScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<Tab>("CALENDAR");

  // Calendar state
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [activeCurrency, setActiveCurrency] = useState<HeatmapCurrency>("USD");
  const [snapMap, setSnapMap] = useState<Record<string, RateSnapshot>>({});
  const [monthCache, setMonthCache] = useState<Record<string, Record<string, RateSnapshot>>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // BCV list state
  const [bcvData, setBcvData] = useState<RateSnapshot[]>([]);
  const [bcvPage, setBcvPage] = useState(0);
  const [bcvMore, setBcvMore] = useState(true);
  const [bcvLoading, setBcvLoading] = useState(false);
  const [bcvSearch, setBcvSearch] = useState("");

  // USDT list state
  const [usdtData, setUsdtData] = useState<RateSnapshot[]>([]);
  const [usdtPage, setUsdtPage] = useState(0);
  const [usdtMore, setUsdtMore] = useState(true);
  const [usdtSearch, setUsdtSearch] = useState("");
  const [usdtLoading, setUsdtLoading] = useState(false);

  const canGoNext = viewYear < today.getFullYear() || (viewYear === today.getFullYear() && viewMonth < today.getMonth());

  // Load heatmap on month change
  useEffect(() => {
    const cacheKey = `${viewYear}-${viewMonth}`;
    if (monthCache[cacheKey]) {
      setSnapMap(monthCache[cacheKey]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSnapMap({});
    setSelectedDate(null);
    
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    const nextM = viewMonth === 11 ? 1 : viewMonth + 2;

    Promise.all([
      historyService.getHistory(viewYear, viewMonth + 1).catch(() => []),
      historyService.getHistory(nextY, nextM).catch(() => [])
    ]).then(([currentData, nextData]) => {
      const allData = [...currentData, ...nextData];
      const m: Record<string, RateSnapshot> = {};
      for (const s of allData) m[s.date] = s;
      
      // Resolve weekends (use next Monday's rate)
      for (const s of allData) {
        const d = new Date(s.date + "T12:00:00");
        if (d.getDay() === 1) { // Lunes
          // Domingo previo
          const sun = new Date(d); sun.setDate(d.getDate() - 1);
          const sunDs = sun.toISOString().split("T")[0];
          if (!m[sunDs]) {
            m[sunDs] = { ...s, date: sunDs, time: "Tasa del Lunes" };
          } else if (m[sunDs].usd === 0) {
            m[sunDs].usd = s.usd;
            m[sunDs].eur = s.eur;
          }
          
          // Sábado previo
          const sat = new Date(d); sat.setDate(d.getDate() - 2);
          const satDs = sat.toISOString().split("T")[0];
          if (!m[satDs]) {
            m[satDs] = { ...s, date: satDs, time: "Tasa del Lunes" };
          } else if (m[satDs].usd === 0) {
            m[satDs].usd = s.usd;
            m[satDs].eur = s.eur;
          }
        }
      }

      setMonthCache(prev => ({ ...prev, [cacheKey]: m }));
      setSnapMap(m);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [viewYear, viewMonth]);

  // Load BCV list
  const loadBcvPage = useCallback(async (page: number, reset: boolean) => {
    if (bcvLoading) return;
    setBcvLoading(true);
    const d = new Date(today.getFullYear(), today.getMonth() - page, 1);
    const data = await historyService.getBcvHistory(d.getFullYear(), d.getMonth() + 1);
    const filtered = bcvSearch
      ? data.filter(i => i.date.includes(bcvSearch))
      : data;
    if (reset) setBcvData(filtered);
    else setBcvData(prev => {
      const seen = new Set(prev.map(x => x.date));
      return [...prev, ...filtered.filter(x => !seen.has(x.date))];
    });
    setBcvMore(filtered.length > 0);
    setBcvLoading(false);
  }, [bcvLoading, bcvSearch]);

  useEffect(() => {
    setBcvPage(0);
    setBcvData([]);
    setBcvMore(true);
    loadBcvPage(0, true);
  }, [bcvSearch, activeTab === "BCV"]);

  // Load USDT list
  const loadUsdtPage = useCallback(async (page: number, reset: boolean) => {
    if (usdtLoading) return;
    setUsdtLoading(true);
    const d = new Date(today.getFullYear(), today.getMonth() - page, 1);
    let data = await historyService.getUsdtDetailedHistory(d.getFullYear(), d.getMonth() + 1);
    data = data.filter(i => i.usdt > 0);
    const filtered = usdtSearch
      ? data.filter(i => i.date.includes(usdtSearch) || (i.time && i.time.includes(usdtSearch)))
      : data;
    if (reset) setUsdtData(filtered);
    else setUsdtData(prev => {
      const seen = new Set(prev.map(x => `${x.date}-${x.time}`));
      return [...prev, ...filtered.filter(x => !seen.has(`${x.date}-${x.time}`))];
    });
    setUsdtMore(filtered.length > 0 || page < 12);
    setUsdtLoading(false);
  }, [usdtLoading, usdtSearch]);

  useEffect(() => {
    setUsdtPage(0);
    setUsdtData([]);
    setUsdtMore(true);
    loadUsdtPage(0, true);
  }, [usdtSearch, activeTab === "USDT"]);

  const selectedSnap = selectedDate ? snapMap[selectedDate] : null;

  const monthStats = useMemo(() => {
    const vals = Object.values(snapMap)
      .filter(s => s.date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`))
      .map(s => s[activeCurrency.toLowerCase() as "usd" | "eur" | "usdt"])
      .filter(v => v > 0);
    return vals.length ? { count: vals.length } : null;
  }, [snapMap, viewYear, viewMonth, activeCurrency]);

  const goPrev = () => {
    setViewMonth(m => { if (m === 0) { setViewYear(y => y - 1); return 11; } return m - 1; });
  };
  const goNext = () => {
    if (!canGoNext) return;
    setViewMonth(m => { if (m === 11) { setViewYear(y => y + 1); return 0; } return m + 1; });
  };

  // ── Tab: Calendar ──
  const renderCalendarTab = () => (
    <FlatList
      data={[]}
      keyExtractor={() => ""}
      renderItem={null}
      ListHeaderComponent={() => (
        <View>
          {/* Currency Selector */}
          <View style={s.currencySelector}>
            {(["USD", "EUR", "USDT"] as HeatmapCurrency[]).map(c => {
              const active = activeCurrency === c;
              const color = c === "EUR" ? G.eur : c === "USDT" ? G.usdt : G.p200;

              return (
                <TouchableOpacity key={c} onPress={() => setActiveCurrency(c)}
                  style={[s.currencyBtn, { flexDirection: "row", justifyContent: "center", paddingVertical: 14 }, active && { borderColor: color, backgroundColor: `${color}18` }]}>
                  <View style={{ marginRight: 6 }}>
                    <CurrencyIcon currency={c} size={20} />
                  </View>
                  <Text style={[s.currencyBtnText, { color: active ? color : G.t300, fontSize: 15 }]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Month Nav */}
          <View style={s.monthNav}>
            <TouchableOpacity onPress={goPrev} style={s.navBtn}>
              <Ionicons name="chevron-back" size={20} color={G.t200} />
            </TouchableOpacity>
            <View style={s.monthTextContainer}>
              <Text style={s.monthTitle}>{MONTH_LABELS[viewMonth]} {viewYear}</Text>
              <Text style={s.monthSub}>{monthStats ? `${monthStats.count} días` : "Sin datos"}</Text>
            </View>
            <TouchableOpacity onPress={goNext} disabled={!canGoNext}
              style={[s.navBtn, !canGoNext && { opacity: 0.3 }]}>
              <Ionicons name="chevron-forward" size={20} color={G.t200} />
            </TouchableOpacity>
          </View>

          {/* Heatmap */}
          <HeatmapCalendar
            snapMap={snapMap}
            viewYear={viewYear} viewMonth={viewMonth}
            activeCurrency={activeCurrency}
            selectedDate={selectedDate}
            onSelectDate={d => setSelectedDate(prev => prev === d ? null : d)}
            loading={loading}
          />

          {/* Day Detail */}
          {selectedSnap && <DayDetail snap={selectedSnap} onClose={() => setSelectedDate(null)} />}
        </View>
      )}
      contentContainerStyle={s.scrollContent}
    />
  );

  // ── Tab: BCV List ──
  const renderBcvItem = useCallback(({ item }: { item: RateSnapshot }) => (
    <View style={s.historyCard}>
      <View style={s.historyCardHeader}>
        <View style={s.historyDateBadge}>
          <Ionicons name="calendar-outline" size={15} color={G.p200} style={{ marginRight: 5 }} />
          <Text style={s.historyDateText}>{fmt(item.date)}</Text>
        </View>
      </View>
      <View style={s.historyRates}>
        <View style={s.rateBlock}>
          <CurrencyIcon currency="USD" size={26} />
          <Text style={[s.rateValue, { color: G.t100 }]}>Bs. {item.usd.toFixed(2)}</Text>
        </View>
        <View style={[s.rateDivider]} />
        <View style={s.rateBlock}>
          <CurrencyIcon currency="EUR" size={26} />
          <Text style={[s.rateValue, { color: G.t100 }]}>Bs. {item.eur > 0 ? item.eur.toFixed(2) : "—"}</Text>
        </View>
      </View>
    </View>
  ), []);

  const renderBcvTab = () => (
    <FlatList
      data={bcvData}
      keyExtractor={item => item.date}
      renderItem={renderBcvItem}
      contentContainerStyle={s.scrollContent}
      initialNumToRender={12}
      maxToRenderPerBatch={10}
      windowSize={5}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (!bcvMore || bcvLoading) return;
        const next = bcvPage + 1;
        setBcvPage(next);
        loadBcvPage(next, false);
      }}
      ListHeaderComponent={(
        <View style={s.searchContainer}>
          <Ionicons name="search" size={18} color={G.t200} />
          <TextInput style={s.searchInput} placeholder="Buscar fecha (2025-07)..."
            placeholderTextColor="rgba(211,248,231,0.35)" value={bcvSearch}
            onChangeText={setBcvSearch} />
          {bcvSearch ? (
            <TouchableOpacity onPress={() => setBcvSearch("")}>
              <Ionicons name="close-circle" size={18} color={G.t300} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      ListFooterComponent={bcvLoading ? <ActivityIndicator color={G.p200} style={{ marginVertical: 20 }} /> : null}
      ListEmptyComponent={!bcvLoading ? (
        <View style={s.emptyState}>
          <Ionicons name="bar-chart-outline" size={48} color={G.t400} />
          <Text style={s.emptyText}>Sin datos BCV</Text>
        </View>
      ) : null}
    />
  );

  // ── Tab: USDT List ──
  const renderUsdtItem = useCallback(({ item, index }: { item: RateSnapshot; index: number }) => {
    const isDayEnd = index < usdtData.length - 1 && usdtData[index].date !== usdtData[index + 1].date;
    
    return (
      <View>
        <View style={[s.historyCard, isDayEnd ? { marginBottom: 20 } : { marginBottom: 10 }]}>
          <View style={s.historyCardHeader}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: 8, flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="calendar-outline" size={15} color={G.usdt} style={{ marginRight: 6 }} />
                <Text style={[s.historyDateText, { flexShrink: 1 }]} numberOfLines={2}>{fmtLong(item.date)}</Text>
              </View>
              <View style={s.usdtTimeBadge}>
                <Ionicons name="time-outline" size={13} color={G.t200} style={{ marginRight: 4 }} />
                <Text style={s.usdtTimeText}>{item.time || "Promedio"}</Text>
              </View>
            </View>
          </View>
          <View style={s.historyRates}>
            <View style={s.rateBlock}>
              <CurrencyIcon currency="USDT" size={26} />
              <Text style={[s.rateValue, { color: G.t100 }]}>Bs. {item.usdt.toFixed(2)}</Text>
            </View>
          </View>
        </View>
        {isDayEnd && (
          <View style={{ height: 1, backgroundColor: G.bg400, marginHorizontal: 50, marginBottom: 20, borderRadius: 1 }} />
        )}
      </View>
    );
  }, [usdtData]);

  const renderUsdtTab = () => (
    <FlatList
      data={usdtData}
      keyExtractor={(item, i) => `${item.date}-${i}`}
      renderItem={renderUsdtItem}
      contentContainerStyle={s.scrollContent}
      initialNumToRender={12}
      maxToRenderPerBatch={10}
      windowSize={5}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (!usdtMore || usdtLoading) return;
        const next = usdtPage + 1;
        setUsdtPage(next);
        loadUsdtPage(next, false);
      }}
      ListHeaderComponent={(
        <View>
          <View style={[s.infoBox, { marginBottom: 16 }]}>
            <Ionicons name="information-circle" size={16} color={G.usdt} />
            <Text style={s.infoText}> Historial P2P con cortes horarios (8 AM, 12 PM, 4 PM, 8 PM, 12 AM)</Text>
          </View>
          <View style={s.searchContainer}>
            <Ionicons name="search" size={18} color={G.t200} />
            <TextInput style={s.searchInput} placeholder="Buscar fecha (2025-08-14)..."
              placeholderTextColor="rgba(211,248,231,0.35)" value={usdtSearch}
              onChangeText={setUsdtSearch} />
            {usdtSearch ? (
              <TouchableOpacity onPress={() => setUsdtSearch("")}>
                <Ionicons name="close-circle" size={18} color={G.t300} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}
      ListFooterComponent={usdtLoading ? <ActivityIndicator color={G.usdt} style={{ marginVertical: 20 }} /> : null}
      ListEmptyComponent={!usdtLoading ? (
        <View style={s.emptyState}>
          <Ionicons name="logo-bitcoin" size={48} color={G.t400} />
          <Text style={s.emptyText}>Sin registros USDT</Text>
          <Text style={s.emptySubText}>Abre la app frecuentemente para acumular historial</Text>
        </View>
      ) : null}
    />
  );

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => (navigation as any).openDrawer()} style={{ paddingRight: 12 }}>
          <Ionicons name="menu" size={32} color={G.p200} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Historial</Text>
          <Text style={{ color: G.t300, fontSize: 13, marginTop: 2 }}>Analiza el historial de precios y feriados bancarios</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {([
          { key: "CALENDAR", label: "Calendario", icon: "calendar" },
          { key: "BCV", label: "BCV", icon: "trending-up" },
          { key: "USDT", label: "USDT P2P", icon: "logo-bitcoin" },
        ] as { key: Tab; label: string; icon: any }[]).map(t => {
          const active = activeTab === t.key;
          return (
            <TouchableOpacity key={t.key} onPress={() => setActiveTab(t.key)}
              style={[s.tab, active && s.tabActive]}>
              <Ionicons name={t.icon} size={14} color={active ? G.p200 : G.t300} style={{ marginRight: 4 }} />
              <Text style={[s.tabText, active && { color: G.p200 }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      {activeTab === "CALENDAR" && renderCalendarTab()}
      {activeTab === "BCV" && renderBcvTab()}
      {activeTab === "USDT" && renderUsdtTab()}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: G.bg100 },

  // Header
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: Platform.OS === "android" ? 35 : 15, paddingBottom: 12 },
  headerTitle: { color: G.t100, fontSize: 24, fontWeight: "900" },

  // Tabs
  tabs: { flexDirection: "row", marginHorizontal: 16, marginBottom: 8, backgroundColor: G.bg300, borderRadius: 12, padding: 4 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 9, borderRadius: 9 },
  tabActive: { backgroundColor: "rgba(36,219,134,0.13)", borderWidth: 1, borderColor: "rgba(36,219,134,0.3)" },
  tabText: { color: G.t300, fontSize: 12, fontWeight: "700" },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  // Currency selector
  currencySelector: { flexDirection: "row", gap: 10, marginBottom: 14 },
  currencyBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: G.bg400 },
  currencyBtnText: { fontSize: 14, fontWeight: "800" },

  // Month nav
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  navBtn: { padding: 10, backgroundColor: G.bg300, borderRadius: 10, borderWidth: 1, borderColor: G.bg400 },
  monthTextContainer: { alignItems: "center" },
  monthTitle: { color: G.t100, fontSize: 18, fontWeight: "800" },
  monthSub: { color: G.t200, opacity: 0.5, fontSize: 11, marginTop: 2 },

  // Heatmap calendar card
  calendarCard: { backgroundColor: G.bg200, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: G.bg300, marginBottom: 16, overflow: "hidden" },
  daysRow: { flexDirection: "row", marginBottom: 6 },
  dayLabel: { flex: 1, textAlign: "center", color: G.t200, opacity: 0.4, fontSize: 11, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  cellEmpty: { width: "13%", aspectRatio: 1, marginBottom: 6 },
  cell: { width: "13%", aspectRatio: 1, marginBottom: 6, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  cellDate: { fontSize: 13, fontWeight: "700" },
  cellValue: { fontSize: 8, fontWeight: "700", marginTop: 1, color: "rgba(240,253,244,0.5)" },
  todayDot: { position: "absolute", bottom: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: G.p200 },
  loadingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(20,20,20,0.7)", alignItems: "center", justifyContent: "center" },
  legend: { flexDirection: "row", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: G.bg400 },
  legendBar: { flex: 1, height: 3, marginHorizontal: 10, borderRadius: 2, backgroundColor: G.bg400 },
  legendText: { color: G.t200, opacity: 0.45, fontSize: 10, fontWeight: "700" },

  // Day detail
  detailCard: { backgroundColor: G.bg200, borderRadius: 18, borderWidth: 1, borderColor: G.bg300, marginBottom: 16, overflow: "hidden" },
  detailHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: G.bg300 },
  detailDate: { color: G.t100, fontSize: 14, fontWeight: "700", textTransform: "capitalize", flex: 1 },
  detailClose: { padding: 4 },
  detailBody: { padding: 16 },

  // Search
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: G.bg200, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderColor: G.bg300, marginBottom: 14, gap: 8 },
  searchInput: { flex: 1, color: G.t100, fontSize: 14 },

  // BCV history card
  historyCard: { backgroundColor: G.bg200, borderRadius: 16, borderWidth: 1, borderColor: G.bg300, marginBottom: 10, overflow: "hidden" },
  historyCardHeader: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: G.bg300 },
  historyDateBadge: { flexDirection: "row", alignItems: "center" },
  historyDateText: { color: G.t200, fontSize: 15, fontWeight: "700", textTransform: "capitalize" },
  historyRates: { flexDirection: "row", padding: 14, gap: 12 },
  rateBlock: { flex: 1, alignItems: "center", gap: 6 },
  ratePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  ratePillLabel: { fontSize: 11, fontWeight: "900" },
  rateValue: { fontSize: 17, fontWeight: "900" },
  rateDivider: { width: 1, backgroundColor: G.bg400, alignSelf: "stretch" },

  // USDT specific
  usdtTimeBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  usdtTimeText: { color: G.t200, fontSize: 12, fontWeight: "700" },

  // Info box
  infoBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(22,163,74,0.08)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(22,163,74,0.2)" },
  infoText: { color: G.t200, opacity: 0.7, fontSize: 12, flex: 1 },

  // Empty state
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { color: G.t200, opacity: 0.5, fontSize: 16, fontWeight: "700" },
  emptySubText: { color: G.t200, opacity: 0.35, fontSize: 12, textAlign: "center", paddingHorizontal: 40 },
});
