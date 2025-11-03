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

> Nota: Dependiendo de donde ejecutes pocketbase, es la instancia que tendrás. Si lo ejecutas desde el Desktop, y luego desde Documentos, serán dos instancias distintas.

> Guarda tus datos de inicio de sesión, los ocuparás más adelante.

Ingresa a [Import Collections](http://localhost:8090/_/#/settings/import-collections) para añadir el esquema de la base de datos e ingresa los datos de `schema.json`.

> En sistemas Windows, restaurar por backups es incompatible.

Puedes restaurar a una versión con datos en [Backups](http://localhost:8090/_/#/settings/backups) y subiendo el archivo `pb_backup.zip`.

#### Sistema de correos de verificación

Crea una contraseña de aplicación en tu [cuenta de Google](https://myaccount.google.com/apppasswords).

Ingresa a [Mail Settings](http://localhost:8090/_/#/settings/mail) e ingresa los siguientes datos:

- **Sender name**: Tú Nombre + (KiLL), e.g.: Leo (KiLL)
- **Sender address**: Tu correo de Google
- Activa **Use SMTP mail server**
- **SMTP server host**: smtp.gmail.com
- **Port**: 587
- **Username**: Tu correo de Google
- **Password**: La contraseña de aplicación que generaste

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

# MQTT + TLS

## Actualizar env
- `.env.local` ahora debería verse así:
```bash
MQTT_HOSTNAME="localhost"
MQTT_TOPIC="kill/updates/#"

POCKETBASE_URL="localhost"
POCKETBASE_PORT=8090
POCKETBASE_ADMIN_EMAIL="EMAIL"
POCKETBASE_ADMIN_PASSWORD="CONTRASEÑA"

MOSQUITTO_PATH="PATH DE INSTALACIÓN DE MOSQUITTO EJEMPLO /opt/homebrew/etc/mosquitto"
MOSQUITTO_RELOAD_COMMAND="COMANDO DE RELOAD DE MOSQUITTO EJEMPLO brew services reload mosquitto"
```

## Configuración Mosquitto

- `cd` a la carpeta de instalación de mosquitto.
```bash
cd <ruta_mosquitto>
```

- Crea una copia de `mosquitto.conf`

```bash
cp mosquitto.conf mosquitto.conf.copy
```

- En caso de explosión:
```bash
cp mosquitto.conf.copy mosquitto.conf

<reload_mosquitto>
```

- Escribe mosquitto.conf para soportar **TLS**:
```bash
nano mosquitto.conf
```
```bash
listener 8883
protocol mqtt

# Certificates
cafile /opt/homebrew/etc/mosquitto/certs/ca.crt
certfile /opt/homebrew/etc/mosquitto/certs/broker.crt
keyfile /opt/homebrew/etc/mosquitto/certs/broker.key

# Security
require_certificate true
use_identity_as_username true
allow_anonymous false

# ACL
acl_file /opt/homebrew/etc/mosquitto/aclfile
```

**Reemplaza /opt/homebrew/etc/mosquitto por tu ruta de instalación de mosquitto**

- Crea el archivo `aclfile`

```bash
nano aclfile
```

- Ingresa lo siguiente:
```bash
user bun_server
topic readwrite kill/updates/#
```

- Ajusta permisos de `aclfile`
```bash
chmod 700 aclfile
```

- Ejecuta `generate-certs.ts` con bun:
```bash
cd <directorio_bun>
sudo bun run scripts/generate-certs.ts
```

- Añade permisos a los certificados:
```bash
cd <directorio_mosquitto>
sudo chown -R $(whoami) certs
```

- Recarga Mosquitto:
```bash
<reload_mosquitto>
```

- Inicia el servidor:
```bash
sudo bun run --watch index.ts
```