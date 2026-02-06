use crate::db::{DbConnection, Familia};
use rusqlite::{params, OptionalExtension, Result, Row};

impl Familia {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(Familia {
            id: Some(row.get(0)?),
            nombre_familia: row.get(1)?,
            hermano_direccion_id: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    }
}

pub fn get_all_familias(db: &DbConnection) -> Result<Vec<Familia>, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;
    let mut stmt = conn.prepare(
        "SELECT id, nombre_familia, hermano_direccion_id, created_at, updated_at
         FROM familias
         ORDER BY nombre_familia",
    )?;

    let familias = stmt
        .query_map([], Familia::from_row)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(familias)
}

pub fn get_familia_by_id(db: &DbConnection, id: i32) -> Result<Option<Familia>, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;
    let mut stmt = conn.prepare(
        "SELECT id, nombre_familia, hermano_direccion_id, created_at, updated_at
         FROM familias
         WHERE id = ?",
    )?;

    let mut familias = stmt
        .query_map([id], Familia::from_row)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(familias.pop())
}

pub fn search_familias(db: &DbConnection, query: &str) -> Result<Vec<Familia>, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;
    let search_pattern = format!("%{}%", query);

    let mut stmt = conn.prepare(
        "SELECT id, nombre_familia, hermano_direccion_id, created_at, updated_at
         FROM familias
         WHERE nombre_familia LIKE ?1
         ORDER BY nombre_familia",
    )?;

    let familias = stmt
        .query_map([&search_pattern], Familia::from_row)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(familias)
}

pub fn create_familia(db: &DbConnection, familia: &Familia) -> Result<i32, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;
    conn.execute(
        "INSERT INTO familias
         (nombre_familia, hermano_direccion_id)
         VALUES (?1, ?2)",
        params![familia.nombre_familia, familia.hermano_direccion_id,],
    )?;

    Ok(conn.last_insert_rowid() as i32)
}

pub fn update_familia(db: &DbConnection, id: i32, familia: &Familia) -> Result<(), anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;
    conn.execute(
        "UPDATE familias
         SET nombre_familia = ?1, hermano_direccion_id = ?2, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?3",
        params![familia.nombre_familia, familia.hermano_direccion_id, id,],
    )?;

    Ok(())
}

pub fn delete_familia(db: &DbConnection, id: i32) -> Result<(), anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;

    // Verificar si la familia tiene hermanos activos
    let mut stmt =
        conn.prepare("SELECT COUNT(*) FROM hermanos WHERE familia_id = ?1 AND activo = 1")?;
    let count: i32 = stmt.query_row([id], |row| row.get(0))?;

    if count > 0 {
        return Err(anyhow::anyhow!(
            "No se puede eliminar la familia porque tiene hermanos activos asociados"
        ));
    }

    conn.execute("DELETE FROM familias WHERE id = ?1", [id])?;
    Ok(())
}

pub fn get_familia_stats(db: &DbConnection, id: i32) -> Result<(i32, i32), anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;
    let mut stmt = conn.prepare(
        "SELECT
            COUNT(h.id) as total_hermanos,
            COUNT(CASE WHEN h.activo = 1 THEN 1 END) as hermanos_activos
         FROM familias f
         LEFT JOIN hermanos h ON f.id = h.familia_id
         WHERE f.id = ?1",
    )?;

    let result = stmt.query_row([id], |row| {
        Ok((row.get::<_, i32>(0)?, row.get::<_, i32>(1)?))
    })?;

    Ok(result)
}

pub fn get_familia_with_hermanos(
    db: &DbConnection,
    id: i32,
) -> Result<Option<Familia>, anyhow::Error> {
    get_familia_by_id(db, id)
}

pub fn get_familia_with_address(
    db: &DbConnection,
    id: i32,
) -> Result<Option<serde_json::Value>, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;
    let mut stmt = conn.prepare(
        "SELECT
            f.id,
            f.nombre_familia,
            f.hermano_direccion_id,
            h.direccion,
            h.telefono,
            h.email,
            h.nombre,
            h.apellidos
         FROM familias f
         LEFT JOIN hermanos h ON f.hermano_direccion_id = h.id
         WHERE f.id = ?1",
    )?;

    let result = stmt
        .query_row([id], |row| {
            let direccion_principal = if row.get::<_, Option<String>>(3)?.is_some() {
                Some(serde_json::json!({
                    "direccion": row.get::<_, Option<String>>(3)?,
                    "telefono": row.get::<_, Option<String>>(4)?,
                    "email": row.get::<_, Option<String>>(5)?,
                    "nombre_hermano": format!("{} {}",
                        row.get::<_, String>(6).unwrap_or_default(),
                        row.get::<_, String>(7).unwrap_or_default()
                    )
                }))
            } else {
                None
            };

            Ok(serde_json::json!({
                "id": row.get::<_, i32>(0)?,
                "nombre_familia": row.get::<_, String>(1)?,
                "hermano_direccion_id": row.get::<_, Option<i32>>(2)?,
                "direccion_principal": direccion_principal
            }))
        })
        .optional()?;

    Ok(result)
}
