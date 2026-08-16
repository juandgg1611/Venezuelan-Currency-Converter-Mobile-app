import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Switch, Platform, FlatList, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { scheduleDailyRateNotifications, cancelDailyNotifications, areDailyNotificationsScheduled } from "../services/notifications";
import { scheduleUsdtAlerts, cancelUsdtAlerts, areUsdtAlertsActive } from "../services/usdtAlertTask";
import { notificationHistoryService, NotificationHistoryItem } from "../services/notificationHistory";
import { useFocusEffect } from "@react-navigation/native";
import { CurrencyIcon } from "./HomeScreen";

const G = {
  p100: "#0dbf69", p200: "#24db86", bg100: "#0d0d0d", bg200: "#141414", bg300: "#1c1c1c",
  bg400: "#252525", bg500: "#2e2e2e", t100: "#f0fdf4", t200: "#d3f8e7", t300: "#7beab6", t400: "#3a5a47",
  usdt: "#39c647", danger: "#ef4444"
};

export default function NotificationsScreen({ navigation }: any) {
  const [bcvOn, setBcvOn] = useState(false);
  const [usdtOn, setUsdtOn] = useState(false);
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon?: any;
    currency?: "USD" | "USDT" | "EUR" | "VES";
    color: string;
    onConfirm: () => void;
  } | null>(null);

  const loadHistory = async () => {
    const data = await notificationHistoryService.getHistory();
    setHistory(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  useEffect(() => {
    areDailyNotificationsScheduled().then(setBcvOn);
    areUsdtAlertsActive().then(setUsdtOn);
  }, []);

  const toggleBcv = async () => {
    if (bcvOn) {
      setBcvOn(false);
      await cancelDailyNotifications();
    } else {
      setConfirmModal({
        visible: true,
        title: "Notificaciones BCV",
        message: "¿Deseas recibir alertas diarias cuando el BCV actualice su tasa oficial?",
        currency: "USD",
        color: G.p200,
        onConfirm: () => {
          setConfirmModal(null);
          setBcvOn(true);
          scheduleDailyRateNotifications();
        }
      });
    }
  };

  const toggleUsdt = async () => {
    if (usdtOn) {
      setUsdtOn(false);
      await cancelUsdtAlerts();
    } else {
      setConfirmModal({
        visible: true,
        title: "Alertas USDT",
        message: "¿Deseas recibir alertas automáticas cuando el USDT P2P tenga movimientos bruscos?",
        currency: "USDT",
        color: G.usdt,
        onConfirm: () => {
          setConfirmModal(null);
          setUsdtOn(true);
          scheduleUsdtAlerts();
        }
      });
    }
  };

  const handleClearAll = () => {
    if (history.length === 0) return;
    setConfirmModal({
      visible: true,
      title: "Borrar Historial",
      message: "¿Estás seguro de que quieres borrar permanentemente todas las notificaciones?",
      icon: "trash-outline",
      color: G.danger,
      onConfirm: () => {
        setConfirmModal(null);
        notificationHistoryService.clearAll().then(() => {
          loadHistory();
        });
      }
    });
  };

  const renderHistoryItem = ({ item }: { item: NotificationHistoryItem }) => {
    const isUnread = !item.read;
    const date = new Date(item.timestamp);
    const timeStr = date.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
    const dateStr = date.toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit" });

    const bodyParts = item.body.split("|").map(s => s.trim()).filter(Boolean);

    return (
      <View style={[styles.historyCard, isUnread && styles.historyCardUnread]}>
        <View style={styles.historyCardHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <CurrencyIcon currency={item.type === "usdt" ? "USDT" : "VES"} size={30} />
            <Text style={[styles.historyCardTitle, { flexShrink: 1 }]} numberOfLines={1}>{item.title}</Text>
          </View>
          <Text style={styles.historyCardTime}>{dateStr} {timeStr}</Text>
        </View>

        <View style={styles.historyCardBodyContainer}>
          {bodyParts.map((part, idx) => (
            <View key={idx} style={styles.bodyPartPill}>
              <Text style={styles.bodyPartText}>{part}</Text>
            </View>
          ))}
        </View>

        <View style={styles.historyCardActions}>
          {isUnread && (
            <TouchableOpacity style={styles.actionBtn} onPress={async () => {
              await notificationHistoryService.markAsRead(item.id);
              loadHistory();
            }}>
              <Ionicons name="checkmark-done" size={16} color={G.p200} />
              <Text style={[styles.actionBtnText, { color: G.p200 }]}>Marcar leída</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={() => {
            setConfirmModal({
              visible: true,
              title: "Borrar Notificación",
              message: "¿Seguro que quieres borrar esta notificación del historial?",
              icon: "trash-outline",
              color: G.danger,
              onConfirm: async () => {
                await notificationHistoryService.deleteNotification(item.id);
                loadHistory();
                setConfirmModal(null);
              }
            });
          }}>
            <Ionicons name="trash-outline" size={16} color={G.t400} />
            <Text style={[styles.actionBtnText, { color: G.t400 }]}>Borrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (navigation as any).openDrawer()} style={{ paddingRight: 12 }}>
          <Ionicons name="menu" size={32} color={G.p200} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          <Text style={{ color: G.t300, fontSize: 13, marginTop: 2 }}>Administra tus alertas y avisos automáticos</Text>
        </View>
      </View>
      
      {/* Settings Section - Symmetrical Grid */}
      <View style={styles.settingsGrid}>
        <View style={styles.settingCard}>
          <View style={styles.settingCardHeader}>
            <CurrencyIcon currency="USD" size={42} />
            <Switch value={bcvOn} onValueChange={toggleBcv} trackColor={{ true: G.p200, false: G.bg400 }} thumbColor={G.t100} style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }} />
          </View>
          <Text style={styles.settingTitle}>Diarias BCV</Text>
          <Text style={styles.settingDesc}>Alertas cuando el BCV actualiza tasas</Text>
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingCardHeader}>
            <CurrencyIcon currency="USDT" size={42} />
            <Switch value={usdtOn} onValueChange={toggleUsdt} trackColor={{ true: G.p200, false: G.bg400 }} thumbColor={G.t100} style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }} />
          </View>
          <Text style={styles.settingTitle}>Alertas USDT</Text>
          <Text style={styles.settingDesc}>Avisos de movimientos bruscos P2P</Text>
        </View>
      </View>

      {/* History Section */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Historial</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearAllText}>Borrar todas</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={history}
        keyExtractor={item => item.id}
        renderItem={renderHistoryItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color={G.t400} />
            <Text style={styles.emptyText}>No tienes notificaciones recientes</Text>
          </View>
        }
      />

      {/* Custom Confirmation Modal */}
      {confirmModal && (
        <Modal transparent visible={confirmModal.visible} animationType="fade" onRequestClose={() => setConfirmModal(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {confirmModal.currency ? (
                <View style={{ marginBottom: 16 }}>
                  <CurrencyIcon currency={confirmModal.currency as any} size={56} />
                </View>
              ) : (
                <View style={[styles.modalIconBox, { backgroundColor: `${confirmModal.color}15` }]}>
                  <Ionicons name={confirmModal.icon} size={32} color={confirmModal.color} />
                </View>
              )}
              <Text style={styles.modalTitle}>{confirmModal.title}</Text>
              <Text style={styles.modalMessage}>{confirmModal.message}</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setConfirmModal(null)}>
                  <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtnConfirm, { backgroundColor: confirmModal.color }]} onPress={confirmModal.onConfirm}>
                  <Text style={styles.modalBtnConfirmText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: G.bg100 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: Platform.OS === "android" ? 35 : 15, paddingBottom: 12 },
  headerTitle: { color: G.t100, fontSize: 24, fontWeight: "900" },
  
  settingsGrid: { flexDirection: "row", gap: 12, paddingHorizontal: 20, marginTop: 12, marginBottom: 24 },
  settingCard: { flex: 1, backgroundColor: G.bg200, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: G.bg300 },
  settingCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  iconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  settingTitle: { color: G.t100, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  settingDesc: { color: G.t400, fontSize: 12, fontWeight: "500", lineHeight: 16 },

  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 },
  historyTitle: { color: G.t100, fontSize: 18, fontWeight: "700" },
  clearAllText: { color: G.danger, fontSize: 14, fontWeight: "600" },
  
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  historyCard: { backgroundColor: G.bg200, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: G.bg300 },
  historyCardUnread: { borderColor: G.p200, backgroundColor: "rgba(36, 219, 134, 0.05)" },
  historyCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  historyCardTitle: { color: G.t100, fontSize: 14, fontWeight: "700" },
  historyCardTime: { color: G.t400, fontSize: 12, fontWeight: "500" },
  historyCardBodyContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  bodyPartPill: { backgroundColor: G.bg300, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: G.bg400 },
  bodyPartText: { color: G.t100, fontSize: 13, fontWeight: "600" },
  historyCardActions: { flexDirection: "row", justifyContent: "flex-end", gap: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionBtnText: { fontSize: 13, fontWeight: "600" },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 16 },
  emptyText: { color: G.t400, fontSize: 16, fontWeight: "600" },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { backgroundColor: G.bg200, borderRadius: 24, padding: 24, width: "100%", maxWidth: 340, alignItems: "center", borderWidth: 1, borderColor: G.bg300 },
  modalIconBox: { width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: G.t100, fontSize: 20, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  modalMessage: { color: G.t200, fontSize: 15, fontWeight: "500", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  modalBtnCancel: { flex: 1, backgroundColor: G.bg400, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  modalBtnCancelText: { color: G.t200, fontSize: 15, fontWeight: "600" },
  modalBtnConfirm: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  modalBtnConfirmText: { color: G.bg100, fontSize: 15, fontWeight: "700" },
});
