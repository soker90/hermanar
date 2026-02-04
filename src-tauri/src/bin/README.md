# Scripts de Utilidad

Este directorio contiene scripts independientes que puedes ejecutar desde la línea de comandos.

## 🌱 seed.rs - Poblar Base de Datos con Datos Ficticios

Script para poblar la base de datos con datos de prueba realistas.

### Uso

```bash
# Opción 1: Usando el script helper (recomendado)
./scripts/seed-db.sh

# Opción 2: Ejecutando directamente con cargo
cd src-tauri
cargo run --bin seed
```

### Lo que hace

- ✅ Limpia todos los datos existentes (hermanos, familias, cuotas)
- ✅ Crea 15 familias con nombres realistas
- ✅ Genera 40+ hermanos con datos completos:
  - Nombres y apellidos españoles
  - DNI, teléfonos, emails
  - Direcciones en Alcázar de San Juan y alrededores
  - Fechas de alta y nacimiento
- ✅ Crea cuotas de los últimos 3 años (2024-2026)
  - 70% de cuotas antiguas pagadas
  - 30% de cuotas actuales pagadas
  - Métodos de pago variados
- ✅ Configura los datos por defecto para recibos

### Requisitos

- La aplicación debe haberse ejecutado al menos una vez para crear la base de datos
- La base de datos se encuentra en:
  - Linux: `~/.local/share/hermanar/hermanar.db`
  - Windows: `%APPDATA%/hermanar/hermanar.db`

### Nota

⚠️ **Este script borra todos los datos existentes**. Úsalo solo para pruebas o desarrollo.

Después de ejecutar el script, recarga la aplicación para ver los nuevos datos.
