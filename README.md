# IDEASA Clientes Portal

Portal separado para clientes, facturas, perfil, solicitudes y pagos en línea.

El acceso es por un solo campo alfanumérico. Si se ingresa NIT o cédula, entra como cliente. Si se ingresa correo corporativo de un vendedor con rol `admin`, entra al panel interno. Si el documento existe en Pinturas Idea (`002`) y Pinturas Industriales (`003`), el portal muestra una sola experiencia con deuda global; cada factura o solicitud conserva su `EMPRESA` para registrar correctamente la acción.

## Alcance

- Proyecto actual del dashboard interno: `ideasa-dashboard`
- Este proyecto: `ideasa-clientes-portal`
- Local: `http://localhost:3000`
- Producción sugerida: `https://pagos.ideasa.com`

## Seguridad

El navegador del cliente nunca se conecta a Hasura ni recibe claves de Hasura, SMTP, Wompi o Mercado Pago. El cliente consume APIs propias de Next.js en `/api`; esas APIs consultan Hasura y las pasarelas desde backend.

## Rutas

- `/clientes`: ingreso con NIT, cédula o correo admin
- `/clientes/verificar`: validación de OTP
- `/clientes/facturas`: facturas pendientes y selección para pago
- `/clientes/perfil`: datos actuales y solicitud de actualización
- `/clientes/solicitudes`: solicitudes sobre facturas
- `/clientes/pagos`: órdenes y pagos confirmados
- `/clientes/pagos/resultado`: regreso visual desde pasarela
- `/facturacion-electronica`: accesos publicos de facturacion electronica
- `/facturacion-electronica/registro`: solicitud de registro para facturacion electronica
- `/facturacion-electronica/descargar`: descarga manual por empresa, prefijo, consecutivo y documento
- `/facturacion-electronica/factura/[token]`: consulta puntual desde enlace o QR firmado
- `/admin-clientes/login`: ingreso interno con correo admin
- `/admin-clientes/verificar`: validación OTP de admin
- `/admin-clientes`: resumen interno
- `/admin-clientes/cartera`: cartera global
- `/admin-clientes/solicitudes`: solicitudes de clientes

## Variables

Copia `.env.example` a `.env` y completa los valores reales solo en tu ambiente local o proveedor de hosting. No subas `.env` a Git.

Las variables `FACTURACION_API_*` quedan preparadas para la API REST externa de facturacion electronica. Mientras `FACTURACION_API_URL` este vacia, el portal responde en modo de prueba para validar la estructura.

```bash
npm install
npm run dev
```

## Documentación

- [Arquitectura](docs/arquitectura-portal-clientes.md)
- [Tablas nuevas sugeridas](docs/schema-cliente-portal.sql)
