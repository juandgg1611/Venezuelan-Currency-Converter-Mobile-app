const fs = require('fs');
let content = fs.readFileSync('C:\\Users\\Juand\\Documents\\A-DESKTOP\\Repositorios\\Movil_App\\src\\app\\admin.tsx', 'utf-8');

// Add QrCode import
if (!content.includes('QrCode')) {
  content = content.replace('Fingerprint\\n} from \\'lucide-react-native\\';', 'Fingerprint, QrCode\\n} from \\'lucide-react-native\\';');
}

// Add QRGeneratorModal import
if (!content.includes('QRGeneratorModal')) {
  content = content.replace('import { ConfirmModal } from \\'../components/ConfirmModal\\';', 'import { ConfirmModal } from \\'../components/ConfirmModal\\';\\nimport { QRGeneratorModal } from \\'../components/QRGeneratorModal\\';');
}

// Add qrModal state
if (!content.includes('const [qrProduct, setQrProduct]')) {
  content = content.replace('const [editModalVisible, setEditModalVisible] = useState(false);', 'const [editModalVisible, setEditModalVisible] = useState(false);\\n  const [qrProduct, setQrProduct] = useState<ProductoDB | null>(null);\\n  const [qrModalVisible, setQrModalVisible] = useState(false);');
}

// Add QR button next to Editar
if (!content.includes('setQrProduct(p); setQrModalVisible(true);')) {
  content = content.replace('<TouchableOpacity onPress={() => { setEditProduct(p); setEditModalVisible(true); }}', '<TouchableOpacity onPress={() => { setQrProduct(p); setQrModalVisible(true); }}\\n                      className=\"flex-1 flex-row items-center justify-center gap-2 py-3.5 border-r border-neutral-100 dark:border-neutral-800\">\\n                      <QrCode size={16} color=\"#10b981\" />\\n                      <Text className=\"text-emerald-600 dark:text-emerald-400 font-semibold text-sm\">QR</Text>\\n                    </TouchableOpacity>\\n                    <TouchableOpacity onPress={() => { setEditProduct(p); setEditModalVisible(true); }}');
}

// Add QR modal render
if (!content.includes('<QRGeneratorModal')) {
  content = content.replace('</SafeAreaView>', '  <QRGeneratorModal\\n        product={qrProduct}\\n        visible={qrModalVisible}\\n        onClose={() => setQrModalVisible(false)}\\n      />\\n\\n      </SafeAreaView>');
}

fs.writeFileSync('C:\\Users\\Juand\\Documents\\A-DESKTOP\\Repositorios\\Movil_App\\src\\app\\admin.tsx', content);
