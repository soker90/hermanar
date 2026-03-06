use crate::config::{
    check_new_data_dir, get_data_dir_config, save_app_config, AppConfig, CheckDataDirResult,
    DataDirConfig,
};
use crate::db::{
    create_cuota, create_familia, create_hermano, delete_cuota, delete_familia, delete_hermano,
    generar_cuotas_anio, get_all_cuotas, get_all_familias, get_all_hermanos, get_cuotas_by_hermano,
    get_cuotas_by_year, get_cuotas_pendientes, get_db_recovery_status, get_estadisticas_cuotas,
    get_familia_by_id, get_familia_stats, get_familia_with_address, get_familia_with_hermanos,
    get_hermano_by_id, get_hermanos_activos, get_hermanos_by_familia, marcar_cuota_pagada,
    pagar_cuotas_familia, search_familias, search_hermanos, set_hermano_inactive, update_cuota,
    update_familia, update_hermano, update_hermano_familia, Cuota, DbConnection, DbRecoveryStatus,
    EstadisticasCuotas, Familia, Hermano,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

// Comando para obtener la versión de la aplicación
#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// Comando para verificar si hubo recuperación de BD
#[tauri::command]
pub fn check_db_recovery() -> Option<DbRecoveryStatus> {
    get_db_recovery_status()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HermanoConFamiliaData {
    pub hermano: Hermano,
    pub nueva_familia_nombre: Option<String>,
}

// Comandos para Hermanos
#[tauri::command]
pub fn get_all_hermanos_cmd(db: State<DbConnection>) -> Result<Vec<Hermano>, String> {
    get_all_hermanos(&db).map_err(|e| format!("Error al obtener hermanos: {}", e))
}

#[tauri::command]
pub fn get_hermanos_activos_cmd(db: State<DbConnection>) -> Result<Vec<Hermano>, String> {
    get_hermanos_activos(&db).map_err(|e| format!("Error al obtener hermanos activos: {}", e))
}

#[tauri::command]
pub fn get_hermano_by_id_cmd(db: State<DbConnection>, id: i32) -> Result<Option<Hermano>, String> {
    get_hermano_by_id(&db, id).map_err(|e| format!("Error al obtener hermano: {}", e))
}

#[tauri::command]
pub fn get_hermano_cmd(db: State<DbConnection>, id: i32) -> Result<Hermano, String> {
    match get_hermano_by_id(&db, id) {
        Ok(Some(hermano)) => Ok(hermano),
        Ok(None) => Err("Hermano no encontrado".to_string()),
        Err(e) => Err(format!("Error al obtener hermano: {}", e)),
    }
}

#[tauri::command]
pub fn search_hermanos_cmd(db: State<DbConnection>, query: String) -> Result<Vec<Hermano>, String> {
    search_hermanos(&db, &query).map_err(|e| format!("Error al buscar hermanos: {}", e))
}

#[tauri::command]
pub fn create_hermano_cmd(db: State<DbConnection>, hermano: Hermano) -> Result<i32, String> {
    create_hermano(&db, &hermano).map_err(|e| format!("Error al crear hermano: {}", e))
}

#[tauri::command]
pub fn update_hermano_cmd(
    db: State<DbConnection>,
    id: i32,
    hermano: Hermano,
) -> Result<(), String> {
    update_hermano(&db, id, &hermano).map_err(|e| format!("Error al actualizar hermano: {}", e))
}

#[tauri::command]
pub fn update_hermano_familia_cmd(
    db: State<DbConnection>,
    hermano_id: i32,
    familia_id: Option<i32>,
) -> Result<(), String> {
    update_hermano_familia(&db, hermano_id, familia_id)
        .map_err(|e| format!("Error al actualizar familia del hermano: {}", e))
}

#[tauri::command]
pub fn delete_hermano_cmd(db: State<DbConnection>, id: i32) -> Result<(), String> {
    delete_hermano(&db, id).map_err(|e| format!("Error al eliminar hermano: {}", e))
}

#[tauri::command]
pub fn set_hermano_inactive_cmd(db: State<DbConnection>, id: i32) -> Result<(), String> {
    set_hermano_inactive(&db, id).map_err(|e| format!("Error al dar de baja hermano: {}", e))
}

#[tauri::command]
pub fn get_hermanos_by_familia_cmd(
    db: State<DbConnection>,
    familia_id: i32,
) -> Result<Vec<Hermano>, String> {
    get_hermanos_by_familia(&db, familia_id)
        .map_err(|e| format!("Error al obtener hermanos de la familia: {}", e))
}

// Comandos para Familias
#[tauri::command]
pub fn get_all_familias_cmd(db: State<DbConnection>) -> Result<Vec<Familia>, String> {
    get_all_familias(&db).map_err(|e| format!("Error al obtener familias: {}", e))
}

#[tauri::command]
pub fn get_familia_by_id_cmd(db: State<DbConnection>, id: i32) -> Result<Option<Familia>, String> {
    get_familia_by_id(&db, id).map_err(|e| format!("Error al obtener familia: {}", e))
}

#[tauri::command]
pub fn search_familias_cmd(db: State<DbConnection>, query: String) -> Result<Vec<Familia>, String> {
    search_familias(&db, &query).map_err(|e| format!("Error al buscar familias: {}", e))
}

#[tauri::command]
pub fn create_familia_cmd(db: State<DbConnection>, familia: Familia) -> Result<i32, String> {
    create_familia(&db, &familia).map_err(|e| format!("Error al crear familia: {}", e))
}

#[tauri::command]
pub fn update_familia_cmd(
    db: State<DbConnection>,
    id: i32,
    familia: Familia,
) -> Result<(), String> {
    update_familia(&db, id, &familia).map_err(|e| format!("Error al actualizar familia: {}", e))
}

#[tauri::command]
pub fn delete_familia_cmd(db: State<DbConnection>, id: i32) -> Result<(), String> {
    delete_familia(&db, id).map_err(|e| format!("Error al eliminar familia: {}", e))
}

#[tauri::command]
pub fn get_familia_stats_cmd(
    db: State<DbConnection>,
    familia_id: i32,
) -> Result<(i32, i32), String> {
    get_familia_stats(&db, familia_id)
        .map_err(|e| format!("Error al obtener estadísticas de familia: {}", e))
}

// Comandos para Cuotas
#[tauri::command]
pub fn get_all_cuotas_cmd(db: State<DbConnection>) -> Result<Vec<Cuota>, String> {
    get_all_cuotas(&db).map_err(|e| format!("Error al obtener cuotas: {}", e))
}

#[tauri::command]
pub fn get_cuotas_by_hermano_cmd(
    db: State<DbConnection>,
    hermano_id: i32,
) -> Result<Vec<Cuota>, String> {
    get_cuotas_by_hermano(&db, hermano_id)
        .map_err(|e| format!("Error al obtener cuotas del hermano: {}", e))
}

#[tauri::command]
pub fn get_cuotas_by_year_cmd(db: State<DbConnection>, anio: i32) -> Result<Vec<Cuota>, String> {
    get_cuotas_by_year(&db, anio).map_err(|e| format!("Error al obtener cuotas del año: {}", e))
}

#[tauri::command]
pub fn get_cuotas_pendientes_cmd(db: State<DbConnection>) -> Result<Vec<Cuota>, String> {
    get_cuotas_pendientes(&db).map_err(|e| format!("Error al obtener cuotas pendientes: {}", e))
}

#[tauri::command]
pub fn create_cuota_cmd(db: State<DbConnection>, cuota: Cuota) -> Result<i32, String> {
    create_cuota(&db, &cuota).map_err(|e| format!("Error al crear cuota: {}", e))
}

#[tauri::command]
pub fn update_cuota_cmd(db: State<DbConnection>, id: i32, cuota: Cuota) -> Result<(), String> {
    update_cuota(&db, id, &cuota).map_err(|e| format!("Error al actualizar cuota: {}", e))
}

#[tauri::command]
pub fn marcar_cuota_pagada_cmd(
    db: State<DbConnection>,
    id: i32,
    fecha_pago: String,
    metodo_pago: String,
) -> Result<(), String> {
    marcar_cuota_pagada(&db, id, &fecha_pago, &metodo_pago)
        .map_err(|e| format!("Error al marcar cuota como pagada: {}", e))
}

#[tauri::command]
pub fn pagar_cuotas_familia_cmd(
    db: State<DbConnection>,
    familia_id: i32,
    anio: i32,
    fecha_pago: String,
    metodo_pago: String,
) -> Result<i32, String> {
    pagar_cuotas_familia(&db, familia_id, anio, &fecha_pago, &metodo_pago)
        .map_err(|e| format!("Error al pagar cuotas de familia: {}", e))
}

#[tauri::command]
pub fn delete_cuota_cmd(db: State<DbConnection>, id: i32) -> Result<(), String> {
    delete_cuota(&db, id).map_err(|e| format!("Error al eliminar cuota: {}", e))
}

#[tauri::command]
pub fn generar_cuotas_anio_cmd(
    db: State<DbConnection>,
    anio: i32,
    importe: f64,
) -> Result<i32, String> {
    generar_cuotas_anio(&db, anio, importe).map_err(|e| format!("Error al generar cuotas: {}", e))
}

#[tauri::command]
pub fn get_estadisticas_cuotas_cmd(
    db: State<DbConnection>,
    anio: Option<i32>,
) -> Result<EstadisticasCuotas, String> {
    get_estadisticas_cuotas(&db, anio).map_err(|e| format!("Error al obtener estadísticas: {}", e))
}

#[tauri::command]
pub fn get_familia_with_hermanos_cmd(
    db: State<DbConnection>,
    id: i32,
) -> Result<Option<Familia>, String> {
    get_familia_with_hermanos(&db, id)
        .map_err(|e| format!("Error al obtener familia con hermanos: {}", e))
}

#[tauri::command]
pub fn get_familia_with_address_cmd(
    db: State<DbConnection>,
    id: i32,
) -> Result<Option<Value>, String> {
    get_familia_with_address(&db, id)
        .map_err(|e| format!("Error al obtener familia con dirección: {}", e))
}

#[tauri::command]
pub fn create_hermano_con_familia_cmd(
    db: State<DbConnection>,
    data: HermanoConFamiliaData,
) -> Result<i32, String> {
    let nueva_familia_nombre = data.nueva_familia_nombre.clone();
    let hermano = data.hermano;

    let familia_id = if let Some(nombre_familia) = nueva_familia_nombre.clone() {
        let nueva_familia = Familia {
            id: None,
            nombre_familia: nombre_familia.clone(),
            hermano_direccion_id: None,
            created_at: None,
            updated_at: None,
        };

        match create_familia(&db, &nueva_familia) {
            Ok(familia_id) => Some(familia_id),
            Err(e) => {
                return Err(format!(
                    "Error al crear familia '{}': {}",
                    nombre_familia, e
                ))
            }
        }
    } else {
        hermano.familia_id
    };

    let mut hermano_para_crear = hermano;
    hermano_para_crear.familia_id = familia_id;

    let hermano_id = match create_hermano(&db, &hermano_para_crear) {
        Ok(id) => id,
        Err(e) => return Err(format!("Error al crear hermano: {}", e)),
    };

    if let (Some(familia_id_nueva), Some(nombre_familia)) = (familia_id, nueva_familia_nombre) {
        let familia_actualizada = Familia {
            id: Some(familia_id_nueva),
            nombre_familia: nombre_familia.clone(),
            hermano_direccion_id: Some(hermano_id),
            created_at: None,
            updated_at: None,
        };

        if let Err(e) = update_familia(&db, familia_id_nueva, &familia_actualizada) {
            eprintln!(
                "Advertencia: No se pudo establecer la dirección principal de la familia: {}",
                e
            );
        }
    }

    Ok(hermano_id)
}

// ─── Comandos de configuración de ruta de datos ───────────────────────────────

/// Devuelve la configuración de ruta de datos actual (directorio efectivo, si es custom, y el default)
#[tauri::command]
pub fn get_data_dir_config_cmd() -> DataDirConfig {
    get_data_dir_config()
}

/// Comprueba si ya existe una BD en el directorio destino (sin modificar nada)
#[tauri::command]
pub fn check_new_data_dir_cmd(new_dir: String) -> CheckDataDirResult {
    check_new_data_dir(&new_dir)
}

/// Aplica el cambio de directorio de datos.
///
/// - Si `use_existing_db` es `None`: sin conflicto → copia la BD actual al nuevo dir.
/// - Si `use_existing_db` es `Some(true)`: usar BD existente en el nuevo dir;
///   hace backup zst de la BD actual a Descargas antes de cambiar.
/// - Si `use_existing_db` es `Some(false)`: usar BD actual;
///   renombra la existente en el nuevo dir a .backup y copia la actual.
#[tauri::command]
pub fn apply_data_dir_change_cmd(
    new_dir: String,
    use_existing_db: Option<bool>,
) -> Result<String, String> {
    use chrono::Local;
    use std::fs;
    use std::path::PathBuf;

    let new_dir_path = PathBuf::from(&new_dir);

    // Crear el directorio destino si no existe
    fs::create_dir_all(&new_dir_path)
        .map_err(|e| format!("No se pudo crear el directorio destino: {}", e))?;

    let current_dir = crate::config::get_effective_data_dir();
    let current_db = PathBuf::from(&current_dir).join("hermanar.db");
    let current_backup = PathBuf::from(&current_dir).join("hermanar.db.backup");
    let new_db = new_dir_path.join("hermanar.db");
    let new_backup = new_dir_path.join("hermanar.db.backup");

    match use_existing_db {
        None => {
            // Sin conflicto: copiar la BD actual al nuevo directorio
            if current_db.exists() {
                fs::copy(&current_db, &new_db)
                    .map_err(|e| format!("No se pudo copiar la base de datos: {}", e))?;
            }
            if current_backup.exists() {
                fs::copy(&current_backup, &new_backup)
                    .map_err(|e| format!("No se pudo copiar el backup automático: {}", e))?;
            }
        }
        Some(true) => {
            // Usar la BD existente en el nuevo dir.
            // Hacer backup zst a Descargas de la BD actual.
            if current_db.exists() {
                let db_data = fs::read(&current_db)
                    .map_err(|e| format!("No se pudo leer la base de datos actual: {}", e))?;
                let compressed = zstd::encode_all(&db_data[..], 3)
                    .map_err(|e| format!("Error al comprimir backup: {}", e))?;
                let download_dir = dirs::download_dir()
                    .ok_or_else(|| "No se pudo obtener el directorio de descargas".to_string())?;
                let now = Local::now();
                let backup_filename = format!(
                    "hermanar-antes-cambio-ruta-{}.zst",
                    now.format("%Y-%m-%d-%H-%M-%S")
                );
                let backup_dest = download_dir.join(&backup_filename);
                fs::write(&backup_dest, compressed)
                    .map_err(|e| format!("No se pudo guardar el backup: {}", e))?;
                println!(
                    "Backup de BD actual guardado en: {}",
                    backup_dest.to_string_lossy()
                );
            }
            // No copiamos nada: la BD destino ya está en su sitio.
        }
        Some(false) => {
            // Usar la BD actual. La BD existente en el nuevo dir se renombra a .backup.
            if new_db.exists() {
                fs::rename(&new_db, &new_backup)
                    .map_err(|e| format!("No se pudo hacer backup de la BD existente: {}", e))?;
            }
            // Copiar la BD actual al nuevo directorio
            if current_db.exists() {
                fs::copy(&current_db, &new_db)
                    .map_err(|e| format!("No se pudo copiar la base de datos: {}", e))?;
            }
            if current_backup.exists() && !new_backup.exists() {
                fs::copy(&current_backup, &new_backup)
                    .map_err(|e| format!("No se pudo copiar el backup automático: {}", e))?;
            }
        }
    }

    // Guardar la nueva ruta en config.json
    let new_config = AppConfig {
        custom_data_dir: Some(new_dir.clone()),
    };
    save_app_config(&new_config)
        .map_err(|e| format!("No se pudo guardar la configuración: {}", e))?;

    Ok(format!(
        "Ruta de datos cambiada a: {}. Reinicia la aplicación para aplicar los cambios.",
        new_dir
    ))
}

/// Restablece el directorio de datos al valor por defecto del sistema
#[tauri::command]
pub fn reset_data_dir_cmd() -> Result<String, String> {
    let new_config = AppConfig {
        custom_data_dir: None,
    };
    save_app_config(&new_config)
        .map_err(|e| format!("No se pudo guardar la configuración: {}", e))?;

    let default_dir = crate::config::get_default_data_dir();
    Ok(format!(
        "Ruta de datos restablecida al directorio por defecto: {}. Reinicia la aplicación para aplicar los cambios.",
        default_dir
    ))
}
