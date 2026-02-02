use std::fs;
use std::path::PathBuf;
use tauri::State;
use chrono::Local;

use crate::db::DbConnection;

/// Obtiene la ruta de la base de datos
fn get_database_path() -> Result<PathBuf, anyhow::Error> {
    let app_data_dir = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME").map(|home| format!("{}/.local/share", home)))
        .unwrap_or_else(|_| ".".to_string());
    
    let db_dir = format!("{}/hermanar", app_data_dir);
    let db_path = format!("{}/hermanar.db", db_dir);
    
    Ok(PathBuf::from(db_path))
}

/// Exporta la base de datos como archivo comprimido
#[tauri::command]
pub fn exportar_backup_cmd(_db: State<DbConnection>) -> Result<String, String> {
    // Generar nombre de archivo con fecha y hora
    let now = Local::now();
    let filename = format!("hermanar-{}", now.format("%Y-%m-%d-%H-%M-%S"));
    
    // Obtener ruta de la base de datos
    let db_path = get_database_path()
        .map_err(|e| format!("Error al obtener ruta de BD: {}", e))?;
    
    if !db_path.exists() {
        return Err("La base de datos no existe".to_string());
    }
    
    // Leer el archivo de base de datos
    let db_data = fs::read(&db_path)
        .map_err(|e| format!("Error al leer la base de datos: {}", e))?;
    
    // Comprimir usando zstd
    let compressed_data = zstd::encode_all(&db_data[..], 3)
        .map_err(|e| format!("Error al comprimir: {}", e))?;
    
    // Obtener directorio de descargas del usuario
    let download_dir = dirs::download_dir()
        .ok_or_else(|| "No se pudo obtener el directorio de descargas".to_string())?;
    
    let backup_path = download_dir.join(format!("{}.zst", filename));
    
    // Guardar archivo comprimido
    fs::write(&backup_path, compressed_data)
        .map_err(|e| format!("Error al guardar backup: {}", e))?;
    
    Ok(backup_path.to_string_lossy().to_string())
}

/// Importa una base de datos desde un archivo comprimido
#[tauri::command]
pub fn importar_backup_cmd(db: State<DbConnection>, backup_path: String) -> Result<String, String> {
    let backup_file = PathBuf::from(&backup_path);
    
    if !backup_file.exists() {
        return Err("El archivo de backup no existe".to_string());
    }
    
    // Leer archivo comprimido
    let compressed_data = fs::read(&backup_file)
        .map_err(|e| format!("Error al leer archivo de backup: {}", e))?;
    
    // Descomprimir usando zstd
    let decompressed_data = zstd::decode_all(&compressed_data[..])
        .map_err(|e| format!("Error al descomprimir: {}", e))?;
    
    // Validar que el archivo descomprimido es una base de datos SQLite válida
    // Los archivos SQLite comienzan con "SQLite format 3\0"
    if decompressed_data.len() < 16 || !decompressed_data.starts_with(b"SQLite format 3") {
        return Err("El archivo no es una base de datos SQLite válida".to_string());
    }
    
    // Validar la integridad de la base de datos en memoria antes de reemplazar
    use rusqlite::Connection;
    
    // Intentar abrir la BD en un archivo temporal para validarla
    let temp_dir = std::env::temp_dir();
    let temp_db_path = temp_dir.join("hermanar_temp_validation.db");
    
    fs::write(&temp_db_path, &decompressed_data)
        .map_err(|e| format!("Error al escribir BD temporal: {}", e))?;
    
    // Intentar abrir y validar la BD temporal
    let validation_result = Connection::open(&temp_db_path)
        .and_then(|conn| {
            conn.pragma_query(None, "integrity_check", |_| Ok(()))?;
            Ok(())
        });
    
    // Limpiar archivo temporal
    let _ = fs::remove_file(&temp_db_path);
    
    // Si la validación falló, retornar error
    validation_result.map_err(|e| format!("La base de datos está corrupta o no es válida: {}", e))?;
    
    // Obtener ruta de la base de datos actual
    let db_path = get_database_path()
        .map_err(|e| format!("Error al obtener ruta de BD: {}", e))?;
    
    // Crear backup de la BD actual antes de reemplazar
    if db_path.exists() {
        let backup_current = db_path.with_extension("db.backup");
        fs::copy(&db_path, &backup_current)
            .map_err(|e| format!("Error al hacer backup de BD actual: {}", e))?;
    }
    
    // Cerrar la conexión actual antes de reemplazar el archivo
    // Necesitamos liberar el mutex temporalmente
    let _ = db.inner();
    
    // Esperar un momento para asegurar que la BD se cierre
    std::thread::sleep(std::time::Duration::from_millis(100));
    
    // Escribir nueva base de datos
    fs::write(&db_path, decompressed_data)
        .map_err(|e| format!("Error al escribir nueva base de datos: {}", e))?;
    
    Ok("Base de datos importada correctamente. Por favor reinicia la aplicación.".to_string())
}

/// Abre el directorio de descargas
#[tauri::command]
pub fn abrir_carpeta_descargas_cmd() -> Result<(), String> {
    let download_dir = dirs::download_dir()
        .ok_or_else(|| "No se pudo obtener el directorio de descargas".to_string())?;
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(download_dir)
            .spawn()
            .map_err(|e| format!("Error al abrir carpeta: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(download_dir)
            .spawn()
            .map_err(|e| format!("Error al abrir carpeta: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(download_dir)
            .spawn()
            .map_err(|e| format!("Error al abrir carpeta: {}", e))?;
    }
    
    Ok(())
}
