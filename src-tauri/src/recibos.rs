use crate::db::{DbConnection, Cuota};
use printpdf::*;
use std::fs::File;
use std::io::BufWriter;

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

fn generar_recibos_pdf(
    db: &DbConnection,
    cuotas_ids: Vec<i32>,
) -> Result<String, anyhow::Error> {
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

    // Crear el PDF
    let (doc, page1, layer1) =
        PdfDocument::new("Recibos", Mm(210.0), Mm(297.0), "Capa 1");
    let font = doc.add_builtin_font(BuiltinFont::Helvetica).unwrap();
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold).unwrap();

    let mut current_layer = doc.get_page(page1).get_layer(layer1);

    // Posición inicial
    let mut y_position = 270.0;
    let margin_left = 20.0;
    let page_height = 297.0;
    let margin_bottom = 20.0;
    let recibo_height = 80.0;

    for cuota in cuotas.iter() {
        // Verificar si necesitamos una nueva página
        if y_position < margin_bottom + recibo_height {
            let (page_num, layer_num) = doc.add_page(Mm(210.0), Mm(297.0), "Capa 1");
            current_layer = doc.get_page(page_num).get_layer(layer_num);
            y_position = page_height - 20.0;
        }

        // Obtener información del hermano
        let hermano: (String, String, Option<String>, String) = conn
            .query_row(
                "SELECT nombre, primer_apellido, segundo_apellido, numero_hermano 
                 FROM hermanos WHERE id = ?1",
                [cuota.hermano_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )?;

        let nombre_completo = format!(
            "{} {} {}",
            hermano.0,
            hermano.1,
            hermano.2.unwrap_or_default()
        );

        // Título
        current_layer.begin_text_section();
        current_layer.set_font(&font_bold, 18.0);
        current_layer.set_text_cursor(Mm(margin_left), Mm(y_position));
        current_layer.write_text("RECIBO DE CUOTA", &font_bold);
        current_layer.end_text_section();

        y_position -= 10.0;

        // Número de hermano
        current_layer.begin_text_section();
        current_layer.set_font(&font, 12.0);
        current_layer.set_text_cursor(Mm(margin_left), Mm(y_position));
        current_layer.write_text(format!("Nº Hermano: {}", hermano.3), &font);
        current_layer.end_text_section();

        y_position -= 7.0;

        // Nombre
        current_layer.begin_text_section();
        current_layer.set_font(&font, 12.0);
        current_layer.set_text_cursor(Mm(margin_left), Mm(y_position));
        current_layer.write_text(format!("Hermano/a: {}", nombre_completo), &font);
        current_layer.end_text_section();

        y_position -= 7.0;

        // Año
        current_layer.begin_text_section();
        current_layer.set_font(&font, 12.0);
        current_layer.set_text_cursor(Mm(margin_left), Mm(y_position));
        current_layer.write_text(format!("Cuota del año: {}", cuota.anio), &font);
        current_layer.end_text_section();

        y_position -= 7.0;

        // Importe
        current_layer.begin_text_section();
        current_layer.set_font(&font_bold, 12.0);
        current_layer.set_text_cursor(Mm(margin_left), Mm(y_position));
        current_layer.write_text(format!("Importe: {:.2} €", cuota.importe), &font_bold);
        current_layer.end_text_section();

        y_position -= 7.0;

        // Fecha de pago
        if let Some(ref fecha_pago) = cuota.fecha_pago {
            current_layer.begin_text_section();
            current_layer.set_font(&font, 10.0);
            current_layer.set_text_cursor(Mm(margin_left), Mm(y_position));
            current_layer.write_text(format!("Fecha de pago: {}", fecha_pago), &font);
            current_layer.end_text_section();
            y_position -= 6.0;
        }

        // Método de pago
        if let Some(ref metodo) = cuota.metodo_pago {
            current_layer.begin_text_section();
            current_layer.set_font(&font, 10.0);
            current_layer.set_text_cursor(Mm(margin_left), Mm(y_position));
            current_layer.write_text(format!("Método: {}", metodo), &font);
            current_layer.end_text_section();
            y_position -= 6.0;
        }

        // Espacio entre recibos
        y_position -= 15.0;
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
