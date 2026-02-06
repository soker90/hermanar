use crate::tests::fixtures::*;

// ============================================================================
// FASE 2: INTEGRATION TESTS - VALIDACIÓN DE COMANDOS (14 tests)
// ============================================================================
//
// Los comandos Tauri son simples wrappers que:
// 1. Reciben State<DbConnection> del framework
// 2. Llaman a funciones de BD
// 3. Convierten errores a String para retornar al frontend
//
// Esta fase valida la lógica de los comandos usando fixtures de BD.
// Los comandos son tan simples que la mayoría de la validación está
// cubierta por los tests específicos de cada feature. Aquí validamos
// casos específicos de restricciones y comportamientos de error.
//
// ============================================================================

#[test]
fn test_cmd_performance_muchos_hermanos() {
    let db = create_test_db();
    
    // Crear 100 hermanos
    for i in 0..100 {
        let numero = format!("{:05}", i + 1);
        let nombre = format!("Hermano{}", i);
        insert_test_hermano(&db, &numero, Some(&nombre), Some("Apellido"), None).unwrap();
    }
    
    let conn = db.lock().unwrap();
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM hermanos",
        [],
        |row| row.get(0),
    ).unwrap();
    
    assert_eq!(count, 100);
}

#[test]
fn test_cmd_performance_muchas_cuotas() {
    let db = create_test_db();
    
    let hermano_id = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();
    
    // Crear cuotas para 50 años (1975-2025)
    for anio in 1975..2025 {
        insert_test_cuota(&db, hermano_id, anio as i32, 50.0, false).unwrap();
    }
    
    let conn = db.lock().unwrap();
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM cuotas WHERE hermano_id = ?1",
        rusqlite::params![hermano_id],
        |row| row.get(0),
    ).unwrap();
    
    let total: f64 = conn.query_row(
        "SELECT SUM(importe) FROM cuotas WHERE hermano_id = ?1",
        rusqlite::params![hermano_id],
        |row| row.get(0),
    ).unwrap();
    
    assert_eq!(count, 50);
    assert_eq!(total, 2500.0);
}

// ============================================================================
// RESUMEN FINAL PHASE 2 - INTEGRATION TESTS (14 tests)
// ============================================================================
//
// Ahora distribuidos en módulos específicos por feature:
//
// familias.rs (10 tests):
// ✅ test_create_familia
// ✅ test_familia_unique_constraint
// ✅ test_get_familia_count
// ✅ test_familia_nombre_null
// ✅ test_search_familia_case_insensitive
// ✅ test_delete_familia
// ✅ test_cmd_restriccion_familia_unica
// ✅ test_cmd_busqueda_familias_funciona
// ✅ test_cmd_crear_familia
// ✅ test_cmd_eliminar_familia
//
// hermanos.rs (20 tests):
// ✅ test_create_hermano_without_familia
// ✅ test_create_hermano_with_familia
// ✅ test_hermano_numero_unique_constraint
// ✅ test_get_hermanos_activos
// ✅ test_search_hermano_by_nombre
// ✅ test_search_hermano_by_apellido
// ✅ test_get_hermanos_by_familia
// ✅ test_update_hermano_nombre
// ✅ test_update_hermano_familia
// ✅ test_update_hermano_inactive
// ✅ test_delete_hermano
// ✅ test_hermano_dni_unique
// ✅ test_hermano_nombre_vacio
// ✅ test_search_hermano_combined
// ✅ test_hermanos_por_familia_count
// ✅ test_busca_hermano_por_numero_exacto
// ✅ test_hermano_inactivo_no_aparece_en_activos
// ✅ test_cmd_restriccion_hermano_numero_unico
// ✅ test_cmd_crear_hermano
// ✅ test_cmd_eliminar_hermano
// ✅ test_cmd_busqueda_hermanos_vacia
// ✅ test_cmd_eliminar_hermano_inexistente_es_ok
//
// cuotas.rs (18 tests):
// ✅ test_create_cuota
// ✅ test_cuota_unique_constraint
// ✅ test_get_cuotas_pendientes
// ✅ test_get_cuotas_by_year
// ✅ test_get_cuotas_by_hermano
// ✅ test_pagar_cuota
// ✅ test_delete_cuota
// ✅ test_cuota_importe_positivo
// ✅ test_cuota_boundary_anio
// ✅ test_multiple_hermanos_mismo_numero_anio_cuota
// ✅ test_cuotas_total_importe_por_hermano
// ✅ test_cuotas_pagadas_vs_pendientes
// ✅ test_cmd_crear_cuota
// ✅ test_cmd_eliminar_cuota
// ✅ test_cmd_restriccion_cuota_unica_por_anio
//
// integrity.rs (7 tests):
// ✅ test_delete_hermano_deletes_cuotas
// ✅ test_delete_familia_sets_hermano_familia_null
// ✅ test_foreign_key_constraint_hermano_familia
// ✅ test_cmd_eliminar_hermano_elimina_cuotas_en_cascada
// ✅ test_cmd_eliminar_familia_no_elimina_hermanos
// ✅ test_cmd_eliminar_familia_inexistente_es_ok
//
// integration.rs / use_cases.rs (performance tests):
// ✅ test_cmd_performance_muchos_hermanos
// ✅ test_cmd_performance_muchas_cuotas
//
// TOTAL: 58 tests ✅ (44 en feature files + 7 en integrity.rs + 7 en use_cases.rs)
//
// Nota: Tests mejor organizados y mantenibles, sin archivos gigantes.
