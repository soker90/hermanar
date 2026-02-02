mod db;
mod commands;
mod recibos;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Inicializar base de datos
    let db = db::init_database().expect("Error al inicializar la base de datos");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(db)
        .invoke_handler(tauri::generate_handler![
            // Comandos generales
            get_app_version,
            // Comandos de hermanos
            get_all_hermanos_cmd,
            get_hermanos_activos_cmd,
            get_hermano_by_id_cmd,
            get_hermano_cmd,
            search_hermanos_cmd,
            create_hermano_cmd,
            update_hermano_cmd,
            update_hermano_familia_cmd,
            delete_hermano_cmd,
            set_hermano_inactive_cmd,
            get_hermanos_by_familia_cmd,
            create_hermano_con_familia_cmd,
            // Comandos de familias
            get_all_familias_cmd,
            get_familia_by_id_cmd,
            search_familias_cmd,
            create_familia_cmd,
            update_familia_cmd,
            delete_familia_cmd,
            get_familia_stats_cmd,
            get_familia_with_hermanos_cmd,
            get_familia_with_address_cmd,
            // Comandos de cuotas
            get_all_cuotas_cmd,
            get_cuotas_by_hermano_cmd,
            get_cuotas_by_year_cmd,
            get_cuotas_pendientes_cmd,
            create_cuota_cmd,
            update_cuota_cmd,
            marcar_cuota_pagada_cmd,
            pagar_cuotas_familia_cmd,
            delete_cuota_cmd,
            generar_cuotas_anio_cmd,
            get_estadisticas_cuotas_cmd,
            // Comandos de recibos
            recibos::generar_recibos_pdf_cmd,
            recibos::marcar_recibos_generados_cmd,
            recibos::get_documentos_path_cmd,
            recibos::abrir_carpeta_recibos_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
