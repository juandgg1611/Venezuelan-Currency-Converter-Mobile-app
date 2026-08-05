import re

path = 'c:/conversor/src/screens/HomeScreen.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add CustomNumpad Component
numpad_code = """
// ─── CUSTOM NUMPAD ─────────────────────────────────────────────
import * as Haptics from "expo-haptics";

const CustomNumpad = ({
  onPress,
  color,
}: {
  onPress: (val: string) => void;
  color: string;
}) => {
  const handlePress = (val: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(val);
  };

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "⌫"],
  ];

  return (
    <View style={styles.numpadContainer}>
      {keys.map((row, i) => (
        <View key={i} style={styles.numpadRow}>
          {row.map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.numpadKey, key === "0" && { flex: 1.5 }, { borderColor: G.bg400 }]}
              activeOpacity={0.7}
              onPress={() => handlePress(key)}
            >
              <Text style={[styles.numpadKeyText, key === "⌫" && { color }]}>
                {key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
};

"""

if "CustomNumpad = (" not in content:
    content = content.replace('// ─── PANTALLA PRINCIPAL ─────────────────────────────────────', numpad_code + '\n// ─── PANTALLA PRINCIPAL ─────────────────────────────────────')

# 2. Add MixedPaymentModal Component
mixed_payment_code = """
// ─── CALCULADORA PAGO MIXTO ──────────────────────────────────
const MixedPaymentModal = ({
  visible,
  onClose,
  rates,
  total,
  totalCurrency,
  cash,
  cashCurrency,
  onTotalChange,
  onCashChange,
  setTotalCurrency,
  setCashCurrency,
  remainingBs,
}: any) => {
  const slideAnim = useRef(new Animated.Value(600)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      slideAnim.setValue(600);
      overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 11, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 600, duration: 260, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  const handleShare = async () => {
    const msg = `🛍️ PAGO MIXTO\\n━━━━━━━━━━━━━\\nTotal a pagar: ${total || "0"} ${totalCurrency}\\nEfectivo: ${cash || "0"} ${cashCurrency}\\n\\nRestante en Bs.: Bs. ${parseFloat(remainingBs).toLocaleString("es-VE", { minimumFractionDigits: 2 })}\\n(a la tasa de Bs. ${rates?.USD.toFixed(2)} / USD)\\n━━━━━━━━━━━━━\\nCalculado con FinanzasIA`;
    try {
      await Sharing.shareAsync(msg);
    } catch (e) {
      console.log(e);
    }
  };

  if (!mounted && !visible) return null;

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.82)", opacity: overlayOpacity }} pointerEvents={visible ? "auto" : "none"}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <Animated.View style={{ position: "absolute", bottom: 0, left: 0, right: 0, transform: [{ translateY: slideAnim }], backgroundColor: G.bg200, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1, borderColor: G.bg500, paddingBottom: Platform.OS === "ios" ? 36 : 20, shadowColor: G.p100, shadowOpacity: 0.1, shadowRadius: 30, elevation: 24 }}>
        <View style={{ alignItems: "center", paddingTop: 12, marginBottom: 4 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: G.bg500 }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderColor: G.bg400 }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: G.euro + "18", justifyContent: "center", alignItems: "center", marginRight: 10 }}>
            <Ionicons name="cash-outline" size={17} color={G.euro} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: G.t100 }}>Pago Mixto</Text>
            <Text style={{ fontSize: 11, color: G.t400, marginTop: 1 }}>Calcula el restante en Bs.</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: G.bg400, justifyContent: "center", alignItems: "center" }}>
            <Ionicons name="close" size={16} color={G.t300} />
          </TouchableOpacity>
        </View>
        
        <View style={{ padding: 20, gap: 16 }}>
          <View>
            <Text style={{ color: G.t300, fontSize: 13, marginBottom: 6, fontWeight: "600" }}>Total a pagar</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput style={[styles.mixedInput, { flex: 1 }]} value={total} onChangeText={onTotalChange} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={G.t400} />
              <TouchableOpacity style={styles.mixedCurrencyBtn} onPress={() => setTotalCurrency(totalCurrency === "USD" ? "EUR" : "USD")}>
                <Text style={styles.mixedCurrencyText}>{totalCurrency}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View>
            <Text style={{ color: G.t300, fontSize: 13, marginBottom: 6, fontWeight: "600" }}>Efectivo a entregar</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput style={[styles.mixedInput, { flex: 1 }]} value={cash} onChangeText={onCashChange} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={G.t400} />
              <TouchableOpacity style={styles.mixedCurrencyBtn} onPress={() => setCashCurrency(cashCurrency === "USD" ? "EUR" : "USD")}>
                <Text style={styles.mixedCurrencyText}>{cashCurrency}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ backgroundColor: G.bg300, borderRadius: 16, padding: 16, marginTop: 8, borderWidth: 1, borderColor: G.bg400 }}>
            <Text style={{ color: G.t400, fontSize: 12, textAlign: "center", marginBottom: 4 }}>Restante a pagar por Pago Móvil</Text>
            <Text style={{ color: G.p200, fontSize: 32, fontWeight: "800", textAlign: "center" }}>Bs. {parseFloat(remainingBs).toLocaleString("es-VE", { minimumFractionDigits: 2 })}</Text>
          </View>

          <TouchableOpacity style={styles.mixedShareBtn} onPress={handleShare}>
            <Ionicons name="logo-whatsapp" size={20} color={G.bg100} style={{ marginRight: 8 }} />
            <Text style={{ color: G.bg100, fontSize: 16, fontWeight: "700" }}>Compartir por WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};
"""
if "MixedPaymentModal = (" not in content:
    content = content.replace('// ─── PANTALLA PRINCIPAL ─────────────────────────────────────', mixed_payment_code + '\n// ─── PANTALLA PRINCIPAL ─────────────────────────────────────')

# 3. Add styles
styles_to_add = """  numpadContainer: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
  },
  numpadRow: {
    flexDirection: "row",
    gap: 8,
  },
  numpadKey: {
    flex: 1,
    height: 52,
    backgroundColor: G.bg300,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: G.bg400,
  },
  numpadKeyText: {
    color: G.t100,
    fontSize: 24,
    fontWeight: "700",
  },
  mixedInput: {
    backgroundColor: G.bg300,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    color: G.t100,
    fontSize: 18,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: G.bg400,
  },
  mixedCurrencyBtn: {
    backgroundColor: G.p100 + "18",
    borderWidth: 1,
    borderColor: G.p200 + "44",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    height: 50,
  },
  mixedCurrencyText: {
    color: G.p200,
    fontWeight: "800",
  },
  mixedShareBtn: {
    backgroundColor: G.p100,
    flexDirection: "row",
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: G.p100,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },"""

if "numpadContainer:" not in content:
    content = content.replace("const styles = StyleSheet.create({", "const styles = StyleSheet.create({\n" + styles_to_add)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
