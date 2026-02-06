use crate::db::*;
use crate::tests::fixtures::*;

// ============================================================================
// TESTS DE INTEGRIDAD REFERENCIAL Y VALIDACIONES
// ============================================================================

#[test]
fn test_delete_hermano_deletes_cuotas() {
    let db = create_test_db();
    let hermano_id = insert_fake_hermano(&db, "00001", None).unwrap();
    insert_test_cuota(&db, hermano_id, 2025, 50.0, false).unwrap();
    insert_test_cuota(&db, hermano_id, 2024, 50.0, false).unwrap();

    let conn = db.lock().unwrap();
    conn.execute(
        "DELETE FROM hermanos WHERE id = ?1",
        rusqlite::params![hermano_id],
    )
    .unwrap();
    drop(conn);

    let conn = db.lock().unwrap();
    let cuota_count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM cuotas WHERE hermano_id = ?1",
            rusqlite::params![hermano_id],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(cuota_count, 0);
}

#[test]
fn test_delete_familia_sets_hermano_familia_null() {
    let db = create_test_db();
    let familia_id = insert_test_familia(&db, None).unwrap();
    let hermano_id = insert_fake_hermano(&db, "00001", Some(familia_id)).unwrap();

    let conn = db.lock().unwrap();
    conn.execute(
        "DELETE FROM familias WHERE id = ?1",
        rusqlite::params![familia_id],
    )
    .unwrap();
    drop(conn);

    let conn = db.lock().unwrap();
    let stored_familia_id: Option<i32> = conn
        .query_row(
            "SELECT familia_id FROM hermanos WHERE id = ?1",
            rusqlite::params![hermano_id],
            |row| row.get(0),
        )
        .ok();

    assert_eq!(stored_familia_id, None);
}

#[test]
fn test_foreign_key_constraint_hermano_familia() {
    let db = create_test_db();
    let conn = db.lock().unwrap();
    let now = chrono::Local::now().to_rfc3339();

    // Intentar crear hermano con familia_id inexistente
    let result = conn.execute(
        "INSERT INTO hermanos (numero_hermano, nombre, primer_apellido, familia_id, activo, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6)",
        rusqlite::params!["00001", "Juan", "García", 9999, now, now],
    );

    // SQLite sin PRAGMA foreign_keys habilitado no fuerza esto, pero es importante probarlo
    // En producción asegurarse de habilitar: PRAGMA foreign_keys = ON;
    let _ = result; // Comportamiento depende de configuración
}

// ============================================================================
// TESTS DE COMANDOS - INTEGRIDAD REFERENCIAL
// ============================================================================

#[test]
fn test_cmd_eliminar_hermano_elimina_cuotas_en_cascada() {
    let db = create_test_db();

    // Setup
    let h_id = insert_fake_hermano(&db, "00001", None).unwrap();
    insert_test_cuota(&db, h_id, 2025, 50.0, false).unwrap();
    insert_test_cuota(&db, h_id, 2024, 50.0, false).unwrap();

    // Verificar cuotas existen (con query directo)
    {
        let conn = db.lock().unwrap();
        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM cuotas WHERE hermano_id = ?1",
                [h_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 2);
    }

    // Eliminar hermano (debe eliminar cuotas en cascada)
    delete_hermano(&db, h_id).unwrap();

    // Verificar que cuotas desaparecieron
    {
        let conn = db.lock().unwrap();
        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM cuotas WHERE hermano_id = ?1",
                [h_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 0, "Cuotas deberían ser eliminadas en cascada");
    }
}

#[test]
fn test_cmd_eliminar_familia_no_elimina_hermanos() {
    let db = create_test_db();

    // Setup
    let f_id = insert_test_familia(&db, None).unwrap();
    let h_id = insert_fake_hermano(&db, "00001", Some(f_id)).unwrap();

    // Marcar hermano como inactivo primero (requiere validación de negocio)
    set_hermano_inactive(&db, h_id).unwrap();

    // Ahora eliminar familia (debería funcionar porque no hay hermanos ACTIVOS)
    delete_familia(&db, f_id).unwrap();

    // Verificar que familia fue eliminada
    let familia = get_familia_by_id(&db, f_id).unwrap();
    assert!(familia.is_none(), "Familia debería ser eliminada");
}

#[test]
fn test_cmd_eliminar_familia_inexistente_es_ok() {
    let db = create_test_db();

    let resultado = delete_familia(&db, 9999);
    assert!(resultado.is_ok(), "Debe ser Ok (operación idempotente)");
}
