use crate::db::{DbConnection, Cuota};
use printpdf::*;
use std::fs::File;
use std::io::BufWriter;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfiguracionRecibo {
    pub logo_path: Option<String>,
    pub nombre_hermandad: String,
    pub ubicacion: String,
    pub direccion: String,
}

#[tauri::command]
pub fn generar_recibos_pdf_cmd(
    db: tauri::State<DbConnection>,
    cuotas_ids: Vec<i32>,
) -> Result<String, String> {
    generar_recibos_pdf(&db, cuotas_ids).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn marcar_recibos_generados_cmd(
    db: tauri::State<DbConnection>,
    cuotas_ids: Vec<i32>,
) -> Result<(), String> {
    marcar_recibos_generados(&db, cuotas_ids).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_configuracion_recibo_cmd(
    db: tauri::State<DbConnection>,
) -> Result<Option<ConfiguracionRecibo>, String> {
    get_configuracion_recibo(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn guardar_configuracion_recibo_cmd(
    db: tauri::State<DbConnection>,
    config: ConfiguracionRecibo,
) -> Result<(), String> {
    guardar_configuracion_recibo(&db, config).map_err(|e| e.to_string())
}

fn generar_recibos_pdf(
    db: &DbConnection,
    cuotas_ids: Vec<i32>,
) -> Result<String, anyhow::Error> {
    // Obtener las cuotas, configuración y datos de hermanos
    let (cuotas_con_hermanos, config) = {
        let conn = db
            .lock()
            .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;

        // Obtener las cuotas
        let mut cuotas = Vec::new();
        for id in &cuotas_ids {
            let cuota: Cuota = conn.query_row(
                "SELECT id, hermano_id, anio, importe, pagado, fecha_pago, metodo_pago, observaciones, recibo, created_at, updated_at
                 FROM cuotas WHERE id = ?1",
                [id],
                |row| {
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
                },
            )?;
            cuotas.push(cuota);
        }

        // Obtener información de hermanos para cada cuota
        let mut cuotas_con_hermanos = Vec::new();
        for cuota in cuotas {
            let hermano = conn.query_row(
                "SELECT nombre, primer_apellido, segundo_apellido, numero_hermano, direccion, localidad, provincia, codigo_postal, fecha_alta
                 FROM hermanos WHERE id = ?1",
                [cuota.hermano_id],
                |row| Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, Option<String>>(5)?,
                    row.get::<_, Option<String>>(6)?,
                    row.get::<_, Option<String>>(7)?,
                    row.get::<_, String>(8)?,
                )),
            )?;
            cuotas_con_hermanos.push((cuota, hermano));
        }

        // Obtener configuración de recibos
        let config = conn.query_row(
            "SELECT logo_path, nombre_hermandad, ubicacion, direccion FROM configuracion_recibos WHERE id = 1",
            [],
            |row| {
                Ok(ConfiguracionRecibo {
                    logo_path: row.get(0)?,
                    nombre_hermandad: row.get(1)?,
                    ubicacion: row.get(2)?,
                    direccion: row.get(3)?,
                })
            },
        ).unwrap_or_else(|_| ConfiguracionRecibo {
            logo_path: None,
            nombre_hermandad: "NOMBRE DE LA HERMANDAD".to_string(),
            ubicacion: "LOCALIDAD".to_string(),
            direccion: "Dirección completa".to_string(),
        });

        (cuotas_con_hermanos, config)
    }; // Liberamos el lock aquí

    // Crear el PDF
    let (doc, page1, layer1) =
        PdfDocument::new("Recibos", Mm(210.0), Mm(297.0), "Capa 1");
    let font = doc.add_builtin_font(BuiltinFont::Helvetica).unwrap();
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold).unwrap();

    let mut current_layer = doc.get_page(page1).get_layer(layer1);

    // Posición inicial - empezamos desde arriba
    let mut y_position = 270.0;
    let page_height = 297.0;
    let margin_bottom = 20.0;
    let recibo_height = 83.0; // Altura real del recibo para 3 por página

    for (cuota, hermano) in cuotas_con_hermanos.iter() {
        // Verificar si necesitamos una nueva página
        if y_position < margin_bottom + recibo_height {
            let (page_num, layer_num) = doc.add_page(Mm(210.0), Mm(297.0), "Capa 1");
            current_layer = doc.get_page(page_num).get_layer(layer_num);
            y_position = page_height - 27.0;
        }

        let nombre_completo = format!(
            "{} {} {}",
            hermano.0,
            hermano.1,
            hermano.2.as_deref().unwrap_or("")
        );

        // Insertar logo si está configurado
        if let Some(logo_path) = &config.logo_path {
            if std::path::Path::new(logo_path).exists() {
                match ::image::open(logo_path) {
                    Ok(img) => {
                        // Convertir a RGB
                        let img_rgb = img.to_rgb8();
                        let (width, height) = img_rgb.dimensions();
                        
                        // Dimensiones del logo - altura fija de 139 píxeles, ancho proporcional
                        let target_height_px: f32 = 139.0;
                        let aspect_ratio = width as f32 / height as f32;
                        let target_width_px = target_height_px * aspect_ratio;
                        
                        // Convertir píxeles a mm (asumiendo 72 DPI estándar: 1 inch = 72px = 25.4mm)
                        let px_to_mm = 25.4 / 72.0;
                        let logo_width_mm = target_width_px * px_to_mm;
                        let logo_height_mm = target_height_px * px_to_mm;
                        
                        // Posición del logo (mucho más arriba)
                        let logo_x = 15.0;
                        let logo_y = y_position + 36.5;
                        
                        // Crear ImageXObject desde el buffer de imagen
                        let image_bytes = img_rgb.into_raw();
                        let image_xobject = ImageXObject {
                            width: Px(width as usize),
                            height: Px(height as usize),
                            color_space: ColorSpace::Rgb,
                            bits_per_component: ColorBits::Bit8,
                            interpolate: true,
                            image_data: image_bytes,
                            image_filter: None,
                            clipping_bbox: None,
                            smask: None,
                        };
                        
                        // Crear imagen para printpdf
                        let image_data = Image::from(image_xobject);
                        
                        // Añadir imagen al documento
                        image_data.add_to_layer(
                            current_layer.clone(),
                            ImageTransform {
                                translate_x: Some(Mm(logo_x)),
                                translate_y: Some(Mm(logo_y - logo_height_mm)),
                                rotate: None,
                                scale_x: Some(logo_width_mm / (width as f32 * 0.26458)),
                                scale_y: Some(logo_height_mm / (height as f32 * 0.26458)),
                                dpi: Some(300.0),
                            },
                        );
                    }
                    Err(_) => {
                        // Ignorar si no se puede cargar el logo
                    }
                }
            }
        }
        
        // ENCABEZADO - Título de la hermandad
        current_layer.begin_text_section();
        current_layer.set_font(&font_bold, 10.0);
        current_layer.set_text_cursor(Mm(70.0), Mm(y_position));
        current_layer.write_text(&config.nombre_hermandad, &font_bold);
        current_layer.end_text_section();

        y_position -= 6.0;

        // Ubicación
        current_layer.begin_text_section();
        current_layer.set_font(&font_bold, 10.0);
        current_layer.set_text_cursor(Mm(85.0), Mm(y_position));
        current_layer.write_text(&config.ubicacion, &font_bold);
        current_layer.end_text_section();

        y_position -= 5.0;

        // Dirección
        current_layer.begin_text_section();
        current_layer.set_font(&font, 8.0);
        current_layer.set_text_cursor(Mm(60.0), Mm(y_position));
        current_layer.write_text(&config.direccion, &font);
        current_layer.end_text_section();

        y_position -= 8.0;

        // Número de hermano en la esquina superior derecha
        current_layer.begin_text_section();
        current_layer.set_font(&font, 9.0);
        current_layer.set_text_cursor(Mm(163.5), Mm(y_position + 8.0));
        current_layer.write_text("Nº HERMANO:", &font);
        current_layer.end_text_section();

        // Recuadro para número de hermano (2.86 x 1.63 cm)
        let line_points = vec![
            (Point::new(Mm(160.0), Mm(y_position - 3.3)), false),
            (Point::new(Mm(188.6), Mm(y_position - 3.3)), false),
            (Point::new(Mm(188.6), Mm(y_position + 13.0)), false),
            (Point::new(Mm(160.0), Mm(y_position + 13.0)), false),
        ];
        let line = Line {
            points: line_points,
            is_closed: true,
        };
        current_layer.add_line(line);

        // Número de hermano dentro del recuadro
        current_layer.begin_text_section();
        current_layer.set_font(&font, 11.0);
        current_layer.set_text_cursor(Mm(169.0), Mm(y_position + 1.0));
        current_layer.write_text(&hermano.3, &font);
        current_layer.end_text_section();

        // RECIBO ANUAL DE HERMANO
        let recibo_box_y = y_position - 2.0;
        let line_points = vec![
            (Point::new(Mm(60.0), Mm(recibo_box_y - 7.0)), false),
            (Point::new(Mm(150.0), Mm(recibo_box_y - 7.0)), false),
            (Point::new(Mm(150.0), Mm(recibo_box_y)), false),
            (Point::new(Mm(60.0), Mm(recibo_box_y)), false),
        ];
        let line = Line {
            points: line_points,
            is_closed: true,
        };
        current_layer.add_line(line);

        current_layer.begin_text_section();
        current_layer.set_font(&font_bold, 10.0);
        current_layer.set_text_cursor(Mm(80.0), Mm(recibo_box_y - 5.0));
        current_layer.write_text("RECIBO ANUAL DE HERMANO", &font_bold);
        current_layer.end_text_section();

        y_position -= 12.0;

        // AÑO y CUOTA ANUAL
        let ano_box_y = y_position;
        
        // Recuadro AÑO
        let line_points = vec![
            (Point::new(Mm(20.0), Mm(ano_box_y - 7.0)), false),
            (Point::new(Mm(110.0), Mm(ano_box_y - 7.0)), false),
            (Point::new(Mm(110.0), Mm(ano_box_y)), false),
            (Point::new(Mm(20.0), Mm(ano_box_y)), false),
        ];
        let line = Line {
            points: line_points,
            is_closed: true,
        };
        current_layer.add_line(line);

        current_layer.begin_text_section();
        current_layer.set_font(&font_bold, 10.0);
        current_layer.set_text_cursor(Mm(35.0), Mm(ano_box_y - 5.0));
        current_layer.write_text(format!("AÑO {}              CUOTA ANUAL: {} €", cuota.anio, cuota.importe), &font_bold);
        current_layer.end_text_section();

        // Recuadro TOTAL
        let line_points = vec![
            (Point::new(Mm(150.0), Mm(ano_box_y - 7.0)), false),
            (Point::new(Mm(190.0), Mm(ano_box_y - 7.0)), false),
            (Point::new(Mm(190.0), Mm(ano_box_y)), false),
            (Point::new(Mm(150.0), Mm(ano_box_y)), false),
        ];
        let line = Line {
            points: line_points,
            is_closed: true,
        };
        current_layer.add_line(line);

        current_layer.begin_text_section();
        current_layer.set_font(&font_bold, 10.0);
        current_layer.set_text_cursor(Mm(161.0), Mm(ano_box_y - 5.0));
        current_layer.write_text(format!("TOTAL: {} €", cuota.importe), &font_bold);
        current_layer.end_text_section();

        y_position -= 10.0;

        // DATOS DEL HERMANO/A
        let datos_box_y = y_position;
        
        // Recuadro de datos
        let line_points = vec![
            (Point::new(Mm(20.0), Mm(datos_box_y - 25.0)), false),
            (Point::new(Mm(190.0), Mm(datos_box_y - 25.0)), false),
            (Point::new(Mm(190.0), Mm(datos_box_y)), false),
            (Point::new(Mm(20.0), Mm(datos_box_y)), false),
        ];
        let line = Line {
            points: line_points,
            is_closed: true,
        };
        current_layer.add_line(line);

        // Título de la sección
        current_layer.begin_text_section();
        current_layer.set_font(&font_bold, 8.0);
        current_layer.set_text_cursor(Mm(22.0), Mm(datos_box_y - 4.0));
        current_layer.write_text("DATOS DEL HERMANO/A:", &font_bold);
        current_layer.end_text_section();

        // D./Dña:
        current_layer.begin_text_section();
        current_layer.set_font(&font_bold, 11.0);
        current_layer.set_text_cursor(Mm(22.0), Mm(datos_box_y - 12.0));
        current_layer.write_text("D./Dña: ", &font_bold);
        current_layer.set_font(&font, 11.0);
        current_layer.write_text(&nombre_completo, &font);
        current_layer.end_text_section();

        // Fecha de alta (en la misma línea que el nombre, a la derecha):
        let fecha_alta = &hermano.8;
        // Convertir de YYYY-MM-DD a DD/MM/YYYY
        let fecha_formateada = if let Some(parts) = fecha_alta.split('-').collect::<Vec<_>>().get(0..3) {
            if parts.len() == 3 {
                format!("{}/{}/{}", parts[2], parts[1], parts[0])
            } else {
                fecha_alta.to_string()
            }
        } else {
            fecha_alta.to_string()
        };
        
        current_layer.begin_text_section();
        current_layer.set_font(&font_bold, 9.0);
        current_layer.set_text_cursor(Mm(140.0), Mm(datos_box_y - 12.0));
        current_layer.write_text("Fecha de Alta: ", &font_bold);
        current_layer.set_font(&font, 9.0);
        current_layer.write_text(&fecha_formateada, &font);
        current_layer.end_text_section();

        // Domicilio:
        let direccion = hermano.4.as_deref().unwrap_or("");
        let localidad = hermano.5.as_deref().unwrap_or("");
        let provincia = hermano.6.as_deref().unwrap_or("");
        let codigo_postal = hermano.7.as_deref().unwrap_or("");
        
        let domicilio = if !direccion.is_empty() {
            let mut parts = vec![direccion.to_string()];
            if !codigo_postal.is_empty() || !localidad.is_empty() {
                let location = format!("{} {}", codigo_postal, localidad).trim().to_string();
                if !location.is_empty() {
                    parts.push(location);
                }
            }
            if !provincia.is_empty() {
                parts.push(provincia.to_string());
            }
            parts.join(", ")
        } else {
            "".to_string()
        };
        
        current_layer.begin_text_section();
        current_layer.set_font(&font_bold, 11.0);
        current_layer.set_text_cursor(Mm(22.0), Mm(datos_box_y - 20.0));
        current_layer.write_text("Domicilio: ", &font_bold);
        current_layer.set_font(&font, 11.0);
        current_layer.write_text(&domicilio, &font);
        current_layer.end_text_section();

        y_position -= 28.0;

        // Nota aclaratoria
        current_layer.begin_text_section();
        current_layer.set_font(&font, 8.0);
        current_layer.set_text_cursor(Mm(30.0), Mm(y_position));
        current_layer.write_text("Este recibo, válido para el año indicado, no prueba el pago de los anteriores.", &font);
        current_layer.end_text_section();

        // Espacio entre recibos (distribuido para 3 por página)
        y_position -= 14.0;
    }

    // Guardar el PDF
    let documents_dir = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());
    
    let pdf_path = format!(
        "{}/Documentos/recibos_{}.pdf",
        documents_dir,
        chrono::Local::now().format("%Y%m%d_%H%M%S")
    );

    // Crear directorio si no existe
    if let Some(parent) = std::path::Path::new(&pdf_path).parent() {
        std::fs::create_dir_all(parent)?;
    }

    let file = File::create(&pdf_path)?;
    let mut buf_writer = BufWriter::new(file);
    doc.save(&mut buf_writer)?;

    Ok(pdf_path)
}

fn marcar_recibos_generados(
    db: &DbConnection,
    cuotas_ids: Vec<i32>,
) -> Result<(), anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;

    for id in cuotas_ids {
        conn.execute(
            "UPDATE cuotas SET recibo = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            [id],
        )?;
    }

    Ok(())
}

fn get_configuracion_recibo(db: &DbConnection) -> Result<Option<ConfiguracionRecibo>, anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;

    let result = conn.query_row(
        "SELECT logo_path, nombre_hermandad, ubicacion, direccion FROM configuracion_recibos WHERE id = 1",
        [],
        |row| {
            Ok(ConfiguracionRecibo {
                logo_path: row.get(0)?,
                nombre_hermandad: row.get(1)?,
                ubicacion: row.get(2)?,
                direccion: row.get(3)?,
            })
        },
    );

    match result {
        Ok(config) => Ok(Some(config)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

fn guardar_configuracion_recibo(
    db: &DbConnection,
    config: ConfiguracionRecibo,
) -> Result<(), anyhow::Error> {
    let conn = db
        .lock()
        .map_err(|_| anyhow::anyhow!("Error de base de datos"))?;

    // Usar INSERT OR REPLACE para actualizar o insertar
    conn.execute(
        "INSERT OR REPLACE INTO configuracion_recibos (id, logo_path, nombre_hermandad, ubicacion, direccion, updated_at)
         VALUES (1, ?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)",
        (
            &config.logo_path,
            &config.nombre_hermandad,
            &config.ubicacion,
            &config.direccion,
        ),
    )?;

    Ok(())
}

#[tauri::command]
pub fn get_documentos_path_cmd() -> Result<String, String> {
    let home_dir = dirs::home_dir().ok_or("No se pudo obtener el directorio home")?;
    let documentos_path = home_dir.join("Documentos");
    Ok(documentos_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn abrir_carpeta_recibos_cmd() -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("No se pudo obtener el directorio home")?;
    let documentos_path = home_dir.join("Documentos");

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&documentos_path)
            .spawn()
            .map_err(|e| format!("Error al abrir carpeta: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&documentos_path)
            .spawn()
            .map_err(|e| format!("Error al abrir carpeta: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&documentos_path)
            .spawn()
            .map_err(|e| format!("Error al abrir carpeta: {}", e))?;
    }

    Ok(())
}
