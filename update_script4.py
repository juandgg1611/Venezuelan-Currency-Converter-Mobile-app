import re

path = 'c:/conversor/src/screens/HomeScreen.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add states and logic for Numpad and MixedPaymentModal
logic_code = """
  const [mixedModalVisible, setMixedModalVisible] = useState(false);
  const [mixedTotal, setMixedTotal] = useState("");
  const [mixedCash, setMixedCash] = useState("");
  const [mixedTotalCurrency, setMixedTotalCurrency] = useState<"USD" | "EUR">("USD");
  const [mixedCashCurrency, setMixedCashCurrency] = useState<"USD" | "EUR">("USD");

  const remainingBs = React.useMemo(() => {
    if (!activeRates) return 0;
    const t = parseFloat(mixedTotal || "0");
    const c = parseFloat(mixedCash || "0");
    const tRate = mixedTotalCurrency === "USD" ? activeRates.USD : activeRates.EUR;
    const cRate = mixedCashCurrency === "USD" ? activeRates.USD : activeRates.EUR;
    const totalBs = t * tRate;
    const cashBs = c * cRate;
    return Math.max(0, totalBs - cashBs);
  }, [mixedTotal, mixedCash, mixedTotalCurrency, mixedCashCurrency, activeRates]);

  const handleNumpadPress = (val: string) => {
    if (val === "⌫") {
      setAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
      return;
    }
    setAmount((prev) => {
      if (val === "." && prev.includes(".")) return prev;
      if (prev === "0" && val !== ".") return val;
      const parts = prev.split(".");
      if (parts.length === 2 && parts[1].length >= 2) return prev;
      return prev + val;
    });
  };
"""

if "mixedModalVisible" not in content:
    content = content.replace('const [fabLoading, setFabLoading] = useState(false);', 'const [fabLoading, setFabLoading] = useState(false);\n' + logic_code)

# Import notifications
imports_code = """import {
  scheduleDailyRateNotifications,
} from "../services/notifications";"""
if "scheduleDailyRateNotifications" not in content:
    content = content.replace('import * as Clipboard from "expo-clipboard";', imports_code + '\nimport * as Clipboard from "expo-clipboard";')

# Add useEffect for notifications
effect_code = """
  useEffect(() => {
    scheduleDailyRateNotifications();
  }, []);
"""
if "scheduleDailyRateNotifications()" not in content:
    content = content.replace('useEffect(() => {\n    const loadPreferences = async () => {', effect_code + '\n  useEffect(() => {\n    const loadPreferences = async () => {')


# Fix amountRow replacing TextInput with fixed text, and inject CustomNumpad
amount_row_regex = r"<View\s+style=\{\[styles\.amountRow,\s*\{\s*borderColor:\s*fromCfg\.color\s*\+\s*\"40\"\s*\}\]\}\s*>\s*<View\s+style=\{\[\s*styles\.symbolOrb,\s*\{\s*backgroundColor:\s*fromCfg\.color\s*\+\s*\"12\"\s*\},\s*\]\}\s*>\s*<Text\s+style=\{\[styles\.symbolChar,\s*\{\s*color:\s*fromCfg\.color\s*\}\]\}>\s*\{fromCfg\.symbol\}\s*</Text>\s*</View>\s*<TextInput.*?/>"

new_amount_row = """<View
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

            <View style={[styles.amountField, { justifyContent: 'center' }]}>
              <Text
                style={{ color: fromCfg.color, fontSize: 34, fontWeight: "700" }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {amount || "0"}
              </Text>
            </View>"""

content = re.sub(amount_row_regex, new_amount_row, content, flags=re.DOTALL)

# Add CustomNumpad render
if "<CustomNumpad" not in content:
    amount_row_close = new_amount_row + "\n          </View>\n"
    replacement = amount_row_close + """
          <CustomNumpad onPress={handleNumpadPress} color={fromCfg.color} />
          
          <TouchableOpacity 
            style={{flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 12, backgroundColor: G.bg200, marginHorizontal: 20, borderRadius: 16, marginTop: 4}} 
            onPress={() => setMixedModalVisible(true)}
          >
            <Ionicons name="calculator-outline" size={20} color={G.p200} style={{marginRight: 6}} />
            <Text style={{color: G.p200, fontWeight: "700", fontSize: 15}}>Calculadora Pago Mixto</Text>
          </TouchableOpacity>
"""
    content = content.replace(amount_row_close, replacement)

# Append MixedPaymentModal near the end, right before the closing tag of HomeScreen
if "<MixedPaymentModal" not in content:
    end_tag = "    </SafeAreaView>\n  );\n}"
    mixed_modal_render = """
      <MixedPaymentModal
        visible={mixedModalVisible}
        onClose={() => setMixedModalVisible(false)}
        rates={activeRates}
        total={mixedTotal}
        totalCurrency={mixedTotalCurrency}
        cash={mixedCash}
        cashCurrency={mixedCashCurrency}
        onTotalChange={setMixedTotal}
        onCashChange={setMixedCash}
        setTotalCurrency={setMixedTotalCurrency}
        setCashCurrency={setMixedCashCurrency}
        remainingBs={remainingBs}
      />
"""
    content = content.replace(end_tag, mixed_modal_render + end_tag)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
