# Sistema de Migraciones de Base de Datos

## Descripción

El sistema de migraciones permite actualizar el esquema de la base de datos de forma incremental y segura cuando se añaden nuevas características o se modifican estructuras existentes.

## Funcionamiento

### Tabla de Versiones

El sistema utiliza una tabla `schema_version` que registra qué migraciones se han aplicado:

```sql
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Proceso de Migración

1. Al iniciar la aplicación, se obtiene la versión actual del esquema
2. Se ejecutan todas las migraciones pendientes en orden secuencial
3. Cada migración verifica si el cambio ya existe antes de aplicarlo
4. Se registra la nueva versión al completar cada migración

### Ubicación del Código

Las migraciones se encuentran en:

- **Backend**: `src-tauri/src/db/mod.rs` función `run_migrations()`

## Migraciones Aplicadas

### Migración 1: Campo `recibo` en cuotas

**Versión**: 1  
**Fecha**: 2026-02-02  
**Descripción**: Añade el campo `recibo` (BOOLEAN) a la tabla `cuotas` para indicar si se ha generado un recibo para esa cuota.

**Cambios**:

- Añade columna `recibo BOOLEAN NOT NULL DEFAULT 0` a la tabla `cuotas`
- Valor por defecto: `false` (0)
- Cuotas existentes: Se les asigna `recibo = false` automáticamente

**Afectaciones**:

- Struct `Cuota` en Rust
- Interface `Cuota` en TypeScript
- Todas las queries SQL que consultan la tabla cuotas
- Formularios de creación y edición de cuotas

## Añadir Nuevas Migraciones

### Pasos

1. **Incrementar la versión** en `run_migrations()`:

```rust
// Migración N: Descripción breve
if current_version < N {
    println!("Aplicando migración N: Descripción");

    // Verificar si el cambio ya existe (opcional pero recomendado)
    let exists: bool = conn.query_row(
        "SELECT COUNT(*) FROM pragma_table_info('tabla') WHERE name='columna'",
        [],
        |row| {
            let count: i32 = row.get(0)?;
            Ok(count > 0)
        },
    )?;

    if !exists {
        // Aplicar cambio
        conn.execute(
            "ALTER TABLE tabla ADD COLUMN columna TIPO DEFAULT valor",
            [],
        )?;
        println!("Cambio aplicado");
    } else {
        println!("Cambio ya existe, saltando migración");
    }

    set_schema_version(conn, N)?;
    println!("Migración N aplicada correctamente");
}
```

2. **Actualizar structs e interfaces**:
    - Backend: Structs en `src-tauri/src/db/mod.rs`
    - Frontend: Interfaces en `src/types/index.ts`

3. **Actualizar queries SQL**:
    - Todas las queries SELECT deben incluir la nueva columna
    - Queries INSERT/UPDATE deben manejar el nuevo campo

4. **Actualizar formularios** (si aplica):
    - Añadir el campo con valor por defecto apropiado

### Buenas Prácticas

1. **Siempre verificar existencia**: Antes de aplicar un cambio, verificar si ya existe
2. **Mensajes informativos**: Usar `println!()` para registrar el progreso
3. **Valores por defecto**: Establecer valores DEFAULT para nuevas columnas
4. **No modificar migraciones aplicadas**: Una vez en producción, no modificar el código de migraciones ya ejecutadas
5. **Documentar**: Añadir la migración a este documento

## Rollback

⚠️ **El sistema NO soporta rollback automático**. Si necesitas revertir cambios:

1. Crear una nueva migración que revierta los cambios
2. O restaurar un backup de la base de datos

## Base de Datos en Desarrollo vs Producción

- **Desarrollo**: `~/.local/share/hermanar/hermanar.db` (Linux/Mac) o `%APPDATA%/hermanar/hermanar.db` (Windows)
- **Producción**: Misma ubicación, pero las migraciones se aplican automáticamente al actualizar

## Testing

Antes de liberar una nueva versión con migraciones:

1. Probar con una base de datos nueva (esquema desde cero)
2. Probar con una base de datos existente (aplicar migraciones)
3. Verificar que los datos existentes no se corrompen
4. Verificar que todas las funcionalidades siguen operando correctamente
