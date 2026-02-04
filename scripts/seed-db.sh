#!/bin/bash

# Script para poblar la base de datos con datos ficticios
# Uso: ./seed-db.sh

echo "🌱 Ejecutando script de seed..."
cd src-tauri && cargo run --bin seed
