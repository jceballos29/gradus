#!/bin/bash
# infrastructure/docker/init-databases.sh
#
# Crea las bases de datos para Universitas y Gradus.
# identity_db ya existe — la crea la imagen de PostgreSQL
# automáticamente por la variable de entorno POSTGRES_DB.
#
# Este script se ejecuta UNA SOLA VEZ al crear el volumen.

set -e

echo "Creando bases de datos del sistema..."

psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname "$POSTGRES_DB" <<-EOSQL

    CREATE DATABASE universitas_db;
    GRANT ALL PRIVILEGES ON DATABASE universitas_db TO $POSTGRES_USER;

    CREATE DATABASE gradus_db;
    GRANT ALL PRIVILEGES ON DATABASE gradus_db TO $POSTGRES_USER;

EOSQL

echo "Bases de datos creadas:"
echo "  identity_db      -> Identity API"
echo "  universitas_db   -> Universitas API"
echo "  gradus_db        -> Gradus API"