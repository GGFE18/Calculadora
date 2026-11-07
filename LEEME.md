# Zzzz Calculadora (web app del celular)

Fórmulas copiadas sin cambios de `zzzz/nucleo` (Cálculo rápido de Zzzz). Si cambia una fórmula en Zzzz, hay que cambiarla también en `nucleo.js`.

## Archivos
- `index.html`: la pantalla (Cálculo y WhatsApp IM05).
- `nucleo.js`: las fórmulas (dinero exacto, sin float).
- `sw.js`, `manifest.json`, `icono*`: para que funcione sin internet y se agregue a la pantalla de inicio.
- `pruebas/pruebas.js`: las mismas pruebas de Zzzz. Correr: `node pruebas/pruebas.js ../datos/despachos_leidos.json`

## Subir a GitHub Pages
1. Crear cuenta en github.com.
2. Nuevo repositorio público, por ejemplo `calculadora`.
3. "Add file" → "Upload files" → arrastrar todo el contenido de esta carpeta → "Commit changes".
4. Settings → Pages → Branch: `main`, carpeta `/ (root)` → Save.
5. En 1–2 minutos queda en `https://TU-USUARIO.github.io/calculadora/`.
6. En el celular: abrir el enlace en Chrome → menú ⋮ → "Agregar a la pantalla de inicio".

## Cotización
KITAPP usa la cotización del BCP del día hábil anterior. La página del BCP tiene verificación anti-robots: no se puede leer automáticamente.
Por eso la publica **Zzzz** (ver `INSTRUCCIONES_COTIZACION_WEBAPP.md` en la carpeta de Zzzz): al leer el cambio de KITAPP, sube `cotizacion.json` a este repositorio.
`{"fuente": "KITAPP", "actualizado": "07/11/2026 08:15", "dias": [{"fecha": "07/11/2026", "usd": "5.965,76", "brl": "1.097,21"}, ...]}`
- `dias[0]` es el de hoy y se usa por defecto; si no es de hoy, la web app avisa en amarillo.
- Se puede elegir otro día de la lista o escribir el cambio a mano. El cambio escrito a mano queda guardado en el celular con su fecha.

## Importadores (solo IM05)
Están en `importadores.json` (razón social, RUC, nombre corto para el mensaje y `orden`).
- `orden`: 1, 2, 3… es el lugar en "Más usados". Los que no tienen orden van después.
- Para sumar o cambiar uno: editar el archivo y subirlo de nuevo a GitHub. El celular lo baja solo.
- El nombre que cambiás en el celular (tocándolo en WhatsApp) queda guardado en el teléfono.
