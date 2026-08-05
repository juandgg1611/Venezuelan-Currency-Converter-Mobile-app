import re

file_path = "c:/conversor/src/screens/HomeScreen.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace CalculatorModal
new_calc = """// ─── CALCULADORA ─────────────────────────────────────────────
const CalculatorModal = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [justCalculated, setJustCalculated] = useState(false);

  const slideAnim = useRef(new Animated.Value(600)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      slideAnim.setValue(600);
      overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 600,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  const pressScale = useRef(new Animated.Value(1)).current;

  const animPress = (cb: () => void) => {
    Animated.sequence([
      Animated.timing(pressScale, { toValue: 0.95, duration: 60, useNativeDriver: true }),
      Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 24 }),
    ]).start();
    cb();
  };

  const evaluateExpression = (expr: string): string => {
    try {
      const sanitized = expr.replace(/×/g, "*").replace(/÷/g, "/");
      const result = Function('"use strict"; return (' + sanitized + ')')();
      return parseFloat(result.toFixed(10)).toString();
    } catch {
      return "Error";
    }
  };

  const handleDigit = (digit: string) => {
    if (waitingForNext || justCalculated) {
      setDisplay(digit);
      setWaitingForNext(false);
      if (justCalculated) {
        setExpression("");
        setJustCalculated(false);
      }
      return;
    }
    setDisplay((prev) =>
      prev === "0" ? digit : prev.length >= 12 ? prev : prev + digit
    );
  };

  const handleDot = () => {
    if (waitingForNext || justCalculated) {
      setDisplay("0.");
      setWaitingForNext(false);
      if (justCalculated) {
        setExpression("");
        setJustCalculated(false);
      }
      return;
    }
    if (!display.includes(".")) setDisplay((prev) => prev + ".");
  };

  const handleOperator = (op: string) => {
    const label = op === "*" ? "×" : op === "/" ? "÷" : op;
    let newExpression = "";
    if (justCalculated) {
        newExpression = display + " " + label + " ";
    } else {
        newExpression = expression + display + " " + label + " ";
    }
    
    // Evaluate partial result if possible
    const tempEval = evaluateExpression(newExpression.slice(0, -3));
    if (tempEval !== "Error" && newExpression.split(" ").length > 3) {
      setDisplay(tempEval);
    }
    
    setExpression(newExpression);
    setWaitingForNext(true);
    setJustCalculated(false);
  };

  const handleEqual = () => {
    if (justCalculated) return;
    const rawExpr = expression + display;
    const res = evaluateExpression(rawExpr);
    setDisplay(res);
    setExpression(rawExpr + " =");
    setWaitingForNext(false);
    setJustCalculated(true);
  };

  const handlePercent = () => {
    const num = parseFloat(display);
    if (!isNaN(num)) setDisplay((num / 100).toFixed(display.includes(".") ? display.split(".")[1].length + 2 : 2));
  };

  const handleToggleSign = () => {
    setDisplay((prev) =>
      prev.startsWith("-") ? prev.slice(1) : "-" + prev
    );
  };

  const handleClear = () => {
    setDisplay("0");
    setExpression("");
    setWaitingForNext(false);
    setJustCalculated(false);
  };

  const handleBackspace = () => {
    if (justCalculated) { handleClear(); return; }
    setDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
  };

  const formatDisplay = (val: string) => {
    if (val === "Error") return val;
    const parts = val.split(".");
    const intPart = parseFloat(parts[0] || "0").toLocaleString("es-VE");
    return parts.length > 1 ? intPart + "." + parts[1] : intPart;
  };

  type ButtonConfig = {
    label: string;
    value?: string;
    type: "digit" | "operator" | "action" | "equal";
    flex?: number;
  };

  const rows: ButtonConfig[][] = [
    [
      { label: "AC",  type: "action" },
      { label: "+/-", type: "action" },
      { label: "%",   type: "action" },
      { label: "÷",   value: "/", type: "operator" },
    ],
    [
      { label: "7", type: "digit" },
      { label: "8", type: "digit" },
      { label: "9", type: "digit" },
      { label: "×", value: "*", type: "operator" },
    ],
    [
      { label: "4", type: "digit" },
      { label: "5", type: "digit" },
      { label: "6", type: "digit" },
      { label: "−", value: "-", type: "operator" },
    ],
    [
      { label: "1", type: "digit" },
      { label: "2", type: "digit" },
      { label: "3", type: "digit" },
      { label: "+", value: "+", type: "operator" },
    ],
    [
      { label: "0", type: "digit", flex: 2 },
      { label: ",", type: "action" },
      { label: "=", type: "equal" },
    ],
  ];

  const getBtnBg = (type: ButtonConfig["type"]) => {
    if (type === "operator") return G.p100 + "22";
    if (type === "equal")    return G.p100;
    if (type === "action")   return G.bg400;
    return G.bg300;
  };

  const getBtnColor = (type: ButtonConfig["type"]) => {
    if (type === "operator") return G.p200;
    if (type === "equal")    return G.bg100;
    if (type === "action")   return G.t200;
    return G.t100;
  };

  const getBtnBorder = (type: ButtonConfig["type"]) => {
    if (type === "operator") return G.p100 + "55";
    if (type === "equal")    return G.p200;
    return G.bg500;
  };

  const handleBtn = (btn: ButtonConfig) => {
    if (btn.type === "digit") {
      if (btn.label === "0") handleDigit("0");
      else handleDigit(btn.label);
    } else if (btn.type === "operator") {
      handleOperator(btn.value ?? btn.label);
    } else if (btn.type === "equal") {
      handleEqual();
    } else {
      if (btn.label === "AC") handleClear();
      else if (btn.label === "+/-") handleToggleSign();
      else if (btn.label === "%") handlePercent();
      else if (btn.label === ",") handleDot();
    }
  };

  if (!mounted && !visible) return null;

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Overlay */}
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: "rgba(0,0,0,0.82)",
          opacity: overlayOpacity,
        }}
        pointerEvents={visible ? "auto" : "none"}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          transform: [{ translateY: slideAnim }],
          backgroundColor: G.bg200,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          borderWidth: 1,
          borderColor: G.bg500,
          paddingBottom: Platform.OS === "ios" ? 36 : 20,
          shadowColor: G.p100,
          shadowOpacity: 0.1,
          shadowRadius: 30,
          shadowOffset: { width: 0, height: -4 },
          elevation: 24,
        }}
      >
        {/* Handle */}
        <View style={{ alignItems: "center", paddingTop: 12, marginBottom: 4 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: G.bg500 }} />
        </View>

        {/* Header */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderColor: G.bg400,
        }}>
          <View style={{
            width: 34, height: 34, borderRadius: 17,
            backgroundColor: G.p100 + "18",
            justifyContent: "center", alignItems: "center", marginRight: 10,
          }}>
            <Ionicons name="calculator" size={17} color={G.p200} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: G.t100 }}>Calculadora</Text>
            <Text style={{ fontSize: 11, color: G.t400, marginTop: 1 }}>Aritmética básica y porcentaje</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: G.bg400,
              justifyContent: "center", alignItems: "center",
            }}
          >
            <Ionicons name="close" size={16} color={G.t300} />
          </TouchableOpacity>
        </View>

        {/* Pantalla */}
        <View style={{
          paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8,
          alignItems: "flex-end",
        }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 14,
              color: G.t400,
              marginBottom: 4,
              fontVariant: ["tabular-nums"],
              minHeight: 20,
            }}
          >
            {expression || " "}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.45}
            style={{
              fontSize: 52,
              fontWeight: "700",
              color: justCalculated ? G.p200 : G.t100,
              fontVariant: ["tabular-nums"],
              letterSpacing: -1,
            }}
          >
            {formatDisplay(display)}
          </Text>
        </View>

        {/* Divisor */}
        <View style={{ height: 1, backgroundColor: G.bg400, marginHorizontal: 20, marginBottom: 16 }} />

        {/* Botones */}
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {rows.map((row, ri) => (
            <View key={ri} style={{ flexDirection: "row", gap: 10 }}>
              {row.map((btn) => (
                <TouchableOpacity
                  key={btn.label}
                  onPress={() => animPress(() => handleBtn(btn))}
                  activeOpacity={0.75}
                  style={[{
                    flex: btn.flex ?? 1,
                    height: 64,
                    borderRadius: 18,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: getBtnBg(btn.type),
                    borderWidth: 1,
                    borderColor: getBtnBorder(btn.type),
                  },
                  btn.type === "equal" && {
                    shadowColor: G.p100,
                    shadowOpacity: 0.35,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 6,
                  }
                  ]}
                >
                  <Text
                    style={{
                      fontSize: btn.type === "equal" ? 28 : btn.label.length > 1 ? 17 : 24,
                      fontWeight: "700",
                      color: getBtnColor(btn.type),
                    }}
                  >
                    {btn.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
};
"""

content = re.sub(r'// ─── CALCULADORA ─────────────────────────────────────────────.*?export default function HomeScreen\(\) \{', new_calc + '\n// ─── PANTALLA PRINCIPAL ─────────────────────────────────────\nexport default function HomeScreen() {', content, flags=re.DOTALL)

# Add Styles
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

content = content.replace("const styles = StyleSheet.create({", "const styles = StyleSheet.create({\n" + styles_to_add)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("done")
