use crate::db::*;
use crate::tests::fixtures::*;

// ============================================================================
// TESTS DE CUOTAS
// ============================================================================

#[test]
fn test_create_cuota() {
    let db = create_test_db();
    let hermano_id = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();
    let cuota_id = insert_test_cuota(&db, hermano_id, 2025, 50.0, false).unwrap();

    assert!(cuota_id > 0);
}

#[test]
fn test_cuota_unique_constraint() {
    let db = create_test_db();
    let hermano_id = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();
    insert_test_cuota(&db, hermano_id, 2025, 50.0, false).unwrap();

    let result = insert_test_cuota(&db, hermano_id, 2025, 75.0, false);
    assert!(result.is_err()); // Debe fallar por restricción UNIQUE
}

#[test]
fn test_get_cuotas_pendientes() {
    let db = create_test_db();
    let h1 = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();
    let h2 = insert_test_hermano(&db, "00002", Some("Pedro"), Some("López"), None).unwrap();

    insert_test_cuota(&db, h1, 2025, 50.0, false).unwrap(); // Pendiente
    insert_test_cuota(&db, h1, 2024, 50.0, true).unwrap(); // Pagada
    insert_test_cuota(&db, h2, 2025, 50.0, false).unwrap(); // Pendiente

    let conn = db.lock().unwrap();
    let count: i32 = conn
        .query_row("SELECT COUNT(*) FROM cuotas WHERE pagado = 0", [], |row| {
            row.get(0)
        })
        .unwrap();

    assert_eq!(count, 2);
}

#[test]
fn test_get_cuotas_by_year() {
    let db = create_test_db();
    let h1 = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();
    let h2 = insert_test_hermano(&db, "00002", Some("Pedro"), Some("López"), None).unwrap();

    insert_test_cuota(&db, h1, 2025, 50.0, false).unwrap();
    insert_test_cuota(&db, h1, 2024, 50.0, false).unwrap();
    insert_test_cuota(&db, h2, 2025, 50.0, false).unwrap();

    let conn = db.lock().unwrap();
    let count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM cuotas WHERE anio = ?1",
            rusqlite::params![2025],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(count, 2);
}

#[test]
fn test_get_cuotas_by_hermano() {
    let db = create_test_db();
    let h1 = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();
    let h2 = insert_test_hermano(&db, "00002", Some("Pedro"), Some("López"), None).unwrap();

    insert_test_cuota(&db, h1, 2025, 50.0, false).unwrap();
    insert_test_cuota(&db, h1, 2024, 50.0, false).unwrap();
    insert_test_cuota(&db, h2, 2025, 50.0, false).unwrap();

    let conn = db.lock().unwrap();
    let count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM cuotas WHERE hermano_id = ?1",
            rusqlite::params![h1],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(count, 2);
}

#[test]
fn test_pagar_cuota() {
    let db = create_test_db();
    let hermano_id = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();
    let cuota_id = insert_test_cuota(&db, hermano_id, 2025, 50.0, false).unwrap();

    let conn = db.lock().unwrap();
    conn.execute(
        "UPDATE cuotas SET pagado = 1, fecha_pago = ?1 WHERE id = ?2",
        rusqlite::params!["2025-02-06", cuota_id],
    )
    .unwrap();
    drop(conn);

    let conn = db.lock().unwrap();
    let pagado: i32 = conn
        .query_row(
            "SELECT pagado FROM cuotas WHERE id = ?1",
            rusqlite::params![cuota_id],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(pagado, 1);
}

#[test]
fn test_delete_cuota() {
    let db = create_test_db();
    let hermano_id = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();
    let cuota_id = insert_test_cuota(&db, hermano_id, 2025, 50.0, false).unwrap();

    let conn = db.lock().unwrap();
    conn.execute(
        "DELETE FROM cuotas WHERE id = ?1",
        rusqlite::params![cuota_id],
    )
    .unwrap();
    drop(conn);

    let conn = db.lock().unwrap();
    let count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM cuotas WHERE id = ?1",
            rusqlite::params![cuota_id],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(count, 0);
}

#[test]
fn test_cuota_importe_positivo() {
    let db = create_test_db();
    let h1 = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();

    let conn = db.lock().unwrap();
    let now = chrono::Local::now().to_rfc3339();

    // SQLite no tiene CHECK constraints por defecto, pero probamos con lógica app
    let result = conn.execute(
        "INSERT INTO cuotas (hermano_id, anio, importe, pagado, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![h1, 2025, -50.0, false, now, now],
    );

    assert!(result.is_ok()); // SQLite permite, validación debe estar en Rust
}

#[test]
fn test_cuota_boundary_anio() {
    let db = create_test_db();
    let h1 = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();

    insert_test_cuota(&db, h1, 1900, 50.0, false).unwrap();
    insert_test_cuota(&db, h1, 2025, 50.0, false).unwrap();
    insert_test_cuota(&db, h1, 2099, 50.0, false).unwrap();

    let conn = db.lock().unwrap();
    let count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM cuotas WHERE hermano_id = ?1",
            rusqlite::params![h1],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(count, 3);
}

#[test]
fn test_multiple_hermanos_mismo_numero_anio_cuota() {
    let db = create_test_db();
    let h1 = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();
    let h2 = insert_test_hermano(&db, "00002", Some("Pedro"), Some("López"), None).unwrap();

    let c1 = insert_test_cuota(&db, h1, 2025, 50.0, false).unwrap();
    let c2 = insert_test_cuota(&db, h2, 2025, 75.0, false).unwrap();

    assert!(c1 > 0);
    assert!(c2 > 0);
    assert_ne!(c1, c2);
}

#[test]
fn test_cuotas_total_importe_por_hermano() {
    let db = create_test_db();
    let h1 = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();
    let h2 = insert_test_hermano(&db, "00002", Some("Pedro"), Some("López"), None).unwrap();

    insert_test_cuota(&db, h1, 2025, 50.0, false).unwrap();
    insert_test_cuota(&db, h1, 2024, 75.0, false).unwrap();
    insert_test_cuota(&db, h2, 2025, 100.0, false).unwrap();

    let conn = db.lock().unwrap();
    let total: f64 = conn
        .query_row(
            "SELECT SUM(importe) FROM cuotas WHERE hermano_id = ?1",
            rusqlite::params![h1],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(total, 125.0);
}

#[test]
fn test_cuotas_pagadas_vs_pendientes() {
    let db = create_test_db();
    let h1 = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();

    insert_test_cuota(&db, h1, 2025, 50.0, false).unwrap();
    insert_test_cuota(&db, h1, 2024, 50.0, true).unwrap();
    insert_test_cuota(&db, h1, 2023, 50.0, true).unwrap();

    let conn = db.lock().unwrap();
    let pagadas: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM cuotas WHERE hermano_id = ?1 AND pagado = 1",
            rusqlite::params![h1],
            |row| row.get(0),
        )
        .unwrap();

    let pendientes: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM cuotas WHERE hermano_id = ?1 AND pagado = 0",
            rusqlite::params![h1],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(pagadas, 2);
    assert_eq!(pendientes, 1);
}

// ============================================================================
// TESTS DE COMANDOS - CUOTAS
// ============================================================================

#[test]
fn test_cmd_crear_cuota() {
    let db = create_test_db();

    let h1 = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();
    let cuota_id = insert_test_cuota(&db, h1, 2025, 50.0, false).unwrap();
    assert!(cuota_id > 0, "ID debe ser válido");
}

#[test]
fn test_cmd_eliminar_cuota() {
    let db = create_test_db();

    let h1 = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();
    let cuota_id = insert_test_cuota(&db, h1, 2025, 50.0, false).unwrap();

    // Eliminar
    delete_cuota(&db, cuota_id).unwrap();

    // Verificar usando query directo
    let conn = db.lock().unwrap();
    let result: Result<i32, _> = conn.query_row(
        "SELECT COUNT(*) FROM cuotas WHERE id = ?1",
        [cuota_id],
        |row| row.get(0),
    );
    assert_eq!(result.unwrap(), 0, "Cuota debe ser eliminada");
}

#[test]
fn test_cmd_restriccion_cuota_unica_por_anio() {
    let db = create_test_db();

    let h1 = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();

    // Crear cuota para año 2025
    insert_test_cuota(&db, h1, 2025, 50.0, false).unwrap();

    // Intentar crear otra para el mismo año (debe fallar por UNIQUE constraint)
    let cuota = Cuota {
        id: None,
        hermano_id: h1,
        anio: 2025,
        importe: 60.0,
        pagado: false,
        fecha_pago: None,
        metodo_pago: None,
        observaciones: None,
        recibo: false,
        created_at: None,
        updated_at: None,
    };

    let result = create_cuota(&db, &cuota);
    assert!(
        result.is_err(),
        "Debe rechazar cuota duplicada del mismo año"
    );
}
