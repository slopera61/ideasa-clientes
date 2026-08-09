# Arquitectura del portal de clientes IDEASA

## Principio

El cliente no entra a Hasura. El navegador solo llama endpoints propios del portal:

```text
Cliente -> Portal clientes -> API propia -> Hasura/base de datos
Cliente -> Portal clientes -> API propia -> Wompi/Mercado Pago
Cliente -> Portal clientes -> API propia -> API REST facturacion electronica
Pasarela -> Webhook API propia -> valida pago -> registra resultado
```

## Autenticación

1. La persona ingresa NIT, cédula o correo en `/clientes`.
2. `/api/auth/request-otp` detecta el tipo de dato:
   - Si contiene `@`, lo trata como correo interno y busca en `VENDEDORES.EMAIL`.
   - Si no contiene `@`, lo trata como documento y busca en `CLIENTES.NIF20`.
3. Para cliente, busca dentro de las empresas activas del portal.
   - `002`: Pinturas Idea
   - `003`: Pinturas Industriales
4. Para admin, solo autoriza vendedores activos con `VENDEDORES.PROVINCIA = admin`.
5. Si existe un acceso válido con correo, crea un registro en `cliente_codigos_acceso` o `admin_codigos_acceso`.
6. Envía OTP por SMTP corporativo.
7. La respuesta HTTP siempre es genérica: `Si encontramos un acceso asociado, enviaremos un código al correo registrado.`
8. `/api/auth/verify-otp` valida código, vencimiento, intentos y uso.
9. Si es válido, crea una cookie HTTP-only firmada con `CLIENT_SESSION_SECRET`.
10. La sesión de cliente contiene las cuentas asociadas al documento, por ejemplo `CODCLIENTE + EMPRESA`.
11. La sesión de admin contiene el rol `admin_clientes`.
12. Las APIs de cliente filtran por sus cuentas; las APIs de admin exigen rol `admin_clientes`.

## Pagos

1. El cliente selecciona facturas en `/clientes/facturas`.
2. `/api/client/payment-orders` vuelve a consultar `CXC_EDADES` y verifica que cada factura pertenezca a una cuenta de la sesión (`CODCLIENTE + EMPRESA`).
3. Crea `ordenes_pago` y `ordenes_pago_detalle`; cada detalle conserva `empresa` para diferenciar `002` y `003`.
4. `/api/payments/create-attempt` crea el intento con Wompi o Mercado Pago.
   - En Wompi, la orden debe contener facturas de una sola empresa y el backend escoge credenciales por `002` o `003`.
   - Si el cliente selecciona facturas de ambas empresas, la interfaz muestra una accion de pago por empresa.
5. La pasarela redirige a `/clientes/pagos/resultado` solo como feedback visual.
6. La confirmación real ocurre por webhook:
   - Wompi: `/api/webhooks/wompi`
   - Mercado Pago: `/api/webhooks/mercadopago`
7. El webhook valida firma, referencia, monto, moneda y estado.
8. Si el pago queda aprobado, registra `pagos` y `pagos_aplicados`.
9. Cartera no se modifica directamente; queda lista para conciliación contable o integración posterior.

## Admin clientes

- `/admin-clientes/login`: ingreso interno con correo corporativo de vendedor admin.
- `/admin-clientes/verificar`: validación del OTP interno.
- `/admin-clientes`: resumen de cartera y solicitudes.
- `/admin-clientes/cartera`: cartera global de `002` y `003`.
- `/admin-clientes/solicitudes`: solicitudes de perfil y facturas.

Las APIs de `/api/admin/*` solo responden si la cookie firmada contiene el rol `admin_clientes`.

## Facturacion electronica

Las facturas electronicas no se consultan en Hasura. Este modulo queda separado de cartera y pagos:

```text
Cliente -> Portal clientes -> /api/facturacion-electronica/* -> API REST externa
```

Rutas publicas:

- `/facturacion-electronica`: entrada publica del modulo.
- `/facturacion-electronica/registro`: formulario basico para solicitud de registro o activacion.
- `/facturacion-electronica/descargar`: busqueda manual por empresa, prefijo, consecutivo y NIT o cedula.
- `/facturacion-electronica/factura/[token]`: vista para enlaces o QR firmados.

APIs internas:

- `POST /api/facturacion-electronica/solicitud-registro`
- `POST /api/facturacion-electronica/buscar`
- `GET /api/facturacion-electronica/qr?token=...`
- `GET /api/facturacion-electronica/descargar?token=...&formato=pdf|xml`

El QR recomendado debe abrir una URL del portal, no la API externa directamente. El token actual va firmado con `CLIENT_SESSION_SECRET`; cuando la API REST real entregue CUFE, id unico o URL segura de descarga, ese valor debe usarse como identificador principal.

## Webhooks

Wompi:

- Usa `X-Event-Checksum` o `signature.checksum`.
- Lee dinámicamente `signature.properties`.
- Concatena valores, `timestamp` y el secreto de eventos configurado para `002` o `003`.
- Calcula SHA256 y compara en tiempo constante.

Mercado Pago:

- Usa `x-signature`, `x-request-id` y `data.id`.
- Arma el manifiesto `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`.
- Calcula HMAC-SHA256 con `MERCADOPAGO_WEBHOOK_SECRET`.
- Consulta `GET /v1/payments/{id}` antes de registrar un pago aprobado.

## Variables

```text
HASURA_GRAPHQL_ENDPOINT
HASURA_ADMIN_SECRET
CLIENT_SESSION_SECRET

SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASS
SMTP_FROM_NAME
SMTP_FROM_EMAIL

WOMPI_PUBLIC_KEY_002
WOMPI_PRIVATE_KEY_002
WOMPI_INTEGRITY_SECRET_002
WOMPI_EVENTS_SECRET_002

WOMPI_PUBLIC_KEY_003
WOMPI_PRIVATE_KEY_003
WOMPI_INTEGRITY_SECRET_003
WOMPI_EVENTS_SECRET_003

MERCADOPAGO_ACCESS_TOKEN
MERCADOPAGO_WEBHOOK_SECRET

FACTURACION_API_URL
FACTURACION_API_KEY
FACTURACION_API_TIMEOUT_MS
FACTURACION_API_REGISTRATION_PATH
FACTURACION_API_SEARCH_PATH
FACTURACION_API_DOWNLOAD_PATH

NEXT_PUBLIC_PORTAL_URL
```

## Pendientes de integración real

- Crear las tablas nuevas en la base y exponerlas en Hasura.
- Conectar la API REST externa de facturacion electronica y ajustar el mapeo de campos reales.
- Ajustar permisos internos si se decide no usar admin secret desde el backend.
- Conectar proceso contable para aplicar cartera después de confirmar pagos.
- Evaluar SSO interno si el portal administrativo crece.
