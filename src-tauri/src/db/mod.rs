use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use anyhow::Context;
use std::sync::OnceLock;

pub mod hermanos;
pub mod familias;
pub mod cuotas;

// Estado global para rastrear recuperación de BD
static DB_RECOVERY_STATUS: OnceLock<DbRecoveryStatus> = OnceLock::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbRecoveryStatus {
    pub recovered: bool,
    pub had_backup: bool,
}

pub fn get_db_recovery_status() -> Option<DbRecoveryStatus> {
    DB_RECOVERY_STATUS.get().cloned()
}

// Re-export specific functions
pub use hermanos::{
    get_all_hermanos, get_hermanos_activos, get_hermano_by_id, search_hermanos,
    create_hermano, update_hermano, delete_hermano, set_hermano_inactive, get_hermanos_by_familia,
    update_hermano_familia,
};
pub use familias::{
    get_all_familias, get_familia_by_id, search_familias, create_familia,
    update_familia, delete_familia, get_familia_stats,
    get_familia_with_hermanos, get_familia_with_address
};
pub use cuotas::{
    get_all_cuotas, get_cuotas_by_hermano, get_cuotas_by_year, get_cuotas_pendientes,
    create_cuota, update_cuota, delete_cuota, marcar_cuota_pagada, pagar_cuotas_familia,
    generar_cuotas_anio, get_estadisticas_cuotas
};

// Tipos compartidos
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Hermano {
    pub id: Option<i32>,
    pub numero_hermano: String,
    pub nombre: String,
    pub primer_apellido: String,
    pub segundo_apellido: Option<String>,
    pub dni: Option<String>,
    pub fecha_nacimiento: Option<String>,
    pub localidad_nacimiento: Option<String>,
    pub provincia_nacimiento: Option<String>,
    pub fecha_alta: String,
    pub familia_id: Option<i32>,
    pub telefono: Option<String>,
    pub email: Option<String>,
    pub direccion: Option<String>,
    pub localidad: Option<String>,
    pub provincia: Option<String>,
    pub codigo_postal: Option<String>,
    pub parroquia_bautismo: Option<String>,
    pub localidad_bautismo: Option<String>,
    pub provincia_bautismo: Option<String>,
    pub autorizacion_menores: bool,
    pub nombre_representante_legal: Option<String>,
    pub dni_representante_legal: Option<String>,
    pub hermano_aval_1: Option<String>,
    pub hermano_aval_2: Option<String>,
    pub activo: bool,
    pub observaciones: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Familia {
    pub id: Option<i32>,
    pub nombre_familia: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hermano_direccion_id: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

impl Default for Familia {
    fn default() -> Self {
        Self {
            id: None,
            nombre_familia: String::new(),
            hermano_direccion_id: None,
            created_at: None,
            updated_at: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cuota {
    pub id: Option<i32>,
    pub hermano_id: i32,
    pub anio: i32,
    pub importe: f64,
    pub pagado: bool,
    pub fecha_pago: Option<String>,
    pub metodo_pago: Option<String>,
    pub observaciones: Option<String>,
    pub recibo: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EstadisticasCuotas {
    pub total_recaudado: f64,
    pub cuotas_pendientes: i32,
    pub cuotas_pagadas: i32,
    pub hermanos_al_dia: i32,
    pub hermanos_morosos: i32,
}

pub type DbConnection = Arc<Mutex<Connection>>;

pub fn init_database() -> Result<DbConnection, anyhow::Error> {
    println!("Iniciando conexión a la base de datos...");

    // Usar el directorio de datos de la aplicación
    let app_data_dir = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME").map(|home| format!("{}/.local/share", home)))
        .unwrap_or_else(|_| ".".to_string());
    
    let db_dir = format!("{}/hermanar", app_data_dir);
    std::fs::create_dir_all(&db_dir)
        .context("No se pudo crear el directorio de datos")?;
    
    let db_path = format!("{}/hermanar.db", db_dir);
    let backup_path = format!("{}/hermanar.db.backup", db_dir);
    let corrupt_path = format!("{}/hermanar-corrupta.db", db_dir);
    
    println!("Ruta de la base de datos: {}", db_path);

    // Variable para rastrear si hubo recuperación
    let mut recovery_occurred = false;
    let mut had_backup = false;

    // Intentar abrir la base de datos
    let conn_result = Connection::open(&db_path);
    
    let conn = match conn_result {
        Ok(c) => {
            // Intentar verificar la integridad de la base de datos
            match c.pragma_query(None, "integrity_check", |_| Ok(())) {
                Ok(_) => c,
                Err(e) => {
                    println!("Error de integridad en la base de datos: {}", e);
                    println!("Intentando recuperar desde backup...");
                    
                    recovery_occurred = true;
                    
                    // Cerrar la conexión corrupta
                    drop(c);
                    
                    // Renombrar la base de datos corrupta
                    if std::path::Path::new(&db_path).exists() {
                        std::fs::rename(&db_path, &corrupt_path)
                            .context("No se pudo renombrar la base de datos corrupta")?;
                        println!("Base de datos corrupta renombrada a: {}", corrupt_path);
                    }
                    
                    // Restaurar desde backup si existe
                    if std::path::Path::new(&backup_path).exists() {
                        had_backup = true;
                        std::fs::rename(&backup_path, &db_path)
                            .context("No se pudo restaurar el backup")?;
                        println!("Backup restaurado correctamente");
                        
                        // Abrir la base de datos restaurada
                        Connection::open(&db_path)
                            .context("No se pudo abrir la base de datos restaurada")?
                    } else {
                        // Si no hay backup, crear una nueva base de datos
                        println!("No se encontró backup, creando nueva base de datos");
                        Connection::open(&db_path)
                            .context("No se pudo crear nueva base de datos")?
                    }
                }
            }
        }
        Err(e) => {
            println!("Error al abrir la base de datos: {}", e);
            
            recovery_occurred = true;
            
            // Si existe backup, intentar restaurarlo
            if std::path::Path::new(&backup_path).exists() {
                had_backup = true;
                println!("Intentando restaurar desde backup...");
                
                // Renombrar la base de datos corrupta si existe
                if std::path::Path::new(&db_path).exists() {
                    std::fs::rename(&db_path, &corrupt_path)
                        .context("No se pudo renombrar la base de datos corrupta")?;
                }
                
                std::fs::rename(&backup_path, &db_path)
                    .context("No se pudo restaurar el backup")?;
                println!("Backup restaurado correctamente");
                
                Connection::open(&db_path)
                    .context("No se pudo abrir la base de datos restaurada")?
            } else {
                return Err(e.into());
            }
        }
    };
    
    // Guardar el estado de recuperación
    if recovery_occurred {
        let _ = DB_RECOVERY_STATUS.set(DbRecoveryStatus {
            recovered: true,
            had_backup,
        });
    }

    println!("Conexión establecida, creando tablas...");

    create_tables(&conn)?;
    
    println!("Ejecutando migraciones...");
    run_migrations(&conn)?;

    println!("Base de datos inicializada correctamente.");

    Ok(Arc::new(Mutex::new(conn)))
}

fn create_tables(conn: &Connection) -> Result<(), anyhow::Error> {
    // Tabla de familias
    conn.execute(
        "CREATE TABLE IF NOT EXISTS familias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_familia TEXT NOT NULL UNIQUE,
            hermano_direccion_id INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    // Tabla de hermanos
    conn.execute(
        "CREATE TABLE IF NOT EXISTS hermanos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero_hermano TEXT NOT NULL UNIQUE,
            nombre TEXT NOT NULL,
            primer_apellido TEXT NOT NULL,
            segundo_apellido TEXT,
            dni TEXT,
            fecha_nacimiento TEXT,
            localidad_nacimiento TEXT,
            provincia_nacimiento TEXT,
            fecha_alta TEXT NOT NULL,
            familia_id INTEGER,
            telefono TEXT,
            email TEXT,
            direccion TEXT,
            localidad TEXT,
            provincia TEXT,
            codigo_postal TEXT,
            parroquia_bautismo TEXT,
            localidad_bautismo TEXT,
            provincia_bautismo TEXT,
            autorizacion_menores BOOLEAN NOT NULL DEFAULT 0,
            nombre_representante_legal TEXT,
            dni_representante_legal TEXT,
            hermano_aval_1 TEXT,
            hermano_aval_2 TEXT,
            activo BOOLEAN NOT NULL DEFAULT 1,
            observaciones TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (familia_id) REFERENCES familias (id)
        )",
        [],
    )?;

    // Tabla de cuotas
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cuotas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hermano_id INTEGER NOT NULL,
            anio INTEGER NOT NULL,
            importe REAL NOT NULL,
            pagado BOOLEAN NOT NULL DEFAULT 0,
            fecha_pago TEXT,
            metodo_pago TEXT,
            observaciones TEXT,
            recibo BOOLEAN NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (hermano_id) REFERENCES hermanos (id) ON DELETE CASCADE,
            UNIQUE(hermano_id, anio)
        )",
        [],
    )?;

    // Índices para mejorar el rendimiento
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_hermanos_activo ON hermanos(activo)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_hermanos_familia ON hermanos(familia_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_cuotas_hermano ON cuotas(hermano_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_cuotas_anio ON cuotas(anio)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_cuotas_pagado ON cuotas(pagado)",
        [],
    )?;

    // Tabla de versión del esquema
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at TEXT DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    Ok(())
}

fn get_schema_version(conn: &Connection) -> Result<i32, anyhow::Error> {
    // Intentar obtener la versión, si no existe la tabla o no hay registros, devolver 0
    let version = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |row| row.get::<_, i32>(0),
        )
        .unwrap_or(0);
    
    Ok(version)
}

fn set_schema_version(conn: &Connection, version: i32) -> Result<(), anyhow::Error> {
    conn.execute(
        "INSERT INTO schema_version (version) VALUES (?1)",
        [version],
    )?;
    Ok(())
}

fn run_migrations(conn: &Connection) -> Result<(), anyhow::Error> {
    let current_version = get_schema_version(conn)?;
    println!("Versión actual del esquema: {}", current_version);

    // Migración 1: Añadir campo recibo a cuotas
    if current_version < 1 {
        println!("Aplicando migración 1: Añadir campo recibo");
        
        // Verificar si la columna ya existe
        let column_exists: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('cuotas') WHERE name='recibo'",
                [],
                |row| {
                    let count: i32 = row.get(0)?;
                    Ok(count > 0)
                },
            )?;

        if !column_exists {
            conn.execute(
                "ALTER TABLE cuotas ADD COLUMN recibo BOOLEAN NOT NULL DEFAULT 0",
                [],
            )?;
            println!("Campo 'recibo' añadido a la tabla cuotas");
        } else {
            println!("Campo 'recibo' ya existe, saltando migración");
        }

        set_schema_version(conn, 1)?;
        println!("Migración 1 aplicada correctamente");
    }

    // Migración 2: Crear tabla configuracion_recibos
    if current_version < 2 {
        println!("Aplicando migración 2: Crear tabla configuracion_recibos");
        
        // Verificar si la tabla ya existe
        let table_exists: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='configuracion_recibos'",
                [],
                |row| {
                    let count: i32 = row.get(0)?;
                    Ok(count > 0)
                },
            )?;

        if !table_exists {
            conn.execute(
                "CREATE TABLE configuracion_recibos (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    logo_path TEXT,
                    nombre_hermandad TEXT NOT NULL,
                    ubicacion TEXT NOT NULL,
                    direccion TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )",
                [],
            )?;
            println!("Tabla 'configuracion_recibos' creada correctamente");
        } else {
            println!("Tabla 'configuracion_recibos' ya existe, saltando migración");
        }

        set_schema_version(conn, 2)?;
        println!("Migración 2 aplicada correctamente");
    }

    println!("Todas las migraciones completadas");
    Ok(())
}
