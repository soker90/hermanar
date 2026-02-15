# Changelog

## [0.6.1] - 2026-02-15

### Corregido

- Correciones en el sistema de actualización automática

## [0.6.0] - 2026-02-05

### Añadido

- Campo fecha de baja obligatorio para hermanos inactivos
- Fecha de alta del hermano en recibos de cuota (formato DD/MM/YYYY)

## [0.5.1] - 2026-02-04

### Añadido

- Ahora se usa el logo personalizado en la configuración de recibos (si existe)

### Mejorado

- Optimización del diseño de recibos: ahora caben exactamente 3 recibos por página A4

## [0.5.0] - 2026-02-03

### Añadido

- Modal de configuración de recibos
- Generación de recibos mejorada con configuración personalizable
- Consulta de configuración desde base de datos

### Actualizado

- React Router a 7.12.0
- Mejoras en el sistema de recibos

## [0.4.0] - 2026-02-02

### Añadido

- Sistema completo de recibos (PDF)
- Generación de recibos de cuotas
- Sistema de backups y restauración
- Limpieza de base de datos
- Actualizador automático de la aplicación
- Migraciones de base de datos documentadas

### Mejorado

- Refactorización de interfaces duplicadas
- Actualización de README con nuevas características
- Gestión de cuotas mejorada
- Edición de cuotas

## [0.2.0] - 2026-02-01

### Añadido

- Gestión completa de familias (crear, editar, listar)
- Gestión completa de hermanos (crear, editar, ver detalle, listar)
- Gestión de cuotas (generar, pagar, editar, nueva)
- Sistema de notificaciones con ToastContext
- Modal para nueva familia
- Versión portable de la aplicación
- Componentes UI: Card, Input, Modal, Select, Table, Toast

### Mejorado

- Mejoras significativas en datos de hermanos
- Interfaz de usuario renovada con nuevos componentes
- Layout de la aplicación con navegación
- Página de inicio actualizada
- Gestión de pagos de cuotas

### Corregido

- Correcciones de ESLint
- Build en macOS
- Proceso de publicación en GitHub Actions
- Setup mejorado del flujo de release

## [0.1.0] - 2026-01-29

### Corregido

- Configuración de release para Linux
- Workspace PNPM

## [0.0.1] - 2026-01-29

### Añadido

- Versión inicial del proyecto
- Estructura base con Tauri + React + Vite
- Base de datos SQLite con Rusqlite
- Sistema de gestión de familias, hermanos y cuotas
- Comandos Tauri para interactuar con la base de datos
- Interfaz básica con componentes UI (Button, Tooltip)
- Configuración de ESLint, Prettier y Husky
- README completo con documentación
- GitHub Actions para versionado y releases
- Soporte para múltiples plataformas (Windows, macOS, Linux)
