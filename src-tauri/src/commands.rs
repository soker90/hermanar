use crate::db::{
    Hermano, Familia, Cuota, EstadisticasCuotas, DbConnection,
    get_all_hermanos, get_hermanos_activos, get_hermano_by_id, search_hermanos,
    create_hermano, update_hermano, delete_hermano, set_hermano_inactive, get_hermanos_by_familia,
    update_hermano_familia,
    get_all_familias, get_familia_by_id, search_familias, create_familia,
    update_familia, delete_familia, get_familia_stats, get_familia_with_hermanos, get_familia_with_address,
    get_all_cuotas, get_cuotas_by_hermano, get_cuotas_by_year, get_cuotas_pendientes,
    create_cuota, update_cuota, delete_cuota, marcar_cuota_pagada, pagar_cuotas_familia,
    generar_cuotas_anio, get_estadisticas_cuotas
};
use serde_json::Value;
use serde::{Deserialize, Serialize};
use tauri::State;

// Comando para obtener la versión de la aplicación
#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HermanoConFamiliaData {
    pub hermano: Hermano,
    pub nueva_familia_nombre: Option<String>,
}

// Comandos para Hermanos
#[tauri::command]
pub fn get_all_hermanos_cmd(db: State<DbConnection>) -> Result<Vec<Hermano>, String> {
    get_all_hermanos(&db)
        .map_err(|e| format!("Error al obtener hermanos: {}", e))
}

#[tauri::command]
pub fn get_hermanos_activos_cmd(db: State<DbConnection>) -> Result<Vec<Hermano>, String> {
    get_hermanos_activos(&db)
        .map_err(|e| format!("Error al obtener hermanos activos: {}", e))
}

#[tauri::command]
pub fn get_hermano_by_id_cmd(db: State<DbConnection>, id: i32) -> Result<Option<Hermano>, String> {
    get_hermano_by_id(&db, id)
        .map_err(|e| format!("Error al obtener hermano: {}", e))
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
    search_hermanos(&db, &query)
        .map_err(|e| format!("Error al buscar hermanos: {}", e))
}

#[tauri::command]
pub fn create_hermano_cmd(db: State<DbConnection>, hermano: Hermano) -> Result<i32, String> {
    create_hermano(&db, &hermano)
        .map_err(|e| format!("Error al crear hermano: {}", e))
}

#[tauri::command]
pub fn update_hermano_cmd(db: State<DbConnection>, id: i32, hermano: Hermano) -> Result<(), String> {
    update_hermano(&db, id, &hermano)
        .map_err(|e| format!("Error al actualizar hermano: {}", e))
}

#[tauri::command]
pub fn update_hermano_familia_cmd(db: State<DbConnection>, hermano_id: i32, familia_id: Option<i32>) -> Result<(), String> {
    update_hermano_familia(&db, hermano_id, familia_id)
        .map_err(|e| format!("Error al actualizar familia del hermano: {}", e))
}

#[tauri::command]
pub fn delete_hermano_cmd(db: State<DbConnection>, id: i32) -> Result<(), String> {
    delete_hermano(&db, id)
        .map_err(|e| format!("Error al eliminar hermano: {}", e))
}

#[tauri::command]
pub fn set_hermano_inactive_cmd(db: State<DbConnection>, id: i32) -> Result<(), String> {
    set_hermano_inactive(&db, id)
        .map_err(|e| format!("Error al dar de baja hermano: {}", e))
}

#[tauri::command]
pub fn get_hermanos_by_familia_cmd(db: State<DbConnection>, familia_id: i32) -> Result<Vec<Hermano>, String> {
    get_hermanos_by_familia(&db, familia_id)
        .map_err(|e| format!("Error al obtener hermanos de la familia: {}", e))
}

// Comandos para Familias
#[tauri::command]
pub fn get_all_familias_cmd(db: State<DbConnection>) -> Result<Vec<Familia>, String> {
    get_all_familias(&db)
        .map_err(|e| format!("Error al obtener familias: {}", e))
}

#[tauri::command]
pub fn get_familia_by_id_cmd(db: State<DbConnection>, id: i32) -> Result<Option<Familia>, String> {
    get_familia_by_id(&db, id)
        .map_err(|e| format!("Error al obtener familia: {}", e))
}

#[tauri::command]
pub fn search_familias_cmd(db: State<DbConnection>, query: String) -> Result<Vec<Familia>, String> {
    search_familias(&db, &query)
        .map_err(|e| format!("Error al buscar familias: {}", e))
}

#[tauri::command]
pub fn create_familia_cmd(db: State<DbConnection>, familia: Familia) -> Result<i32, String> {
    create_familia(&db, &familia)
        .map_err(|e| format!("Error al crear familia: {}", e))
}

#[tauri::command]
pub fn update_familia_cmd(db: State<DbConnection>, id: i32, familia: Familia) -> Result<(), String> {
    update_familia(&db, id, &familia)
        .map_err(|e| format!("Error al actualizar familia: {}", e))
}

#[tauri::command]
pub fn delete_familia_cmd(db: State<DbConnection>, id: i32) -> Result<(), String> {
    delete_familia(&db, id)
        .map_err(|e| format!("Error al eliminar familia: {}", e))
}

#[tauri::command]
pub fn get_familia_stats_cmd(db: State<DbConnection>, familia_id: i32) -> Result<(i32, i32), String> {
    get_familia_stats(&db, familia_id)
        .map_err(|e| format!("Error al obtener estadísticas de familia: {}", e))
}

// Comandos para Cuotas
#[tauri::command]
pub fn get_all_cuotas_cmd(db: State<DbConnection>) -> Result<Vec<Cuota>, String> {
    get_all_cuotas(&db)
        .map_err(|e| format!("Error al obtener cuotas: {}", e))
}

#[tauri::command]
pub fn get_cuotas_by_hermano_cmd(db: State<DbConnection>, hermano_id: i32) -> Result<Vec<Cuota>, String> {
    get_cuotas_by_hermano(&db, hermano_id)
        .map_err(|e| format!("Error al obtener cuotas del hermano: {}", e))
}

#[tauri::command]
pub fn get_cuotas_by_year_cmd(db: State<DbConnection>, anio: i32) -> Result<Vec<Cuota>, String> {
    get_cuotas_by_year(&db, anio)
        .map_err(|e| format!("Error al obtener cuotas del año: {}", e))
}

#[tauri::command]
pub fn get_cuotas_pendientes_cmd(db: State<DbConnection>) -> Result<Vec<Cuota>, String> {
    get_cuotas_pendientes(&db)
        .map_err(|e| format!("Error al obtener cuotas pendientes: {}", e))
}

#[tauri::command]
pub fn create_cuota_cmd(db: State<DbConnection>, cuota: Cuota) -> Result<i32, String> {
    create_cuota(&db, &cuota)
        .map_err(|e| format!("Error al crear cuota: {}", e))
}

#[tauri::command]
pub fn update_cuota_cmd(db: State<DbConnection>, id: i32, cuota: Cuota) -> Result<(), String> {
    update_cuota(&db, id, &cuota)
        .map_err(|e| format!("Error al actualizar cuota: {}", e))
}

#[tauri::command]
pub fn marcar_cuota_pagada_cmd(db: State<DbConnection>, id: i32, fecha_pago: String, metodo_pago: String) -> Result<(), String> {
    marcar_cuota_pagada(&db, id, &fecha_pago, &metodo_pago)
        .map_err(|e| format!("Error al marcar cuota como pagada: {}", e))
}

#[tauri::command]
pub fn pagar_cuotas_familia_cmd(
    db: State<DbConnection>,
    familia_id: i32,
    anio: i32,
    fecha_pago: String,
    metodo_pago: String
) -> Result<i32, String> {
    pagar_cuotas_familia(&db, familia_id, anio, &fecha_pago, &metodo_pago)
        .map_err(|e| format!("Error al pagar cuotas de familia: {}", e))
}

#[tauri::command]
pub fn delete_cuota_cmd(db: State<DbConnection>, id: i32) -> Result<(), String> {
    delete_cuota(&db, id)
        .map_err(|e| format!("Error al eliminar cuota: {}", e))
}

#[tauri::command]
pub fn generar_cuotas_anio_cmd(db: State<DbConnection>, anio: i32, importe: f64) -> Result<i32, String> {
    generar_cuotas_anio(&db, anio, importe)
        .map_err(|e| format!("Error al generar cuotas: {}", e))
}

#[tauri::command]
pub fn get_estadisticas_cuotas_cmd(db: State<DbConnection>, anio: Option<i32>) -> Result<EstadisticasCuotas, String> {
    get_estadisticas_cuotas(&db, anio)
        .map_err(|e| format!("Error al obtener estadísticas: {}", e))
}

#[tauri::command]
pub fn get_familia_with_hermanos_cmd(db: State<DbConnection>, id: i32) -> Result<Option<Familia>, String> {
    get_familia_with_hermanos(&db, id)
        .map_err(|e| format!("Error al obtener familia con hermanos: {}", e))
}

#[tauri::command]
pub fn get_familia_with_address_cmd(db: State<DbConnection>, id: i32) -> Result<Option<Value>, String> {
    get_familia_with_address(&db, id)
        .map_err(|e| format!("Error al obtener familia con dirección: {}", e))
}

#[tauri::command]
pub fn create_hermano_con_familia_cmd(db: State<DbConnection>, data: HermanoConFamiliaData) -> Result<i32, String> {
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
            Err(e) => return Err(format!("Error al crear familia '{}': {}", nombre_familia, e)),
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
            eprintln!("Advertencia: No se pudo establecer la dirección principal de la familia: {}", e);
        }
    }

    Ok(hermano_id)
}
