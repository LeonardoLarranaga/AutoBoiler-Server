import { execSync } from "child_process"
import fs from "fs"
import path from "path"

const MOSQUITTO_PATH = process.env.MOSQUITTO_PATH
if (!MOSQUITTO_PATH) {
  console.error("Missing environment variables (MOSQUITTO_PATH).")
  process.exit(1)
}

const certDir = path.join(MOSQUITTO_PATH, "certs")
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true })
}

function run(cmd: string) {
  console.log("⚙️", cmd)
  execSync(cmd, { stdio: "inherit" })
}

const caKey = path.join(certDir, "ca.key")
const caCrt = path.join(certDir, "ca.crt")
const brokerKey = path.join(certDir, "broker.key")
const brokerCsr = path.join(certDir, "broker.csr")
const brokerCrt = path.join(certDir, "broker.crt")
const bunKey = path.join(certDir, "bun.key")
const bunCsr = path.join(certDir, "bun.csr")
const bunCrt = path.join(certDir, "bun.crt")

if (!fs.existsSync(caCrt)) {
  console.log("🔐 Generating CA certificate...")
  run(`openssl genrsa -out ${caKey} 2048`)
  run(`openssl req -x509 -new -nodes -key ${caKey} -sha256 -days 3650 -out ${caCrt} -subj "/CN=KiLL-CA"`)
}

if (!fs.existsSync(brokerCrt)) {
  console.log("🧩 Generating broker certificate...")
  run(`openssl genrsa -out ${brokerKey} 2048`)
  run(`openssl req -new -key ${brokerKey} -out ${brokerCsr} -subj "/CN=localhost"`)
  run(`openssl x509 -req -in ${brokerCsr} -CA ${caCrt} -CAkey ${caKey} -CAcreateserial -out ${brokerCrt} -days 365 -sha256`)
}

if (!fs.existsSync(bunCrt)) {
  console.log("💻 Generating Bun client certificate...")
  run(`openssl genrsa -out ${bunKey} 2048`)
  run(`openssl req -new -key ${bunKey} -out ${bunCsr} -subj "/CN=bun_server"`)
  run(`openssl x509 -req -in ${bunCsr} -CA ${caCrt} -CAkey ${caKey} -CAcreateserial -out ${bunCrt} -days 365 -sha256`)
}

console.log("✅ All certificates are ready:")
console.log(fs.readdirSync(certDir).map(f => " - " + f).join("\n"))
