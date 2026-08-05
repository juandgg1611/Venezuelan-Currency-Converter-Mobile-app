import re

path = 'c:/conversor/src/screens/HomeScreen.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State logic
state_logic = """
  const [mixedModalVisible, setMixedModalVisible] = useState(false);
  const [mixedTotal, setMixedTotal] = useState("");
  const [mixedCash, setMixedCash] = useState("");
  const [mixedTotalCurrency, setMixedTotalCurrency] = useState<"USD" | "EUR">("USD");
  const [mixedCashCurrency, setCashCurrency] = useState<"USD" | "EUR">("USD");
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [calcVisible, setCalcVisible] = useState(false);

  const remainingBs = React.useMemo(() => {
    const activeRatesObj = historicalDate && historicalRates ? historicalRates : rates;
    if (!activeRatesObj) return 0;
    const t = parseFloat(mixedTotal || "0");
    const c = parseFloat(mixedCash || "0");
    const tRate = mixedTotalCurrency === "USD" ? activeRatesObj.USD : activeRatesObj.EUR;
    const cRate = mixedCashCurrency === "USD" ? activeRatesObj.USD : activeRatesObj.EUR;
    const totalBs = t * tRate;
    const cashBs = c * cRate;
    return Math.max(0, totalBs - cashBs);
  }, [mixedTotal, mixedCash, mixedTotalCurrency, mixedCashCurrency, rates, historicalDate, historicalRates]);
"""
content = content.replace("const [fabLoading, setFabLoading] = useState(false);", "const [fabLoading, setFabLoading] = useState(false);\n" + state_logic)


# 2. Add Notifications Import and useEffect
imports_code = """import { scheduleDailyRateNotifications } from "../services/notifications";"""
content = content.replace('import * as Clipboard from "expo-clipboard";', imports_code + '\nimport * as Clipboard from "expo-clipboard";')

effect_code = """
  useEffect(() => {
    if (notificationsOn) scheduleDailyRateNotifications();
  }, [notificationsOn]);
"""
content = content.replace('useEffect(() => {\n    const loadPreferences = async () => {', effect_code + '\n  useEffect(() => {\n    const loadPreferences = async () => {')


# 3. Header Buttons
header_buttons = r"\{/\* Botón calendario \*/\}.*?</TouchableOpacity>"
new_header_buttons = """{/* Botón calendario */}
            <TouchableOpacity
              style={[
                styles.refreshBtn,
                isHistoricalMode && {
                  borderColor: G.warning,
                  backgroundColor: G.warning + "15",
                },
              ]}
              onPress={() => setCalendarVisible(true)}
              disabled={historicalLoading}
            >
              {historicalLoading ? (
                <ActivityIndicator size="small" color={G.warning} />
              ) : (
                <Ionicons
                  name={isHistoricalMode ? "calendar" : "calendar-outline"}
                  size={20}
                  color={isHistoricalMode ? G.warning : G.p200}
                />
              )}
            </TouchableOpacity>

            {/* Botón Pago Mixto */}
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => setMixedModalVisible(true)}
            >
              <Ionicons name="calculator-outline" size={20} color={G.p200} />
            </TouchableOpacity>

            {/* Botón Notificaciones */}
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => setNotificationsOn(!notificationsOn)}
            >
              <Ionicons name={notificationsOn ? "notifications" : "notifications-outline"} size={20} color={G.p200} />
            </TouchableOpacity>"""
content = re.sub(header_buttons, new_header_buttons, content, flags=re.DOTALL)


# 4. Floating Calculator Button inside ScrollView
scroll_end = r"      </ScrollView>"
calc_button = """
        {/* BOTÓN FLOTANTE CALCULADORA */}
        <TouchableOpacity
          style={styles.calcFloatBtn}
          onPress={() => setCalcVisible(true)}
        >
          <Ionicons name="calculator" size={26} color={G.bg100} />
        </TouchableOpacity>
      </ScrollView>"""
content = re.sub(scroll_end, calc_button, content)


# 5. Fix `amountRow` height in styles
content = content.replace("minHeight: 70,", "minHeight: 70,\n    maxHeight: 70,")
content = content.replace("amountField: {\n    flex: 1,\n    fontSize: 34,", "amountField: {\n    flex: 1,\n    fontSize: 34,\n    maxHeight: 60,")


# 6. Components to inject
mixed_payment_code = """
// ─── CALCULADORA PAGO MIXTO ──────────────────────────────────
import * as Sharing from "expo-sharing";

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

  if (!mounted && !visible) return null;

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.82)", opacity: overlayOpacity }} pointerEvents={visible ? "auto" : "none"}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <Animated.View style={{ position: "absolute", bottom: 0, left: 0, right: 0, transform: [{ translateY: slideAnim }], backgroundColor: G.bg200, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 40, elevation: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: 20 }}>
          <Text style={{ flex: 1, fontSize: 16, fontWeight: "bold", color: G.t100 }}>Calculadora Pago Mixto</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={G.t300} /></TouchableOpacity>
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ color: G.t300 }}>Total</Text>
          <TextInput style={styles.mixedInput} value={total} onChangeText={onTotalChange} keyboardType="decimal-pad" placeholder="0" />
          <Text style={{ color: G.t300, marginTop: 10 }}>Efectivo entregado</Text>
          <TextInput style={styles.mixedInput} value={cash} onChangeText={onCashChange} keyboardType="decimal-pad" placeholder="0" />
          <View style={{ marginTop: 20, padding: 20, backgroundColor: G.bg300, borderRadius: 16 }}>
            <Text style={{ textAlign: 'center', color: G.p200, fontSize: 24, fontWeight: 'bold' }}>Restante: Bs {remainingBs.toFixed(2)}</Text>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
};

// ─── CALCULADORA MODAL ───────────────────────────────────────
const CalculatorModal = ({ visible, onClose }: any) => {
  const [display, setDisplay] = useState("");
  
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="slide">
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
        <View style={{ backgroundColor: G.bg200, height: "60%", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20 }}>
          <TouchableOpacity onPress={onClose} style={{ alignSelf: 'flex-end' }}><Ionicons name="close" size={24} color={G.t100} /></TouchableOpacity>
          <TextInput style={{ fontSize: 40, color: G.t100, textAlign: 'right', marginTop: 20 }} value={display} onChangeText={setDisplay} autoFocus keyboardType="phone-pad" />
        </View>
      </View>
    </Modal>
  );
};
"""

content = content.replace('// ─── PANTALLA PRINCIPAL ─────────────────────────────────────', mixed_payment_code + '\n// ─── PANTALLA PRINCIPAL ─────────────────────────────────────')

# Modals render
modals = """
      <MixedPaymentModal
        visible={mixedModalVisible}
        onClose={() => setMixedModalVisible(false)}
        rates={historicalDate && historicalRates ? historicalRates : rates}
        total={mixedTotal}
        totalCurrency={mixedTotalCurrency}
        cash={mixedCash}
        cashCurrency={mixedCashCurrency}
        onTotalChange={setMixedTotal}
        onCashChange={setMixedCash}
        setTotalCurrency={setMixedTotalCurrency}
        setCashCurrency={setCashCurrency}
        remainingBs={remainingBs}
      />
      <CalculatorModal visible={calcVisible} onClose={() => setCalcVisible(false)} />
"""
content = content.replace("</SafeAreaView>", modals + "\n    </SafeAreaView>")

# Add extra styles
extra_styles = """
  calcFloatBtn: {
    alignSelf: 'flex-end',
    marginRight: 20,
    marginBottom: 20,
    marginTop: 10,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: G.p200,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: G.p100,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
"""
content = content.replace("const styles = StyleSheet.create({", "const styles = StyleSheet.create({" + extra_styles)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
