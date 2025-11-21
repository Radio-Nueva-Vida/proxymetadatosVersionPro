
# Radio Proxy Avanzado

## Endpoints
- `/stream` → Stream proxyado sin CORS
- `/nowplaying` → Artista, título y carátula
- `/artwork?url=` → Proxy de imágenes

## Variables para Render
- `UPSTREAM_URL=https://server.streamcasthd.com/8626/stream`
- `METADATA_URL=https://server.streamcasthd.com/cp/get_info.php?p=8626`

## Instrucciones
1. Subir ZIP a GitHub o Render.
2. Instalar dependencias automáticamente.
3. Iniciar servicio con `npm start`.
