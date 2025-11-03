import fs from "fs/promises"
import path from "path"

export class CertificateGenerator {

    public static shared: CertificateGenerator = new CertificateGenerator()

    private mosquittoPath: string
    private cerPath: string
    private aclPath: string
    private reloadMosquittoCommand: string

    private constructor() {
        const MOSQUITTO_PATH = process.env.MOSQUITTO_PATH
        const RELOAD_MOSQUITTO_COMMAND = process.env.MOSQUITTO_RELOAD_COMMAND
        if (!MOSQUITTO_PATH || !RELOAD_MOSQUITTO_COMMAND) {
            console.error("Missing environment variables.")
            process.exit(1)
        }

        this.mosquittoPath = MOSQUITTO_PATH
        this.reloadMosquittoCommand = RELOAD_MOSQUITTO_COMMAND
        this.cerPath = path.join(this.mosquittoPath, "certs")
        this.aclPath = path.join(this.mosquittoPath, "aclfile")
    }

    public async generateBrokerCertificate(token: string, espId: string): Promise<any> {
        const username = `esp_${espId}`
        const certificateDirectory = path.join("/tmp/certs", username)
        await fs.mkdir(certificateDirectory, { recursive: true })

        // Generate key
        Bun.spawn(["openssl", "genrsa", "-out", `${certificateDirectory}/client.key`, "2048"])

        // Certificate Signing Request (CSR)
        Bun.spawn([
            "openssl", "req", "-new", "-key", `${certificateDirectory}/client.key`, 
            "-out", `${certificateDirectory}/client.csr`, 
            "-subj", `/CN=${username}`
        ])

        // Sign the CSR with the CA (Mosquitto) certificate
        Bun.spawn([
            "openssl", "x509", "-req", "-in", `${certificateDirectory}/client.csr`, 
            "-CA", `${this.cerPath}/ca.crt`, 
            "-CAkey", `${this.cerPath}/ca.key`, 
            "-CAcreateserial",
            "-out", `${certificateDirectory}/client.crt`,
            "-days", "365",
            "-sha256"
        ])

        // Add to access control list and reload mosquitto
        await this.addAccessControlList(username, espId)

        // Return crt, key and ca
        const crt = await fs.readFile(`${certificateDirectory}/client.crt`)
        const key = await fs.readFile(`${certificateDirectory}/client.key`)
        const ca = await fs.readFile(`${this.cerPath}/ca.crt`)

        return {
            clientCert: crt,
            clientKey: key,
            caCert: ca
        }
    }

    private async addAccessControlList(username: string, espId: string) {
        const aclEntry = `
user ${username}
topic readwrite kill/updates/${espId}
topic readwrite kill/commands/${espId}
`
        await fs.appendFile(`${this.aclPath}`, aclEntry)
        Bun.spawn([this.reloadMosquittoCommand])
    }
}