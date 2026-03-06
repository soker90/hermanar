// Las funciones y structs pub de este módulo son usadas desde commands.rs (vía crate::config::*).
// El lint dead_code da falsos positivos para items pub en crates de librería.
#![allow(dead_code)]

use anyhow::Context;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Configuración de la aplicación (almacenada siempre en el directorio por defecto del sistema)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    /// Directorio personalizado para la BD y archivos de la app.
    /// Si es None, se usa el directorio por defecto del sistema.
    pub custom_data_dir: Option<String>,
}

/// Devuelve el directorio de datos por defecto del sistema (nunca cambia)
pub fn get_default_data_dir() -> String {
    let base = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME").map(|home| format!("{}/.local/share", home)))
        .unwrap_or_else(|_| ".".to_string());

    format!("{}/hermanar", base)
}

/// Devuelve la ruta al archivo de configuración (siempre en el directorio por defecto)
pub fn get_config_file_path() -> PathBuf {
    PathBuf::from(get_default_data_dir()).join("config.json")
}

/// Carga la configuración desde disco. Si no existe o hay error, devuelve configuración por defecto.
pub fn load_app_config() -> AppConfig {
    let config_path = get_config_file_path();

    if !config_path.exists() {
        return AppConfig::default();
    }

    match std::fs::read_to_string(&config_path) {
        Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
        Err(e) => {
            eprintln!("Advertencia: no se pudo leer config.json: {}", e);
            AppConfig::default()
        }
    }
}

/// Guarda la configuración en disco (siempre en el directorio por defecto)
pub fn save_app_config(config: &AppConfig) -> Result<(), anyhow::Error> {
    let default_dir = get_default_data_dir();
    std::fs::create_dir_all(&default_dir)
        .context("No se pudo crear el directorio de configuración")?;

    let config_path = get_config_file_path();
    let contents =
        serde_json::to_string_pretty(config).context("No se pudo serializar la configuración")?;

    std::fs::write(&config_path, contents).context("No se pudo escribir config.json")?;

    Ok(())
}

/// Devuelve el directorio de datos efectivo (personalizado si existe, si no el de por defecto)
pub fn get_effective_data_dir() -> String {
    let config = load_app_config();
    config
        .custom_data_dir
        .filter(|s| !s.is_empty())
        .unwrap_or_else(get_default_data_dir)
}

/// Información de configuración de ruta para el frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataDirConfig {
    /// Directorio actualmente en uso
    pub current_dir: String,
    /// Indica si hay ruta personalizada activa
    pub is_custom: bool,
    /// Directorio por defecto del sistema
    pub default_dir: String,
}

/// Devuelve la información de configuración de ruta actual
pub fn get_data_dir_config() -> DataDirConfig {
    let config = load_app_config();
    let default_dir = get_default_data_dir();
    let is_custom = config
        .custom_data_dir
        .as_ref()
        .map(|s| !s.is_empty())
        .unwrap_or(false);

    let current_dir = if is_custom {
        config.custom_data_dir.unwrap()
    } else {
        default_dir.clone()
    };

    DataDirConfig {
        current_dir,
        is_custom,
        default_dir,
    }
}

/// Resultado de comprobar si hay conflicto de BD en la nueva ruta
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckDataDirResult {
    /// Si ya existe hermanar.db en la nueva ruta
    pub db_exists_in_new_dir: bool,
}

/// Comprueba si existe BD en el directorio destino (sin modificar nada)
pub fn check_new_data_dir(new_dir: &str) -> CheckDataDirResult {
    let db_path = PathBuf::from(new_dir).join("hermanar.db");
    CheckDataDirResult {
        db_exists_in_new_dir: db_path.exists(),
    }
}
