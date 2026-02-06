use rusqlite::Connection;
use std::sync::{Arc, Mutex};
use fake::{Fake, faker::name::en::*};

pub type DbConnection = Arc<Mutex<Connection>>;


/// Crea una base de datos en memoria para tests
pub fn create_test_db() -> DbConnection {
    let conn = Connection::open_in_memory().expect("Error al crear BD de test");
    init_test_db(&conn).expect("Error al inicializar BD de test");
    Arc::new(Mutex::new(conn))
}

/// Inicializa el esquema de la base de datos para tests
fn init_test_db(conn: &Connection) -> rusqlite::Result<()> {
    // Tabla de familias
    conn.execute(
        "CREATE TABLE familias (
            id INTEGER PRIMARY KEY,
            nombre_familia TEXT NOT NULL UNIQUE,
            hermano_direccion_id INTEGER,
            created_at TEXT,
            updated_at TEXT
        )",
        [],
    )?;

    // Tabla de hermanos
    conn.execute(
        "CREATE TABLE hermanos (
            id INTEGER PRIMARY KEY,
            numero_hermano TEXT UNIQUE NOT NULL,
            nombre TEXT NOT NULL,
            primer_apellido TEXT NOT NULL,
            segundo_apellido TEXT,
            dni TEXT UNIQUE,
            fecha_nacimiento TEXT,
            localidad_nacimiento TEXT,
            provincia_nacimiento TEXT,
            fecha_alta TEXT,
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
            autorizacion_menores BOOLEAN DEFAULT 0,
            nombre_representante_legal TEXT,
            dni_representante_legal TEXT,
            hermano_aval_1 TEXT,
            hermano_aval_2 TEXT,
            activo BOOLEAN DEFAULT 1,
            fecha_baja TEXT,
            observaciones TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(familia_id) REFERENCES familias(id) ON DELETE SET NULL
        )",
        [],
    )?;

    // Tabla de cuotas
    conn.execute(
        "CREATE TABLE cuotas (
            id INTEGER PRIMARY KEY,
            hermano_id INTEGER NOT NULL,
            anio INTEGER NOT NULL,
            importe REAL NOT NULL,
            pagado BOOLEAN DEFAULT 0,
            fecha_pago TEXT,
            metodo_pago TEXT,
            observaciones TEXT,
            recibo TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(hermano_id, anio),
            FOREIGN KEY(hermano_id) REFERENCES hermanos(id) ON DELETE CASCADE
        )",
        [],
    )?;

    Ok(())
}

/// Inserta una familia. Si nombre es None, genera uno aleatorio.
pub fn insert_test_familia(
    db: &DbConnection,
    nombre: Option<&str>,
) -> rusqlite::Result<i32> {
    let conn = db.lock().map_err(|_| rusqlite::Error::ExecuteReturnedResults)?;
    let now = chrono::Local::now().to_rfc3339();
    let familia_name = nombre.map(|s| s.to_string()).unwrap_or_else(|| LastName().fake());
    
    conn.execute(
        "INSERT INTO familias (nombre_familia, created_at, updated_at) VALUES (?1, ?2, ?3)",
        rusqlite::params![familia_name, now, now],
    )?;

    Ok(conn.last_insert_rowid() as i32)
}


/// Inserta un hermano. Si nombre o primer_apellido son None, genera valores aleatorios.
pub fn insert_test_hermano(
    db: &DbConnection,
    numero: &str,
    nombre: Option<&str>,
    primer_apellido: Option<&str>,
    familia_id: Option<i32>,
) -> rusqlite::Result<i32> {
    let conn = db.lock().map_err(|_| rusqlite::Error::ExecuteReturnedResults)?;
    let now = chrono::Local::now().to_rfc3339();
    let fecha_alta = "2024-01-01".to_string(); // Valor por defecto para tests
    let nombre_h = nombre.map(|s| s.to_string()).unwrap_or_else(|| FirstName().fake());
    let apellido_h = primer_apellido.map(|s| s.to_string()).unwrap_or_else(|| LastName().fake());
    
    conn.execute(
        "INSERT INTO hermanos (numero_hermano, nombre, primer_apellido, familia_id, fecha_alta, activo, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7)",
        rusqlite::params![numero, nombre_h, apellido_h, familia_id, fecha_alta, now, now],
    )?;

    Ok(conn.last_insert_rowid() as i32)
}

/// Alias para insert_test_hermano manteniendo compatibilidad
pub fn insert_fake_hermano(
    db: &DbConnection,
    numero: &str,
    familia_id: Option<i32>,
) -> rusqlite::Result<i32> {
    insert_test_hermano(db, numero, None, None, familia_id)
}


/// Inserta una cuota de test
pub fn insert_test_cuota(
    db: &DbConnection,
    hermano_id: i32,
    anio: i32,
    importe: f64,
    pagado: bool,
) -> rusqlite::Result<i32> {
    let conn = db.lock().map_err(|_| rusqlite::Error::ExecuteReturnedResults)?;
    let now = chrono::Local::now().to_rfc3339();
    
    conn.execute(
        "INSERT INTO cuotas (hermano_id, anio, importe, pagado, recibo, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6)",
        rusqlite::params![hermano_id, anio, importe, if pagado { 1 } else { 0 }, now, now],
    )?;

    Ok(conn.last_insert_rowid() as i32)
}
