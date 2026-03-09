# FinanzasAI - Conversor de Divisas en Tiempo Real

Aplicación móvil para convertir divisas con tasas actualizadas del **BCV (Banco Central de Venezuela)** y **Binance P2P**. Desarrollada con React Native (Expo).

---

## ✨ Características

- 💱 **Conversión en tiempo real** entre USD, EUR, USDT y VES (Bolívares)
- 🔄 **Tasas actualizadas** cada 5 minutos (BCV + Binance P2P)
- 🎨 **Interfaz oscura moderna** con animaciones suaves
- 💾 **Persistencia de datos**: guarda tus monedas preferidas automáticamente
- 📱 **APK listo** para instalar en Android

---

## 📡 APIs utilizadas

La app consume dos fuentes de datos en tiempo real:

| Moneda | Fuente      | Descripción         |
| ------ | ----------- | ------------------- |
| USD    | BCV         | Dólar oficial       |
| EUR    | BCV         | Euro oficial        |
| USDT   | Binance P2P | Tether en bolívares |

> **Nota:** Las APIs son consumidas a través de un servicio propio que procesa y normaliza los datos.

---

## 🚀 Instalación y desarrollo

### Requisitos previos

- Node.js **18+**
- npm o yarn
- Android Studio (para emulador) o dispositivo físico
- Git

### Pasos rápidos

```bash
# 1. Clonar el repositorio
git clone https://github.com/tuusuario/finanzas-ai.git
cd finanzas-ai

# 2. Instalar dependencias
npm install

# 3. Iniciar el proyecto
npx expo start

# 4. Escanear QR con Expo Go (Android) o presionar 'a' para emulador
```

# 📦 Generar APK (Android)

## APK de prueba (debug)

```bash
cd android
./gradlew assembleDebug
```

📱 **Ubicación:** `android/app/build/outputs/apk/debug/app-debug.apk`

> ⚠️ Este APK requiere Metro corriendo. Solo para pruebas con cable USB.

---

## APK final (release) — ¡LISTO PARA INSTALAR!

```bash
cd android
./gradlew assembleRelease
```

📱 **Ubicación:** `android/app/build/outputs/apk/release/app-release.apk`

> ✅ Este APK funciona sin conexión y se puede compartir.

---

# 🍎 Versión iOS

> **Requisito:** Mac con Xcode instalado

```bash
# 1. Generar carpeta iOS
npx expo prebuild --clean

# 2. Abrir en Xcode
cd ios
open FinanzasAI.xcworkspace

# 3. En Xcode: seleccionar tu equipo y presionar Play ▶️
```

Para generar el archivo `.ipa`:

```bash
xcodebuild -workspace FinanzasAI.xcworkspace -scheme FinanzasAI -configuration Release archive -archivePath build/FinanzasAI.xcarchive
xcodebuild -exportArchive -archivePath build/FinanzasAI.xcarchive -exportPath build/FinanzasAI.ipa -exportOptionsPlist exportOptions.plist
```

---

# 📁 Estructura del proyecto

```
finanzas-ai/
├── src/
│   ├── screens/          # Pantalla principal
│   ├── services/         # APIs y lógica de negocio
│   ├── constants/        # Colores y configuración
│   └── utils/            # Formateadores
├── assets/
│   ├── icon.png          # Ícono de la app
│   ├── splash-icon.png   # Pantalla de carga
│   └── flags/            # Banderas de países
├── android/              # Código nativo (generado)
├── App.tsx               # Entrada principal
└── app.json              # Configuración de Expo
```

---

## Agregar nueva moneda

1. Añadir a `CurrencyCode` en `src/types/index.ts`
2. Configurar en `CURRENCY_CONFIG` en `HomeScreen.tsx`
3. Agregar bandera en `assets/flags/`

---

# 🚀 Producción y distribución

## Google Play Store

1. Generar APK release firmado
2. Crear cuenta de desarrollador ($25 único)
3. Subir el APK en Play Console

## Apple App Store

1. Mac + Xcode + Cuenta Apple Developer ($99/año)
2. Generar archivo `.ipa`
3. Subir con Transporter o Xcode

---

# ❓ Solución de problemas comunes

## Error: "SDK location not found"

```bash
cd android
echo "sdk.dir=C:\\Users\\TuUsuario\\AppData\\Local\\Android\\Sdk" > local.properties
```

## Error de políticas en PowerShell (Windows)

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## El APK no abre: "Unable to load script"

Usa el APK release, no el debug:

```bash
./gradlew assembleRelease
```

## Error de Gradle: cache corrupta

```bash
cd android
rm -rf .gradle
rm -rf ~/.gradle/caches/
```

---

# 📄 Licencia

MIT ©Juan Oberto — Libre para usar y modificar

---

# 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea tu rama (`git checkout -b feature/nueva-funcion`)
3. Commit tus cambios (`git commit -m 'Agrega nueva función'`)
4. Push a la rama (`git push origin feature/nueva-funcion`)
5. Abre un Pull Request

¿Problemas? Abre un issue o contacta al desarrollador.

---

⭐ **Si te gustó el proyecto, no olvides darle una estrella en GitHub** ⭐
