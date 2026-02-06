use crate::tests::fixtures::*;
use crate::db::*;

// ============================================================================
// TESTS DE FAMILIAS
// ============================================================================

#[test]
fn test_create_familia() {
    let db = create_test_db();
    let result = insert_test_familia(&db, Some("García"));
    
    assert!(result.is_ok());
    assert!(result.unwrap() > 0);
}

#[test]
fn test_familia_unique_constraint() {
    let db = create_test_db();
    insert_test_familia(&db, Some("García")).unwrap();
    
    let result = insert_test_familia(&db, Some("García"));
    assert!(result.is_err());
}

#[test]
fn test_get_familia_count() {
    let db = create_test_db();
    insert_test_familia(&db, None).unwrap();
    insert_test_familia(&db, None).unwrap();
    insert_test_familia(&db, None).unwrap();
    
    let conn = db.lock().unwrap();
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM familias",
        [],
        |row| row.get(0),
    ).unwrap();

    assert_eq!(count, 3);
}

#[test]
fn test_familia_nombre_null() {
    let db = create_test_db();
    let conn = db.lock().unwrap();
    let now = chrono::Local::now().to_rfc3339();
    
    let result = conn.execute(
        "INSERT INTO familias (nombre_familia, created_at, updated_at)
         VALUES (?1, ?2, ?3)",
        rusqlite::params![None::<String>, now, now],
    );
    
    assert!(result.is_err()); // NOT NULL constraint
}

#[test]
fn test_search_familia_case_insensitive() {
    let db = create_test_db();
    insert_test_familia(&db, Some("García")).unwrap();
    insert_test_familia(&db, Some("López")).unwrap();
    
    let conn = db.lock().unwrap();
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM familias WHERE LOWER(nombre_familia) LIKE LOWER(?1)",
        rusqlite::params!["%garcía%"],
        |row| row.get(0),
    ).unwrap();
    
    assert_eq!(count, 1);
}

#[test]
fn test_delete_familia() {
    let db = create_test_db();
    let familia_id = insert_test_familia(&db, Some("García")).unwrap();
    
    let conn = db.lock().unwrap();
    conn.execute(
        "DELETE FROM familias WHERE id = ?1",
        rusqlite::params![familia_id],
    ).unwrap();
    drop(conn);
    
    let conn = db.lock().unwrap();
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM familias WHERE id = ?1",
        rusqlite::params![familia_id],
        |row| row.get(0),
    ).unwrap();
    
    assert_eq!(count, 0);
}

// ============================================================================
// TESTS DE COMANDOS - FAMILIAS
// ============================================================================

#[test]
fn test_cmd_restriccion_familia_unica() {
    let db = create_test_db();
    
    // Crear primera familia
    insert_test_familia(&db, Some("García")).unwrap();
    
    // Intentar crear otra con el mismo nombre (como lo haría el comando)
    let familia = Familia {
        id: None,
        nombre_familia: "García".to_string(),
        hermano_direccion_id: None,
        created_at: None,
        updated_at: None,
    };
    
    let result = create_familia(&db, &familia);
    assert!(result.is_err(), "Comando debería rechazar familia duplicada");
}

#[test]
fn test_cmd_busqueda_familias_funciona() {
    let db = create_test_db();
    
    // Setup
    let _familia1 = insert_test_familia(&db, Some("García")).unwrap();
    insert_test_familia(&db, None).unwrap();
    insert_test_familia(&db, None).unwrap();
    
    // Búsqueda exitosa
    let resultados = search_familias(&db, "García").unwrap();
    assert_eq!(resultados.len(), 1);
    
    // Búsqueda sin resultados
    let resultados = search_familias(&db, "Pérez").unwrap();
    assert_eq!(resultados.len(), 0);
}

#[test]
fn test_cmd_crear_familia() {
    let db = create_test_db();
    
    let familia = Familia {
        id: None,
        nombre_familia: "García López".to_string(),
        hermano_direccion_id: None,
        created_at: None,
        updated_at: None,
    };
    
    let id = create_familia(&db, &familia).unwrap();
    assert!(id > 0, "ID debe ser válido");
    
    // Verificar que existe
    let familia_leida = get_familia_by_id(&db, id).unwrap();
    assert!(familia_leida.is_some(), "Familia debe existir");
}

#[test]
fn test_cmd_eliminar_familia() {
    let db = create_test_db();
    
    let f_id = insert_test_familia(&db, Some("García")).unwrap();
    
    // Verificar que existe
    let familia = get_familia_by_id(&db, f_id).unwrap().unwrap();
    assert_eq!(familia.nombre_familia, "García");
    
    // Eliminar
    delete_familia(&db, f_id).unwrap();
    
    // Verificar que no existe
    let familia = get_familia_by_id(&db, f_id).unwrap();
    assert!(familia.is_none());
}
