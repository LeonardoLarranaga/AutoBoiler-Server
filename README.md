# killserver

## Ambiente de desarrollo

### Mosquitto

Para instalar Mosquitto: Seguir los pases en [mosquitto.org](https://mosquitto.org/download/)

### Bun

Para instalar Bun: Seguir los pasos en [bun.com](https://bun.com/docs/installation).


### Pocketbase

Pocketbase es un gestor de base de datos basado en SQLite. Utilizado por ser rápido y tener incluído un sistema de autenticación.

Para instalar Pocketbase: Seguir los pasos en [pocketbase.io](https://pocketbase.io/docs/).

Al extrar el .zip, ejecuta `./pocketbase serve`, abre [http://127.0.0.1:8090]() en tu navegador y crea un usuario con tu email y contraseña de super-usuario.

> Guarda tus datos de inicio de sesión, los ocuparás más adelante.

Ingresa a [Import Collections](http://localhost:8090/_/#/settings/import-collections) para añadir el esquema de la base de datos e ingresa los datos de `schema.json`.

> En sistemas Windows, lo siguiente es incompatible.

Puedes restaurar a una versión con datos en [Backups](http://localhost:8090/_/#/settings/backups) y subiendo el archivo `pb_backup.zip`.


## Iniciar el servidor

Añade `.env.local` a la raíz del proyecto, tu archivo debería verse así:

```bash
MQTT_URL="mqtt://<URL>/"
MQTT_TOPIC="URL/#"

POCKETBASE_URL="URL"
POCKETBASE_PORT=PUERTO
POCKETBASE_ADMIN_EMAIL="EMAIL"
POCKETBASE_ADMIN_PASSWORD="CONTRASEÑA"
```

Instala dependencias:

```bash
bun install
```

Inicia:

```bash
bun run --watch index.ts
```

Para simular un boiler activo (que solo manda datos):
```bash 
./simulate_boiler.sh
```
> Importante: No cambiar `sleep 3`, ya que la base de datos toma la fecha en la que se inserta el nuevo dato.