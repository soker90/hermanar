use crate::db::*;
use crate::tests::fixtures::*;

// ============================================================================
// TESTS DE HERMANOS
// ============================================================================

#[test]
fn test_create_hermano_without_familia() {
    let db = create_test_db();
    let result = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None);

    assert!(result.is_ok());

    let conn = db.lock().unwrap();
    let count: i32 = conn
        .query_row("SELECT COUNT(*) FROM hermanos", [], |row| row.get(0))
        .unwrap();

    assert_eq!(count, 1);
}

#[test]
fn test_create_hermano_with_familia() {
    let db = create_test_db();
    let familia_id = insert_test_familia(&db, None).unwrap();
    let hermano_id = insert_fake_hermano(&db, "00001", Some(familia_id)).unwrap();

    assert!(hermano_id > 0);

    let conn = db.lock().unwrap();
    let stored_familia_id: i32 = conn
        .query_row(
            "SELECT familia_id FROM hermanos WHERE id = ?1",
            rusqlite::params![hermano_id],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(stored_familia_id, familia_id);
}

#[test]
fn test_hermano_numero_unique_constraint() {
    let db = create_test_db();
    insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();

    let result = insert_test_hermano(&db, "00001", Some("Pedro"), Some("López"), None);
    assert!(result.is_err());
}

#[test]
fn test_get_hermanos_activos() {
    let db = create_test_db();
    let _h1 = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();
    let h2 = insert_test_hermano(&db, "00002", Some("Pedro"), Some("López"), None).unwrap();

    // Marcar h2 como inactivo
    let conn = db.lock().unwrap();
    conn.execute(
        "UPDATE hermanos SET activo = 0 WHERE id = ?1",
        rusqlite::params![h2],
    )
    .unwrap();
    drop(conn);

    let conn = db.lock().unwrap();
    let count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM hermanos WHERE activo = 1",
            [],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(count, 1);
}

#[test]
fn test_search_hermano_by_nombre() {
    let db = create_test_db();
    insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();
    insert_fake_hermano(&db, "00002", None).unwrap();
    insert_fake_hermano(&db, "00003", None).unwrap();

    let conn = db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT COUNT(*) FROM hermanos WHERE nombre LIKE ?1")
        .unwrap();

    let count: i32 = stmt
        .query_row(rusqlite::params!["%Juan%"], |row| row.get(0))
        .unwrap();

    assert_eq!(count, 1);
}

#[test]
fn test_search_hermano_by_apellido() {
    let db = create_test_db();
    insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();
    insert_fake_hermano(&db, "00002", None).unwrap();
    insert_fake_hermano(&db, "00003", None).unwrap();

    let conn = db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT COUNT(*) FROM hermanos WHERE primer_apellido LIKE ?1")
        .unwrap();

    let count: i32 = stmt
        .query_row(rusqlite::params!["%García%"], |row| row.get(0))
        .unwrap();

    assert_eq!(count, 1);
}

#[test]
fn test_get_hermanos_by_familia() {
    let db = create_test_db();
    let familia_id = insert_test_familia(&db, None).unwrap();
    insert_fake_hermano(&db, "00001", Some(familia_id)).unwrap();
    insert_fake_hermano(&db, "00002", Some(familia_id)).unwrap();
    insert_fake_hermano(&db, "00003", None).unwrap();

    let conn = db.lock().unwrap();
    let count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM hermanos WHERE familia_id = ?1",
            rusqlite::params![familia_id],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(count, 2);
}

#[test]
fn test_update_hermano_nombre() {
    let db = create_test_db();
    let hermano_id = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();

    let conn = db.lock().unwrap();
    conn.execute(
        "UPDATE hermanos SET nombre = ?1 WHERE id = ?2",
        rusqlite::params!["Carlos", hermano_id],
    )
    .unwrap();
    drop(conn);

    let conn = db.lock().unwrap();
    let nombre: String = conn
        .query_row(
            "SELECT nombre FROM hermanos WHERE id = ?1",
            rusqlite::params![hermano_id],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(nombre, "Carlos");
}

#[test]
fn test_update_hermano_familia() {
    let db = create_test_db();
    let f1 = insert_test_familia(&db, Some("García")).unwrap();
    let f2 = insert_test_familia(&db, Some("López")).unwrap();
    let hermano_id =
        insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), Some(f1)).unwrap();

    let conn = db.lock().unwrap();
    conn.execute(
        "UPDATE hermanos SET familia_id = ?1 WHERE id = ?2",
        rusqlite::params![f2, hermano_id],
    )
    .unwrap();
    drop(conn);

    let conn = db.lock().unwrap();
    let familia_id: i32 = conn
        .query_row(
            "SELECT familia_id FROM hermanos WHERE id = ?1",
            rusqlite::params![hermano_id],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(familia_id, f2);
}

#[test]
fn test_update_hermano_inactive() {
    let db = create_test_db();
    let hermano_id = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();

    let conn = db.lock().unwrap();
    conn.execute(
        "UPDATE hermanos SET activo = 0, fecha_baja = ?1 WHERE id = ?2",
        rusqlite::params!["2026-02-06", hermano_id],
    )
    .unwrap();
    drop(conn);

    let conn = db.lock().unwrap();
    let activo: i32 = conn
        .query_row(
            "SELECT activo FROM hermanos WHERE id = ?1",
            rusqlite::params![hermano_id],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(activo, 0);
}

#[test]
fn test_delete_hermano() {
    let db = create_test_db();
    let hermano_id = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();

    let conn = db.lock().unwrap();
    conn.execute(
        "DELETE FROM hermanos WHERE id = ?1",
        rusqlite::params![hermano_id],
    )
    .unwrap();
    drop(conn);

    let conn = db.lock().unwrap();
    let count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM hermanos WHERE id = ?1",
            rusqlite::params![hermano_id],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(count, 0);
}

#[test]
fn test_hermano_dni_unique() {
    let db = create_test_db();
    let conn = db.lock().unwrap();
    let now = chrono::Local::now().to_rfc3339();

    // Agregar restricción UNIQUE a DNI si no la tiene
    let hermano1_result = conn.execute(
        "INSERT INTO hermanos (numero_hermano, nombre, primer_apellido, dni, activo, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6)",
        rusqlite::params!["00001", "Juan", "García", "12345678A", now, now],
    );

    assert!(hermano1_result.is_ok());
    drop(conn);

    // Intentar crear otro con el mismo DNI
    let conn = db.lock().unwrap();
    let hermano2_result = conn.execute(
        "INSERT INTO hermanos (numero_hermano, nombre, primer_apellido, dni, activo, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6)",
        rusqlite::params!["00002", "Pedro", "López", "12345678A", now, now],
    );

    assert!(hermano2_result.is_err());
}

#[test]
fn test_hermano_nombre_vacio() {
    let db = create_test_db();
    let conn = db.lock().unwrap();
    let now = chrono::Local::now().to_rfc3339();

    let result = conn.execute(
        "INSERT INTO hermanos (numero_hermano, nombre, primer_apellido, activo, created_at, updated_at)
         VALUES (?1, ?2, ?3, 1, ?4, ?5)",
        rusqlite::params!["00001", "", "García", now, now],
    );

    // SQLite permite, validación debe estar en Rust
    assert!(result.is_ok());
}

#[test]
fn test_search_hermano_combined() {
    let db = create_test_db();
    insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();
    insert_fake_hermano(&db, "00002", None).unwrap();
    insert_fake_hermano(&db, "00003", None).unwrap();
    insert_fake_hermano(&db, "00004", None).unwrap();

    let conn = db.lock().unwrap();
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM hermanos WHERE (nombre LIKE ?1 OR primer_apellido LIKE ?1) AND activo = 1",
        rusqlite::params!["%García%"],
        |row| row.get(0),
    ).unwrap();

    assert_eq!(count, 1);
}

#[test]
fn test_hermanos_por_familia_count() {
    let db = create_test_db();
    let f1 = insert_test_familia(&db, None).unwrap();
    let f2 = insert_test_familia(&db, None).unwrap();

    insert_fake_hermano(&db, "00001", Some(f1)).unwrap();
    insert_fake_hermano(&db, "00002", Some(f1)).unwrap();
    insert_fake_hermano(&db, "00003", Some(f1)).unwrap();
    insert_fake_hermano(&db, "00004", Some(f2)).unwrap();

    let conn = db.lock().unwrap();
    let f1_count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM hermanos WHERE familia_id = ?1",
            rusqlite::params![f1],
            |row| row.get(0),
        )
        .unwrap();

    let f2_count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM hermanos WHERE familia_id = ?1",
            rusqlite::params![f2],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(f1_count, 3);
    assert_eq!(f2_count, 1);
}

#[test]
fn test_busca_hermano_por_numero_exacto() {
    let db = create_test_db();

    insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();
    insert_test_hermano(&db, "00002", Some("Pedro"), Some("López"), None).unwrap();
    insert_test_hermano(&db, "00010", Some("Carlos"), Some("García"), None).unwrap();
    insert_test_hermano(&db, "00100", Some("Miguel"), Some("García"), None).unwrap();

    let conn = db.lock().unwrap();
    let count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM hermanos WHERE numero_hermano = ?1",
            rusqlite::params!["00010"],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(count, 1);
}

#[test]
fn test_hermano_inactivo_no_aparece_en_activos() {
    let db = create_test_db();

    let _h1 = insert_fake_hermano(&db, "00001", None).unwrap();
    let h2 = insert_fake_hermano(&db, "00002", None).unwrap();
    let _h3 = insert_fake_hermano(&db, "00003", None).unwrap();

    // Inactivar h2
    let conn = db.lock().unwrap();
    conn.execute(
        "UPDATE hermanos SET activo = 0, fecha_baja = ?1 WHERE id = ?2",
        rusqlite::params!["2026-02-06", h2],
    )
    .unwrap();
    drop(conn);

    let conn = db.lock().unwrap();
    let activos: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM hermanos WHERE activo = 1",
            [],
            |row| row.get(0),
        )
        .unwrap();

    let inactivos: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM hermanos WHERE activo = 0",
            [],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(activos, 2);
    assert_eq!(inactivos, 1);
}

// ============================================================================
// TESTS DE COMANDOS - HERMANOS
// ============================================================================

#[test]
fn test_cmd_restriccion_hermano_numero_unico() {
    let db = create_test_db();

    // Crear primer hermano
    insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();

    // Intentar crear otro con el mismo número
    let hermano = Hermano {
        id: None,
        numero_hermano: "00001".to_string(),
        nombre: "Pedro".to_string(),
        primer_apellido: "López".to_string(),
        segundo_apellido: None,
        dni: None,
        fecha_nacimiento: None,
        localidad_nacimiento: None,
        provincia_nacimiento: None,
        fecha_alta: "2026-02-06".to_string(),
        familia_id: None,
        telefono: None,
        email: None,
        direccion: None,
        localidad: None,
        provincia: None,
        codigo_postal: None,
        parroquia_bautismo: None,
        localidad_bautismo: None,
        provincia_bautismo: None,
        autorizacion_menores: false,
        nombre_representante_legal: None,
        dni_representante_legal: None,
        hermano_aval_1: None,
        hermano_aval_2: None,
        activo: true,
        fecha_baja: None,
        observaciones: None,
        created_at: None,
        updated_at: None,
    };

    let result = create_hermano(&db, &hermano);
    assert!(
        result.is_err(),
        "Comando debería rechazar número de hermano duplicado"
    );
}

#[test]
fn test_cmd_crear_hermano() {
    let db = create_test_db();

    let h_id = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();
    assert!(h_id > 0, "ID debería ser válido");
}

#[test]
fn test_cmd_eliminar_hermano() {
    let db = create_test_db();

    // Setup
    let h_id = insert_test_hermano(&db, "00001", Some("Juan"), Some("García"), None).unwrap();

    // Eliminar
    delete_hermano(&db, h_id).unwrap();

    // Verificar usando query directo que no existe
    let conn = db.lock().unwrap();
    let result: Result<i32, _> = conn.query_row(
        "SELECT COUNT(*) FROM hermanos WHERE id = ?1",
        [h_id],
        |row| row.get(0),
    );
    assert_eq!(result.unwrap(), 0, "Hermano debería estar eliminado");
}

#[test]
fn test_cmd_busqueda_hermanos_vacia() {
    let db = create_test_db();

    // Buscar en BD vacía
    let resultados = get_all_hermanos(&db).unwrap();
    assert_eq!(resultados.len(), 0);
}

#[test]
fn test_cmd_eliminar_hermano_inexistente_es_ok() {
    let db = create_test_db();

    // Intentar eliminar hermano que no existe (idempotente)
    let resultado = delete_hermano(&db, 9999);
    assert!(resultado.is_ok(), "Debe ser Ok (operación idempotente)");
}
