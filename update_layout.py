import re

path = 'c:/conversor/src/screens/HomeScreen.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Restore TextInput and remove CustomNumpad from the view
amount_row_regex = r"<View style=\{\[styles\.amountField,\s*\{\s*justifyContent:\s*'center'\s*\}\]\}>\s*<Text\s+style=\{\{\s*color:\s*fromCfg\.color,\s*fontSize:\s*34,\s*fontWeight:\s*\"700\"\s*\}\}\s*numberOfLines=\{1\}\s*adjustsFontSizeToFit\s*>\s*\{amount\s*\|\|\s*\"0\"\}\s*</Text>\s*</View>"

new_input = """<TextInput
              style={[styles.amountField, { color: fromCfg.color }]}
              value={amount}
              onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={fromCfg.color + "50"}
            />"""

content = re.sub(amount_row_regex, new_input, content, flags=re.DOTALL)

# Delete CustomNumpad logic inside HomeScreen
numpad_handler = r"\s*const handleNumpadPress = \(val: string\) => \{.*?\n  \};\n"
content = re.sub(numpad_handler, "\n", content, flags=re.DOTALL)

# Remove CustomNumpad and the MixedPaymentModal button from under amountRow
numpad_render = r"\s*<CustomNumpad onPress=\{handleNumpadPress\} color=\{fromCfg\.color\} />\s*<TouchableOpacity\s*style=\{\{flexDirection: \"row\".*?Calculadora Pago Mixto</Text>\s*</TouchableOpacity>"
content = re.sub(numpad_render, "", content, flags=re.DOTALL)

# Remove CustomNumpad component entirely
numpad_component = r"// ─── CUSTOM NUMPAD ───+.*?(?=// ─── CALCULADORA PAGO MIXTO ───+)"
content = re.sub(numpad_component, "", content, flags=re.DOTALL)


# 2. Add MixedPaymentModal and Notification to header
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
              <Ionicons name="calculator" size={20} color={G.p200} />
            </TouchableOpacity>

            {/* Botón Notificaciones */}
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => setNotificationsOn(!notificationsOn)}
            >
              <Ionicons name={notificationsOn ? "notifications" : "notifications-outline"} size={20} color={G.p200} />
            </TouchableOpacity>"""

content = re.sub(header_buttons, new_header_buttons, content, flags=re.DOTALL)

# Add notificationsOn state
if "const [notificationsOn" not in content:
    content = content.replace("const [mixedModalVisible, setMixedModalVisible] = useState(false);", "const [mixedModalVisible, setMixedModalVisible] = useState(false);\n  const [notificationsOn, setNotificationsOn] = useState(false);\n  const [calcVisible, setCalcVisible] = useState(false);")


# 3. Add Floating CalculatorButton inside ScrollView
# Find the end of ScrollView
scroll_end = r"      </ScrollView>"
calc_button = """
        {/* BOTÓN FLOTANTE CALCULADORA */}
        <TouchableOpacity
          style={styles.calcFloatBtn}
          onPress={() => setCalcVisible(true)}
        >
          <Ionicons name="calculator" size={24} color={G.bg100} />
        </TouchableOpacity>
      </ScrollView>"""

content = re.sub(scroll_end, calc_button, content)


# Add CalculatorModal component
with open(r'c:\conversor\calculator_snippet.txt', 'r', encoding='utf-8') as f:
    calc_snippet = f.read()

if "<CalculatorModal" not in content and calc_snippet.strip() != "":
    content = content.replace("// ── MODO HISTÓRICO ──────────────────────────────────────────", calc_snippet + "\n// ── MODO HISTÓRICO ──────────────────────────────────────────")

# Render CalculatorModal inside HomeScreen
if "<CalculatorModal visible={calcVisible}" not in content:
    content = content.replace("</SafeAreaView>", "  <CalculatorModal visible={calcVisible} onClose={() => setCalcVisible(false)} />\n    </SafeAreaView>")

# Add styles for calcFloatBtn
calc_style = """
  calcFloatBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: G.p200,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: G.p100,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
"""
content = content.replace("const styles = StyleSheet.create({", "const styles = StyleSheet.create({" + calc_style)


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
