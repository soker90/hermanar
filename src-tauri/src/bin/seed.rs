use anyhow::Result;
use rusqlite::{params, Connection};

fn main() -> Result<()> {
    println!("🌱 Poblando base de datos con datos ficticios...\n");

    // Obtener ruta de la base de datos
    let app_data_dir = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME").map(|home| format!("{}/.local/share", home)))
        .unwrap_or_else(|_| ".".to_string());

    let db_path = format!("{}/hermanar/hermanar.db", app_data_dir);

    println!("📁 Ruta de la base de datos: {}", db_path);

    // Verificar que existe la base de datos
    if !std::path::Path::new(&db_path).exists() {
        eprintln!("❌ Error: No se encontró la base de datos en {}", db_path);
        eprintln!(
            "   Por favor, inicia la aplicación al menos una vez para crear la base de datos."
        );
        std::process::exit(1);
    }

    let conn = Connection::open(&db_path)?;

    println!("🗑️  Limpiando datos existentes...");
    conn.execute("DELETE FROM cuotas", [])?;
    conn.execute("DELETE FROM hermanos", [])?;
    conn.execute("DELETE FROM familias", [])?;

    println!("👨‍👩‍👧‍👦 Creando familias...");
    let familias_data = vec![
        "García Rodríguez",
        "Martínez López",
        "Sánchez Fernández",
        "Pérez Gómez",
        "López Martín",
        "González Jiménez",
        "Rodríguez Ruiz",
        "Fernández Díaz",
        "Díaz Moreno",
        "Moreno Muñoz",
        "Jiménez Álvarez",
        "Ruiz Romero",
        "Hernández Alonso",
        "Álvarez Gutiérrez",
        "Romero Navarro",
    ];

    let mut familia_ids = Vec::new();
    for nombre in &familias_data {
        conn.execute(
            "INSERT INTO familias (nombre_familia) VALUES (?1)",
            params![nombre],
        )?;
        familia_ids.push(conn.last_insert_rowid() as i32);
    }
    println!("   ✅ {} familias creadas", familias_data.len());

    println!("👤 Creando hermanos...");
    let nombres = vec![
        "Juan",
        "María",
        "José",
        "Ana",
        "Carlos",
        "Laura",
        "Antonio",
        "Carmen",
        "Francisco",
        "Isabel",
        "Manuel",
        "Dolores",
        "David",
        "Pilar",
        "Javier",
        "Teresa",
        "Miguel",
        "Rosa",
        "Pedro",
        "Ángeles",
        "Jesús",
        "Concepción",
        "Fernando",
        "Mercedes",
        "Luis",
        "Josefa",
        "Ángel",
        "Francisca",
        "Rafael",
        "Antonia",
        "Enrique",
        "Cristina",
        "Pablo",
        "Lucía",
        "Sergio",
        "Elena",
    ];

    let apellidos1 = vec![
        "García",
        "Martínez",
        "López",
        "Sánchez",
        "González",
        "Rodríguez",
        "Fernández",
        "Pérez",
        "Gómez",
        "Martín",
        "Jiménez",
        "Ruiz",
        "Hernández",
        "Díaz",
        "Moreno",
        "Álvarez",
        "Romero",
        "Muñoz",
        "Navarro",
        "Gutiérrez",
    ];

    let apellidos2 = vec![
        "López",
        "García",
        "Martínez",
        "Rodríguez",
        "Fernández",
        "Sánchez",
        "Pérez",
        "González",
        "Romero",
        "Díaz",
        "Moreno",
        "Ruiz",
        "Álvarez",
        "Jiménez",
        "Gutiérrez",
        "Navarro",
        "Torres",
        "Domínguez",
        "Vázquez",
        "Ramos",
    ];

    let localidades = [
        "Alcázar de San Juan",
        "Madrid",
        "Toledo",
        "Ciudad Real",
        "Tomelloso",
        "Manzanares",
        "Valdepeñas",
        "Puertollano",
        "Daimiel",
        "La Solana",
    ];

    let provincias = ["Ciudad Real", "Madrid", "Toledo", "Albacete", "Cuenca"];

    let calles = [
        "Calle Mayor",
        "Calle Real",
        "Avenida de la Constitución",
        "Plaza del Ayuntamiento",
        "Calle de la Iglesia",
        "Paseo de la Estación",
        "Calle Nueva",
        "Calle del Carmen",
        "Avenida de España",
        "Calle del Molino",
        "Calle de la Paz",
        "Plaza de España",
    ];

    let metodos_pago = ["Efectivo", "Transferencia", "Tarjeta"];

    let mut hermano_ids = Vec::new();
    let mut contador = 1;

    for (idx, familia_id) in familia_ids.iter().enumerate() {
        let num_hermanos = 2 + (idx % 3);

        for i in 0..num_hermanos {
            let nombre = nombres[(contador - 1) % nombres.len()];
            let apellido1 = apellidos1[idx % apellidos1.len()];
            let apellido2 = Some(apellidos2[(idx + i) % apellidos2.len()].to_string());
            let numero_hermano = format!("{:04}", contador);

            let localidad = localidades[idx % localidades.len()];
            let provincia = provincias[idx % provincias.len()];
            let calle = calles[(contador - 1) % calles.len()];
            let numero = 1 + (contador % 100);
            let direccion = format!("{}, {}", calle, numero);
            let codigo_postal = format!("13{:03}", 600 + (idx % 100));

            let telefono = format!("6{:08}", 20000000 + (contador * 12345) % 80000000);
            let email = format!(
                "{}{}@email.com",
                nombre.to_lowercase().chars().next().unwrap(),
                apellido1.to_lowercase()
            );

            let anio_alta = 2015 + (contador % 10);
            let mes_alta = 1 + (contador % 12);
            let dia_alta = 1 + (contador % 28);
            let fecha_alta = format!("{:04}-{:02}-{:02}", anio_alta, mes_alta, dia_alta);

            let anio_nac = 1940 + (contador % 70);
            let fecha_nacimiento = format!("{:04}-{:02}-{:02}", anio_nac, mes_alta, dia_alta);

            conn.execute(
                "INSERT INTO hermanos 
                (numero_hermano, nombre, primer_apellido, segundo_apellido, dni,
                fecha_nacimiento, localidad_nacimiento, provincia_nacimiento,
                fecha_alta, familia_id, telefono, email, direccion, localidad,
                provincia, codigo_postal, activo)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
                params![
                    numero_hermano,
                    nombre,
                    apellido1,
                    apellido2,
                    format!("{:08}{}", 10000000 + contador * 123456 % 90000000, "ABCDEFGHIJKLMNOPQRSTUVWXYZ".chars().nth(contador % 26).unwrap()),
                    fecha_nacimiento,
                    localidad,
                    provincia,
                    fecha_alta,
                    familia_id,
                    telefono,
                    email,
                    direccion,
                    localidad,
                    provincia,
                    codigo_postal,
                    true,
                ],
            )?;

            hermano_ids.push(conn.last_insert_rowid() as i32);
            contador += 1;
        }
    }
    println!("   ✅ {} hermanos creados", hermano_ids.len());

    println!("🔄 Actualizando direcciones de familias...");
    let mut hermano_idx = 0;
    for (idx, familia_id) in familia_ids.iter().enumerate() {
        let num_hermanos = 2 + (idx % 3);
        let hermano_direccion_id = hermano_ids[hermano_idx];

        conn.execute(
            "UPDATE familias SET hermano_direccion_id = ?1 WHERE id = ?2",
            params![hermano_direccion_id, familia_id],
        )?;

        hermano_idx += num_hermanos;
    }

    println!("💰 Creando cuotas...");
    let anio_actual = 2026;
    let importes = [30.0, 35.0, 40.0, 45.0, 50.0];
    let mut total_cuotas = 0;

    for hermano_id in &hermano_ids {
        for anio in (anio_actual - 2)..=anio_actual {
            let importe = importes[(*hermano_id as usize) % importes.len()];

            let pagado = if anio < anio_actual {
                (*hermano_id % 10) < 7
            } else {
                (*hermano_id % 10) < 3
            };

            let (fecha_pago, metodo_pago, recibo) = if pagado {
                let mes_pago = 1 + ((*hermano_id as usize) % 12);
                let dia_pago = 1 + ((*hermano_id as usize) % 28);
                (
                    Some(format!("{:04}-{:02}-{:02}", anio, mes_pago, dia_pago)),
                    Some(metodos_pago[(*hermano_id as usize) % metodos_pago.len()].to_string()),
                    (*hermano_id % 5) != 0,
                )
            } else {
                (None, None, false)
            };

            conn.execute(
                "INSERT INTO cuotas 
                (hermano_id, anio, importe, pagado, fecha_pago, metodo_pago, recibo)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    hermano_id,
                    anio,
                    importe,
                    pagado,
                    fecha_pago,
                    metodo_pago,
                    recibo,
                ],
            )?;
            total_cuotas += 1;
        }
    }
    println!("   ✅ {} cuotas creadas", total_cuotas);

    println!("⚙️  Configurando recibos...");
    conn.execute(
        "INSERT OR REPLACE INTO configuracion_recibos 
        (id, nombre_hermandad, ubicacion, direccion)
        VALUES (1, ?1, ?2, ?3)",
        params![
            "HERMANDAD DE SAN ISIDRO LABRADOR",
            "ALCÁZAR DE SAN JUAN",
            "Altozano de la Inmaculada – 13600 Alcázar de San Juan (Ciudad Real)",
        ],
    )?;

    println!("\n✅ ¡Base de datos poblada correctamente!");
    println!("   📊 Resumen:");
    println!("      • {} familias", familias_data.len());
    println!("      • {} hermanos", hermano_ids.len());
    println!("      • {} cuotas", total_cuotas);
    println!("\n💡 Recarga la aplicación para ver los datos.");

    Ok(())
}
