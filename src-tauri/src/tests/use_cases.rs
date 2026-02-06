use crate::tests::fixtures::*;

// ============================================================================
// TESTS DE CASOS DE USO REALES / FLUJOS COMPLETOS
// ============================================================================

#[test]
fn test_flujo_crear_familia_con_hermanos_y_cuotas() {
    let db = create_test_db();
    
    // Paso 1: Crear familia
    let familia_id = insert_test_familia(&db, None).unwrap();
    assert!(familia_id > 0);
    
    // Paso 2: Crear hermanos en la familia
    let h1 = insert_fake_hermano(&db, "00001", Some(familia_id)).unwrap();
    let h2 = insert_fake_hermano(&db, "00002", Some(familia_id)).unwrap();
    
    // Paso 3: Generar cuotas para los hermanos
    insert_test_cuota(&db, h1, 2025, 50.0, false).unwrap();
    insert_test_cuota(&db, h1, 2024, 50.0, true).unwrap();
    insert_test_cuota(&db, h2, 2025, 50.0, false).unwrap();
    
    // Verificar estructura completa
    let conn = db.lock().unwrap();
    let total_hermanos: i32 = conn.query_row(
        "SELECT COUNT(*) FROM hermanos WHERE familia_id = ?1",
        rusqlite::params![familia_id],
        |row| row.get(0),
    ).unwrap();
    
    let total_cuotas: i32 = conn.query_row(
        "SELECT COUNT(*) FROM cuotas WHERE hermano_id IN (SELECT id FROM hermanos WHERE familia_id = ?1)",
        rusqlite::params![familia_id],
        |row| row.get(0),
    ).unwrap();
    
    assert_eq!(total_hermanos, 2);
    assert_eq!(total_cuotas, 3);
}

#[test]
fn test_cambio_familia_hermano() {
    let db = create_test_db();
    
    // Crear dos familias
    let f1 = insert_test_familia(&db, None).unwrap();
    let f2 = insert_test_familia(&db, None).unwrap();
    
    // Crear hermano en familia 1
    let hermano_id = insert_fake_hermano(&db, "00001", Some(f1)).unwrap();
    
    // Crear cuotas para el hermano
    insert_test_cuota(&db, hermano_id, 2025, 50.0, false).unwrap();
    insert_test_cuota(&db, hermano_id, 2024, 50.0, false).unwrap();
    
    // Cambiar hermano a familia 2
    let conn = db.lock().unwrap();
    conn.execute(
        "UPDATE hermanos SET familia_id = ?1 WHERE id = ?2",
        rusqlite::params![f2, hermano_id],
    ).unwrap();
    drop(conn);
    
    // Verificar cambio
    let conn = db.lock().unwrap();
    let nueva_familia: i32 = conn.query_row(
        "SELECT familia_id FROM hermanos WHERE id = ?1",
        rusqlite::params![hermano_id],
        |row| row.get(0),
    ).unwrap();
    
    let cuotas_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM cuotas WHERE hermano_id = ?1",
        rusqlite::params![hermano_id],
        |row| row.get(0),
    ).unwrap();
    
    assert_eq!(nueva_familia, f2);
    assert_eq!(cuotas_count, 2); // Cuotas no se afectan
}

#[test]
fn test_reporte_cuotas_anio() {
    let db = create_test_db();
    
    let h1 = insert_fake_hermano(&db, "00001", None).unwrap();
    let h2 = insert_fake_hermano(&db, "00002", None).unwrap();
    let h3 = insert_fake_hermano(&db, "00003", None).unwrap();
    
    // Cuotas 2025
    insert_test_cuota(&db, h1, 2025, 50.0, true).unwrap();
    insert_test_cuota(&db, h2, 2025, 50.0, false).unwrap();
    insert_test_cuota(&db, h3, 2025, 50.0, true).unwrap();
    
    // Cuotas 2024
    insert_test_cuota(&db, h1, 2024, 50.0, true).unwrap();
    insert_test_cuota(&db, h2, 2024, 50.0, true).unwrap();
    
    let conn = db.lock().unwrap();
    
    // Total cuotas 2025
    let cuotas_2025: i32 = conn.query_row(
        "SELECT COUNT(*) FROM cuotas WHERE anio = 2025",
        [],
        |row| row.get(0),
    ).unwrap();
    
    // Total cobrado 2025
    let cobrado_2025: f64 = conn.query_row(
        "SELECT COALESCE(SUM(importe), 0) FROM cuotas WHERE anio = 2025 AND pagado = 1",
        [],
        |row| row.get(0),
    ).unwrap();
    
    assert_eq!(cuotas_2025, 3);
    assert_eq!(cobrado_2025, 100.0); // 2 pagadas * 50
}

#[test]
fn test_performance_muchos_hermanos() {
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
fn test_performance_muchas_cuotas() {
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

#[test]
fn test_flujo_donativo_completo() {
    let db = create_test_db();
    
    // 1. Crear familia
    let familia = insert_test_familia(&db, None).unwrap();
    
    // 2. Crear dos hermanos
    let h1 = insert_fake_hermano(&db, "00001", Some(familia)).unwrap();
    let h2 = insert_fake_hermano(&db, "00002", Some(familia)).unwrap();
    
    // 3. Crear cuotas para varios años
    insert_test_cuota(&db, h1, 2023, 100.0, true).unwrap();
    insert_test_cuota(&db, h1, 2024, 100.0, true).unwrap();
    insert_test_cuota(&db, h1, 2025, 100.0, false).unwrap();
    insert_test_cuota(&db, h2, 2023, 100.0, true).unwrap();
    insert_test_cuota(&db, h2, 2024, 100.0, false).unwrap();
    insert_test_cuota(&db, h2, 2025, 100.0, false).unwrap();
    
    let conn = db.lock().unwrap();
    
    // Estadísticas por hermano
    for hermano_id in [h1, h2].iter() {
        let pagadas: i32 = conn.query_row(
            "SELECT COUNT(*) FROM cuotas WHERE hermano_id = ?1 AND pagado = 1",
            rusqlite::params![hermano_id],
            |row| row.get(0),
        ).unwrap();
        
        let pendientes: i32 = conn.query_row(
            "SELECT COUNT(*) FROM cuotas WHERE hermano_id = ?1 AND pagado = 0",
            rusqlite::params![hermano_id],
            |row| row.get(0),
        ).unwrap();
        
        let total: f64 = conn.query_row(
            "SELECT COALESCE(SUM(importe), 0) FROM cuotas WHERE hermano_id = ?1",
            rusqlite::params![hermano_id],
            |row| row.get(0),
        ).unwrap();
        
        assert_eq!(pagadas + pendientes, 3);
        assert_eq!(total, 300.0);
    }
}

#[test]
fn test_gestion_hermano_inactivo() {
    let db = create_test_db();
    
    // Crear familia y hermano
    let familia = insert_test_familia(&db, None).unwrap();
    let h_id = insert_fake_hermano(&db, "00001", Some(familia)).unwrap();
    
    // Crear cuotas antes de inactivar
    insert_test_cuota(&db, h_id, 2024, 50.0, true).unwrap();
    insert_test_cuota(&db, h_id, 2025, 50.0, false).unwrap();
    
    // Inactivar hermano
    let conn = db.lock().unwrap();
    conn.execute(
        "UPDATE hermanos SET activo = 0, fecha_baja = '2026-02-06' WHERE id = ?1",
        rusqlite::params![h_id],
    ).unwrap();
    drop(conn);
    
    // Verificar estado
    let conn = db.lock().unwrap();
    let activo: i32 = conn.query_row(
        "SELECT activo FROM hermanos WHERE id = ?1",
        rusqlite::params![h_id],
        |row| row.get(0),
    ).unwrap();
    
    let cuotas_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM cuotas WHERE hermano_id = ?1",
        rusqlite::params![h_id],
        |row| row.get(0),
    ).unwrap();
    
    assert_eq!(activo, 0);
    assert_eq!(cuotas_count, 2); // Las cuotas se mantienen
}
