import re

path = 'c:/conversor/src/screens/HomeScreen.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Move FAB outside ScrollView
old_fab = """        {/* BOTÓN FLOTANTE CALCULADORA */}
        <TouchableOpacity
          style={styles.calcFloatBtn}
          onPress={() => setCalcVisible(true)}
        >
          <Ionicons name="calculator" size={26} color={G.bg100} />
        </TouchableOpacity>
      </ScrollView>"""

new_fab = """      </ScrollView>
      
      {/* BOTÓN FLOTANTE CALCULADORA (GLOBAL) */}
      <TouchableOpacity
        style={styles.calcFloatBtn}
        onPress={() => setCalcVisible(true)}
      >
        <Ionicons name="calculator" size={28} color={G.bg100} />
      </TouchableOpacity>"""

content = content.replace(old_fab, new_fab)

# 2. Update styles for calcFloatBtn to be absolute
old_style = """  calcFloatBtn: {
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
  },"""

new_style = """  calcFloatBtn: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: G.p200,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: G.p100,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 999,
  },"""
content = content.replace(old_style, new_style)


# 3. Rewrite CalculatorModal
old_modal = r"// ─── CALCULADORA MODAL ───+.*?export default function HomeScreen\(\) \{"

new_modal = """// ─── CALCULADORA INTEGRADA ──────────────────────────────────
import * as Haptics from "expo-haptics";

const CalculatorModal = ({ visible, onClose }: any) => {
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(600);
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handlePress = (val: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (val === "C") {
      setDisplay("0");
      setExpression("");
      return;
    }
    
    if (val === "=") {
      try {
        const result = eval(expression.replace(/×/g, "*").replace(/÷/g, "/"));
        setDisplay(String(result));
        setExpression(String(result));
      } catch (e) {
        setDisplay("Error");
        setExpression("");
      }
      return;
    }

    setExpression(prev => prev + val);
    setDisplay(prev => (prev === "0" ? val : prev + val));
  };

  const keys = [
    ["C", "÷", "×", "⌫"],
    ["7", "8", "9", "-"],
    ["4", "5", "6", "+"],
    ["1", "2", "3", "="],
    ["0", ".", "00", ""],
  ];

  if (!visible && slideAnim._value === 600) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }} activeOpacity={1} onPress={onClose} />
      <Animated.View style={{ position: "absolute", bottom: 0, left: 0, right: 0, transform: [{ translateY: slideAnim }], backgroundColor: G.bg200, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, elevation: 24 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Text style={{ color: G.t300, fontSize: 16, fontWeight: "600" }}>Calculadora</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={28} color={G.t400} /></TouchableOpacity>
        </View>

        <View style={{ backgroundColor: G.bg100, borderRadius: 16, padding: 20, marginBottom: 20, alignItems: "flex-end" }}>
          <Text style={{ color: G.t300, fontSize: 18, minHeight: 24 }}>{expression}</Text>
          <Text style={{ color: G.t100, fontSize: 42, fontWeight: "bold" }}>{display}</Text>
        </View>

        <View style={{ gap: 12 }}>
          {keys.map((row, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12 }}>
              {row.map((k, j) => (
                k ? (
                  <TouchableOpacity 
                    key={j} 
                    style={{ flex: k === "=" ? 1 : 1, height: 60, backgroundColor: k.match(/[0-9.]/) ? G.bg300 : G.p100 + "22", borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: G.bg400 }} 
                    onPress={() => {
                      if (k === "⌫") {
                        setExpression(prev => prev.slice(0, -1));
                        setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : "0");
                      } else {
                        handlePress(k);
                      }
                    }}
                  >
                    <Text style={{ color: k.match(/[0-9.]/) ? G.t100 : G.p200, fontSize: 24, fontWeight: "bold" }}>{k}</Text>
                  </TouchableOpacity>
                ) : <View key={j} style={{ flex: 1 }} />
              ))}
            </View>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
};

// ─── PANTALLA PRINCIPAL ─────────────────────────────────────
export default function HomeScreen() {"""

content = re.sub(old_modal, new_modal, content, flags=re.DOTALL)


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
