# App nativa (beta) — tracker.

La app usa el mismo código de la web, empacado con Capacitor.
Dentro de la app, la pantalla **Transmitir** usa el GPS nativo y sigue enviando con la pantalla bloqueada.

## Preparar (cualquier computador con Node 22+)

```bash
npm install
npm run sync      # copia la web a www/ y la pasa a los proyectos android/ e ios/
```

## iPhone (en un Mac, sin pagar la cuenta de Apple)

1. Instalar **Xcode** desde la Mac App Store y abrirlo una vez.
2. Clonar el repositorio y correr los dos comandos de arriba.
3. `npx cap open ios` (abre el proyecto en Xcode).
4. Xcode → Settings → Accounts → agregar el **Apple ID** de quien va a probar.
5. En el proyecto **App** → pestaña **Signing & Capabilities**:
   - Team: el Apple ID agregado (aparece como "Personal Team").
   - Si dice que el Bundle Identifier no está disponible, cambiarlo por uno propio, ej. `com.tunombre.tracker`.
6. Conectar el iPhone por cable, escogerlo arriba como destino y dar **Run** (▶).
7. En el iPhone: Ajustes → General → VPN y gestión de dispositivos → confiar en el desarrollador.
8. La app instalada así dura **7 días**; después se repite el paso 6.

Si el iPhone pide activar el **Modo desarrollador**: Ajustes → Privacidad y seguridad → Modo desarrollador.

## Android

- Instalar el APK de prueba (`app-debug.apk`) directamente en el celular.
- Para compilarlo de nuevo: `npx cap open android` en Android Studio → Build → Build APK(s),
  o `cd android && ./gradlew assembleDebug`. Queda en `android/app/build/outputs/apk/debug/`.

## Permisos al transmitir

- iPhone: escoger **Permitir siempre** (o "Mientras se usa" y luego cambiarlo a Siempre en Ajustes).
- Android: permitir ubicación y notificaciones. Mientras transmite aparece una notificación fija.
