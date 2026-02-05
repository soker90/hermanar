# Scripts de Desarrollo

Esta carpeta contiene scripts de utilidad para desarrollo y mantenimiento de la aplicación.

⚠️ **Estos scripts NO forman parte de la aplicación principal**, son herramientas de desarrollo.

## 🌱 seed-db.sh

Pobla la base de datos con datos ficticios para pruebas.

### Uso

```bash
# Desde la raíz del proyecto
./scripts/seed-db.sh
```

### Qué hace

- Limpia todos los datos existentes
- Crea 15 familias con nombres realistas
- Genera 40+ hermanos con datos completos
- Crea cuotas de los últimos 3 años (2024-2026)
- Configura recibos por defecto

⚠️ **ADVERTENCIA**: Este script borra todos los datos existentes. Úsalo solo en desarrollo.

### Requisitos

- La aplicación debe haberse ejecutado al menos una vez para crear la base de datos
- Después de ejecutar, recarga la aplicación para ver los datos
