use crate::db::{Cuota, DbConnection, EstadisticasCuotas};
use rusqlite::{params, Result, Row};

impl Cuota {
    fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(Cuota {
            id: Some(row.get(0)?),
            hermano_id: row.get(1)?,
            anio: row.get(2)?,
            importe: row.get(3)?,
            pagado: row.get(4)?,
            fecha_pago: row.get(5)?,
            metodo_pago: row.get(6)?,
            observaciones: row.get(7)?,
            recibo: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    }
}

pub fn get_all_cuotas(db: &DbConnection) -> Result<Vec<Cuota>, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;
    let mut stmt = conn.prepare(
        "SELECT id, hermano_id, anio, importe, pagado,
                fecha_pago, metodo_pago, observaciones, recibo, created_at, updated_at
         FROM cuotas
         ORDER BY anio DESC, hermano_id",
    )?;

    let cuotas = stmt
        .query_map([], Cuota::from_row)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(cuotas)
}

pub fn get_cuotas_by_hermano(
    db: &DbConnection,
    hermano_id: i32,
) -> Result<Vec<Cuota>, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;
    let mut stmt = conn.prepare(
        "SELECT id, hermano_id, anio, importe, pagado,
                fecha_pago, metodo_pago, observaciones, recibo, created_at, updated_at
         FROM cuotas
         WHERE hermano_id = ?1
         ORDER BY anio DESC",
    )?;

    let cuotas = stmt
        .query_map([hermano_id], Cuota::from_row)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(cuotas)
}

pub fn get_cuotas_by_year(db: &DbConnection, anio: i32) -> Result<Vec<Cuota>, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;
    let mut stmt = conn.prepare(
        "SELECT id, hermano_id, anio, importe, pagado,
                fecha_pago, metodo_pago, observaciones, recibo, created_at, updated_at
         FROM cuotas
         WHERE anio = ?1
         ORDER BY hermano_id",
    )?;

    let cuotas = stmt
        .query_map([anio], Cuota::from_row)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(cuotas)
}

pub fn get_cuotas_pendientes(db: &DbConnection) -> Result<Vec<Cuota>, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;
    let mut stmt = conn.prepare(
        "SELECT id, hermano_id, anio, importe, pagado,
                fecha_pago, metodo_pago, observaciones, recibo, created_at, updated_at
         FROM cuotas
         WHERE pagado = 0
         ORDER BY anio ASC, hermano_id",
    )?;

    let cuotas = stmt
        .query_map([], Cuota::from_row)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(cuotas)
}

pub fn create_cuota(db: &DbConnection, cuota: &Cuota) -> Result<i32, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;

    conn.execute(
        "INSERT INTO cuotas
         (hermano_id, anio, importe, pagado, fecha_pago, metodo_pago, observaciones, recibo)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            cuota.hermano_id,
            cuota.anio,
            cuota.importe,
            cuota.pagado,
            cuota.fecha_pago,
            cuota.metodo_pago,
            cuota.observaciones,
            cuota.recibo,
        ],
    )?;

    Ok(conn.last_insert_rowid() as i32)
}

pub fn update_cuota(db: &DbConnection, id: i32, cuota: &Cuota) -> Result<(), anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;

    conn.execute(
        "UPDATE cuotas
         SET hermano_id = ?1, anio = ?2, importe = ?3,
             pagado = ?4, fecha_pago = ?5, metodo_pago = ?6,
             observaciones = ?7, recibo = ?8, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?9",
        params![
            cuota.hermano_id,
            cuota.anio,
            cuota.importe,
            cuota.pagado,
            cuota.fecha_pago,
            cuota.metodo_pago,
            cuota.observaciones,
            cuota.recibo,
            id,
        ],
    )?;

    Ok(())
}

pub fn marcar_cuota_pagada(
    db: &DbConnection,
    id: i32,
    fecha_pago: &str,
    metodo_pago: &str,
) -> Result<(), anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;

    conn.execute(
        "UPDATE cuotas
         SET pagado = 1, fecha_pago = ?1, metodo_pago = ?2, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?3",
        params![fecha_pago, metodo_pago, id],
    )?;

    Ok(())
}

pub fn delete_cuota(db: &DbConnection, id: i32) -> Result<(), anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;

    conn.execute("DELETE FROM cuotas WHERE id = ?1", [id])?;

    Ok(())
}

pub fn generar_cuotas_anio(
    db: &DbConnection,
    anio: i32,
    importe: f64,
) -> Result<i32, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;

    let mut stmt = conn.prepare("SELECT id FROM hermanos WHERE activo = 1")?;
    let hermano_ids: Result<Vec<i32>, _> =
        stmt.query_map([], |row| row.get::<_, i32>(0))?.collect();

    let hermano_ids = hermano_ids?;
    let mut creadas = 0;

    for hermano_id in hermano_ids {
        let mut check_stmt =
            conn.prepare("SELECT COUNT(*) FROM cuotas WHERE hermano_id = ?1 AND anio = ?2")?;

        let existe: i32 = check_stmt.query_row(params![hermano_id, anio], |row| row.get(0))?;

        if existe == 0 {
            conn.execute(
                "INSERT INTO cuotas (hermano_id, anio, importe, pagado)
                 VALUES (?1, ?2, ?3, 0)",
                params![hermano_id, anio, importe],
            )?;
            creadas += 1;
        }
    }

    Ok(creadas)
}

pub fn get_estadisticas_cuotas(
    db: &DbConnection,
    anio: Option<i32>,
) -> Result<EstadisticasCuotas, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;

    let where_clause = if let Some(year) = anio {
        format!("WHERE anio = {}", year)
    } else {
        String::new()
    };

    let query = format!(
        "SELECT
            SUM(CASE WHEN pagado = 1 THEN importe ELSE 0 END) as total_recaudado,
            COUNT(CASE WHEN pagado = 0 THEN 1 END) as cuotas_pendientes,
            COUNT(CASE WHEN pagado = 1 THEN 1 END) as cuotas_pagadas
         FROM cuotas
         {}",
        where_clause
    );

    let mut stmt = conn.prepare(&query)?;
    let (total_recaudado, cuotas_pendientes, cuotas_pagadas) = stmt.query_row([], |row| {
        Ok((
            row.get::<_, f64>(0)?,
            row.get::<_, i32>(1)?,
            row.get::<_, i32>(2)?,
        ))
    })?;

    let hermanos_query = if let Some(year) = anio {
        format!(
            "SELECT
                COUNT(DISTINCT CASE WHEN moroso = 0 THEN hermano_id END) as al_dia,
                COUNT(DISTINCT CASE WHEN moroso = 1 THEN hermano_id END) as morosos
             FROM (
                 SELECT
                     hermano_id,
                     CASE WHEN COUNT(CASE WHEN pagado = 0 THEN 1 END) > 0 THEN 1 ELSE 0 END as moroso
                 FROM cuotas
                 WHERE anio = {}
                 GROUP BY hermano_id
             )",
            year
        )
    } else {
        "SELECT
            COUNT(DISTINCT CASE WHEN moroso = 0 THEN hermano_id END) as al_dia,
            COUNT(DISTINCT CASE WHEN moroso = 1 THEN hermano_id END) as morosos
         FROM (
             SELECT
                 hermano_id,
                 CASE WHEN COUNT(CASE WHEN pagado = 0 THEN 1 END) > 0 THEN 1 ELSE 0 END as moroso
             FROM cuotas
             GROUP BY hermano_id
         )"
        .to_string()
    };

    let mut hermanos_stmt = conn.prepare(&hermanos_query)?;
    let (hermanos_al_dia, hermanos_morosos) =
        hermanos_stmt.query_row([], |row| Ok((row.get::<_, i32>(0)?, row.get::<_, i32>(1)?)))?;

    Ok(EstadisticasCuotas {
        total_recaudado,
        cuotas_pendientes,
        cuotas_pagadas,
        hermanos_al_dia,
        hermanos_morosos,
    })
}

pub fn pagar_cuotas_familia(
    db: &DbConnection,
    familia_id: i32,
    anio: i32,
    fecha_pago: &str,
    metodo_pago: &str,
) -> Result<i32, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;

    // Primero obtenemos el nombre de la familia
    let familia_nombre: String = conn.query_row(
        "SELECT nombre_familia FROM familias WHERE id = ?1",
        [familia_id],
        |row| row.get(0),
    )?;

    let observacion = format!("Pagado con la familia {}", familia_nombre);

    let cuotas_actualizadas = conn.execute(
        "UPDATE cuotas
         SET pagado = 1, fecha_pago = ?1, metodo_pago = ?2, observaciones = ?3, updated_at = CURRENT_TIMESTAMP
         WHERE hermano_id IN (SELECT id FROM hermanos WHERE familia_id = ?4 AND activo = 1)
         AND anio = ?5 AND pagado = 0",
        params![fecha_pago, metodo_pago, observacion, familia_id, anio],
    )?;

    Ok(cuotas_actualizadas as i32)
}
