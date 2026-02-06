use crate::db::{DbConnection, Hermano};
use rusqlite::{params, Result, Row};

impl Hermano {
    pub fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(Hermano {
            id: Some(row.get(0)?),
            numero_hermano: row.get(1)?,
            nombre: row.get(2)?,
            primer_apellido: row.get(3)?,
            segundo_apellido: row.get(4)?,
            dni: row.get(5)?,
            fecha_nacimiento: row.get(6)?,
            localidad_nacimiento: row.get(7)?,
            provincia_nacimiento: row.get(8)?,
            fecha_alta: row.get(9)?,
            familia_id: row.get(10)?,
            telefono: row.get(11)?,
            email: row.get(12)?,
            direccion: row.get(13)?,
            localidad: row.get(14)?,
            provincia: row.get(15)?,
            codigo_postal: row.get(16)?,
            parroquia_bautismo: row.get(17)?,
            localidad_bautismo: row.get(18)?,
            provincia_bautismo: row.get(19)?,
            autorizacion_menores: row.get(20)?,
            nombre_representante_legal: row.get(21)?,
            dni_representante_legal: row.get(22)?,
            hermano_aval_1: row.get(23)?,
            hermano_aval_2: row.get(24)?,
            activo: row.get(25)?,
            fecha_baja: row.get(26)?,
            observaciones: row.get(27)?,
            created_at: row.get(28)?,
            updated_at: row.get(29)?,
        })
    }
}

pub fn get_all_hermanos(db: &DbConnection) -> Result<Vec<Hermano>, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;
    let mut stmt = conn.prepare(
        "SELECT id, numero_hermano, nombre, primer_apellido, segundo_apellido, dni, 
                fecha_nacimiento, localidad_nacimiento, provincia_nacimiento, fecha_alta, 
                familia_id, telefono, email, direccion, localidad, provincia, codigo_postal,
                parroquia_bautismo, localidad_bautismo, provincia_bautismo,
                autorizacion_menores, nombre_representante_legal, dni_representante_legal,
                hermano_aval_1, hermano_aval_2, activo, fecha_baja, observaciones, created_at, updated_at
         FROM hermanos
         ORDER BY numero_hermano"
    )?;

    let hermanos = stmt
        .query_map([], Hermano::from_row)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(hermanos)
}

pub fn get_hermanos_activos(db: &DbConnection) -> Result<Vec<Hermano>, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;
    let mut stmt = conn.prepare(
        "SELECT id, numero_hermano, nombre, primer_apellido, segundo_apellido, dni, 
                fecha_nacimiento, localidad_nacimiento, provincia_nacimiento, fecha_alta, 
                familia_id, telefono, email, direccion, localidad, provincia, codigo_postal,
                parroquia_bautismo, localidad_bautismo, provincia_bautismo,
                autorizacion_menores, nombre_representante_legal, dni_representante_legal,
                hermano_aval_1, hermano_aval_2, activo, fecha_baja, observaciones, created_at, updated_at
         FROM hermanos
         WHERE activo = 1
         ORDER BY numero_hermano"
    )?;

    let hermanos = stmt
        .query_map([], Hermano::from_row)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(hermanos)
}

pub fn get_hermano_by_id(db: &DbConnection, id: i32) -> Result<Option<Hermano>, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;
    let mut stmt = conn.prepare(
        "SELECT id, numero_hermano, nombre, primer_apellido, segundo_apellido, dni, 
                fecha_nacimiento, localidad_nacimiento, provincia_nacimiento, fecha_alta, 
                familia_id, telefono, email, direccion, localidad, provincia, codigo_postal,
                parroquia_bautismo, localidad_bautismo, provincia_bautismo,
                autorizacion_menores, nombre_representante_legal, dni_representante_legal,
                hermano_aval_1, hermano_aval_2, activo, fecha_baja, observaciones, created_at, updated_at
         FROM hermanos
         WHERE id = ?1"
    )?;

    match stmt.query_row([id], Hermano::from_row) {
        Ok(hermano) => Ok(Some(hermano)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

pub fn search_hermanos(db: &DbConnection, query: &str) -> Result<Vec<Hermano>, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;
    let search_pattern = format!("%{}%", query);

    let mut stmt = conn.prepare(
        "SELECT id, numero_hermano, nombre, primer_apellido, segundo_apellido, dni, 
                fecha_nacimiento, localidad_nacimiento, provincia_nacimiento, fecha_alta, 
                familia_id, telefono, email, direccion, localidad, provincia, codigo_postal,
                parroquia_bautismo, localidad_bautismo, provincia_bautismo,
                autorizacion_menores, nombre_representante_legal, dni_representante_legal,
                hermano_aval_1, hermano_aval_2, activo, fecha_baja, observaciones, created_at, updated_at
         FROM hermanos
         WHERE (nombre LIKE ?1 OR primer_apellido LIKE ?1 OR segundo_apellido LIKE ?1 OR numero_hermano LIKE ?1 OR dni LIKE ?1)
         ORDER BY numero_hermano"
    )?;

    let hermanos = stmt
        .query_map([&search_pattern], Hermano::from_row)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(hermanos)
}

pub fn get_hermanos_by_familia(
    db: &DbConnection,
    familia_id: i32,
) -> Result<Vec<Hermano>, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;
    let mut stmt = conn.prepare(
        "SELECT id, numero_hermano, nombre, primer_apellido, segundo_apellido, dni, 
                fecha_nacimiento, localidad_nacimiento, provincia_nacimiento, fecha_alta, 
                familia_id, telefono, email, direccion, localidad, provincia, codigo_postal,
                parroquia_bautismo, localidad_bautismo, provincia_bautismo,
                autorizacion_menores, nombre_representante_legal, dni_representante_legal,
                hermano_aval_1, hermano_aval_2, activo, fecha_baja, observaciones, created_at, updated_at
         FROM hermanos
         WHERE familia_id = ?1
         ORDER BY numero_hermano"
    )?;

    let hermanos = stmt
        .query_map([familia_id], Hermano::from_row)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(hermanos)
}

pub fn create_hermano(db: &DbConnection, hermano: &Hermano) -> Result<i32, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;

    // Generar número de hermano único si está vacío (5 dígitos numéricos)
    let numero_hermano = if hermano.numero_hermano.trim().is_empty() {
        let count: i32 =
            conn.query_row("SELECT COUNT(*) FROM hermanos", [], |row| row.get(0))?;
        format!("{:05}", count + 1)
    } else {
        // Validar que sea numérico de 5 dígitos
        let cleaned = hermano.numero_hermano.trim();
        if cleaned.len() == 5 && cleaned.chars().all(|c| c.is_ascii_digit()) {
            cleaned.to_string()
        } else {
            return Err(anyhow::anyhow!(
                "El número de hermano debe tener exactamente 5 dígitos numéricos"
            ));
        }
    };

    let segundo_apellido = hermano
        .segundo_apellido
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let dni = hermano.dni.as_ref().filter(|s| !s.trim().is_empty());
    let telefono = hermano.telefono.as_ref().filter(|s| !s.trim().is_empty());
    let email = hermano.email.as_ref().filter(|s| !s.trim().is_empty());
    let direccion = hermano.direccion.as_ref().filter(|s| !s.trim().is_empty());
    let fecha_nacimiento = hermano
        .fecha_nacimiento
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let localidad_nacimiento = hermano
        .localidad_nacimiento
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let provincia_nacimiento = hermano
        .provincia_nacimiento
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let localidad = hermano.localidad.as_ref().filter(|s| !s.trim().is_empty());
    let provincia = hermano.provincia.as_ref().filter(|s| !s.trim().is_empty());
    let codigo_postal = hermano
        .codigo_postal
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let parroquia_bautismo = hermano
        .parroquia_bautismo
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let localidad_bautismo = hermano
        .localidad_bautismo
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let provincia_bautismo = hermano
        .provincia_bautismo
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let nombre_representante_legal = hermano
        .nombre_representante_legal
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let dni_representante_legal = hermano
        .dni_representante_legal
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let observaciones = hermano
        .observaciones
        .as_ref()
        .filter(|s| !s.trim().is_empty());

    let _id = conn.execute(
        "INSERT INTO hermanos
         (numero_hermano, nombre, primer_apellido, segundo_apellido, dni, fecha_nacimiento,
          localidad_nacimiento, provincia_nacimiento, fecha_alta, familia_id, telefono, email,
          direccion, localidad, provincia, codigo_postal, parroquia_bautismo, localidad_bautismo,
          provincia_bautismo, autorizacion_menores, nombre_representante_legal, dni_representante_legal,
          hermano_aval_1, hermano_aval_2, activo, fecha_baja, observaciones)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27)",
        params![
            numero_hermano,
            hermano.nombre,
            hermano.primer_apellido,
            segundo_apellido,
            dni,
            fecha_nacimiento,
            localidad_nacimiento,
            provincia_nacimiento,
            hermano.fecha_alta,
            hermano.familia_id,
            telefono,
            email,
            direccion,
            localidad,
            provincia,
            codigo_postal,
            parroquia_bautismo,
            localidad_bautismo,
            provincia_bautismo,
            hermano.autorizacion_menores,
            nombre_representante_legal,
            dni_representante_legal,
            hermano.hermano_aval_1,
            hermano.hermano_aval_2,
            hermano.activo,
            hermano.fecha_baja,
            observaciones,
        ],
    )?;

    Ok(conn.last_insert_rowid() as i32)
}

pub fn update_hermano(db: &DbConnection, id: i32, hermano: &Hermano) -> Result<(), anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;

    let segundo_apellido = hermano
        .segundo_apellido
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let dni = hermano.dni.as_ref().filter(|s| !s.trim().is_empty());
    let telefono = hermano.telefono.as_ref().filter(|s| !s.trim().is_empty());
    let email = hermano.email.as_ref().filter(|s| !s.trim().is_empty());
    let direccion = hermano.direccion.as_ref().filter(|s| !s.trim().is_empty());
    let fecha_nacimiento = hermano
        .fecha_nacimiento
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let localidad_nacimiento = hermano
        .localidad_nacimiento
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let provincia_nacimiento = hermano
        .provincia_nacimiento
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let localidad = hermano.localidad.as_ref().filter(|s| !s.trim().is_empty());
    let provincia = hermano.provincia.as_ref().filter(|s| !s.trim().is_empty());
    let codigo_postal = hermano
        .codigo_postal
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let parroquia_bautismo = hermano
        .parroquia_bautismo
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let localidad_bautismo = hermano
        .localidad_bautismo
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let provincia_bautismo = hermano
        .provincia_bautismo
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let nombre_representante_legal = hermano
        .nombre_representante_legal
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let dni_representante_legal = hermano
        .dni_representante_legal
        .as_ref()
        .filter(|s| !s.trim().is_empty());
    let observaciones = hermano
        .observaciones
        .as_ref()
        .filter(|s| !s.trim().is_empty());

    conn.execute(
        "UPDATE hermanos
         SET numero_hermano = ?1, nombre = ?2, primer_apellido = ?3, segundo_apellido = ?4,
             dni = ?5, fecha_nacimiento = ?6, localidad_nacimiento = ?7, provincia_nacimiento = ?8,
             fecha_alta = ?9, familia_id = ?10, telefono = ?11, email = ?12, direccion = ?13,
             localidad = ?14, provincia = ?15, codigo_postal = ?16, parroquia_bautismo = ?17,
             localidad_bautismo = ?18, provincia_bautismo = ?19, autorizacion_menores = ?20,
             nombre_representante_legal = ?21, dni_representante_legal = ?22,
             hermano_aval_1 = ?23, hermano_aval_2 = ?24, activo = ?25, fecha_baja = ?26, observaciones = ?27,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?28",
        params![
            hermano.numero_hermano,
            hermano.nombre,
            hermano.primer_apellido,
            segundo_apellido,
            dni,
            fecha_nacimiento,
            localidad_nacimiento,
            provincia_nacimiento,
            hermano.fecha_alta,
            hermano.familia_id,
            telefono,
            email,
            direccion,
            localidad,
            provincia,
            codigo_postal,
            parroquia_bautismo,
            localidad_bautismo,
            provincia_bautismo,
            hermano.autorizacion_menores,
            nombre_representante_legal,
            dni_representante_legal,
            hermano.hermano_aval_1,
            hermano.hermano_aval_2,
            hermano.activo,
            hermano.fecha_baja,
            observaciones,
            id,
        ],
    )?;

    Ok(())
}

pub fn delete_hermano(db: &DbConnection, id: i32) -> Result<(), anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;

    conn.execute("DELETE FROM hermanos WHERE id = ?1", [id])?;

    Ok(())
}

pub fn set_hermano_inactive(db: &DbConnection, id: i32) -> Result<(), anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;

    conn.execute(
        "UPDATE hermanos SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
        [id],
    )?;

    Ok(())
}

pub fn update_hermano_familia(
    db: &DbConnection,
    hermano_id: i32,
    familia_id: Option<i32>,
) -> Result<(), anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;

    conn.execute(
        "UPDATE hermanos SET familia_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![familia_id, hermano_id],
    )?;

    Ok(())
}
