use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use anyhow::Context;

pub mod hermanos;
pub mod familias;
pub mod cuotas;

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
    println!("Ruta de la base de datos: {}", db_path);

    let conn = Connection::open(&db_path)
        .context("No se pudo crear/abrir la base de datos")?;

    println!("Conexión establecida, creando tablas...");

    create_tables(&conn)?;

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

    Ok(())
}
