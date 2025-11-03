import mqtt, { MqttClient } from "mqtt"
import { DatabaseManager } from "../database/manager"
import path from "path"
import fs from "fs"

/**
 * A class that subscribes to an MQTT topic and handles the messages.
 */
export class MqttSubscriber {
    public static shared: MqttSubscriber = new MqttSubscriber()

    private client: MqttClient
    private topic: string
    private isSubscribed = false
    
    private readonly CONNECTION_TIMEOUT = 10 * 1000
    private readonly RECONNECT_DELAY = 250
    private readonly PING_INTERVAL = 1 * 1000

    private readonly certDir: string

    private constructor() {
        this.topic = process.env.MQTT_TOPIC || ""
        const MOSQUITTO_PATH = process.env.MOSQUITTO_PATH
        const MQTT_HOSTNAME = process.env.MQTT_HOSTNAME

        if (!MQTT_HOSTNAME || !this.topic || !MOSQUITTO_PATH) {
            console.error("Missing environment variables.")
            process.exit(1)
        }

        this.certDir = path.join(MOSQUITTO_PATH, "certs")
        // Secure TLS options
        const options: mqtt.IClientOptions = {
            host: MQTT_HOSTNAME,
            port: 8883,
            protocol: "mqtts",
            clientId: `bun_server`,
            reconnectPeriod: this.RECONNECT_DELAY,
            clean: true,
            rejectUnauthorized: true,
            keepalive: this.PING_INTERVAL,
            resubscribe: false, // Handle resubscription manually
            connectTimeout: this.CONNECTION_TIMEOUT,
            ca: fs.readFileSync(path.join(this.certDir, "ca.crt")),
            key: fs.readFileSync(path.join(this.certDir, "bun.key")),
            cert: fs.readFileSync(path.join(this.certDir, "bun.crt"))
        }

        this.client = mqtt.connect(options)

        this.setupEventHandlers()
    }

    async init() {
        // Connection is automatically initiated in the constructor
        // No need to call reconnect() here
    }

    private setupEventHandlers() {
        this.setupOnConnect()
        this.setupOnReconnect()
        this.setupOnDisconnect()
        this.setupOnMessage()
        this.setupOnError()
    }
    
    private subscribeToTopic() {
        if (this.isSubscribed) return

        this.client.subscribe(this.topic, (error) => {
            if (error) {
                console.error(`Failed to subscribe to ${this.topic}:`, error)
            } else {
                console.success(`👀 Subscribed to ${this.topic}`)
                this.isSubscribed = true
            }
        })
    }

    private setupOnConnect() {
        this.client.on("connect", () => {
            console.success(`🔗 Connected to MQTT broker via secure TLS!`)
            this.subscribeToTopic()
        })
    }

    /**
     * Handles a message published to the topic.
     * This topic is used for the boiler to send updates to the server.
     * The message represents:
     * The status of the boiler when it is on and water flow is detected.
     * Contains in this order:
     * - The current temperature of the boiler
     * - The current power of the boiler
     * - The current water flow of the boiler
    */
    private setupOnMessage() {
        this.client.on("message", (topic, message) => {
            const match = topic.match(/^kill\/updates\/(.+)$/)
            const id = match?.[1]
            if (!id) return

            const payload = message.toString()
            const data = payload.split(",")

            this.handleMessage(id, data)
        })
    }

    private setupOnReconnect() {
        this.client.on("reconnect", () => {
            console.warn("Reconnecting to MQTT broker...")
            this.isSubscribed = false
        })
    }

    private setupOnDisconnect() {
        this.client.on("disconnect", () => {
            console.error("Disconnected from MQTT broker")
            this.isSubscribed = false
        })
    }

    private setupOnError() {
        this.client.on("error", (error) => {
            console.error("MQTT connection error:", error.message)
        })
    }

    private handleMessage(id: string, data: string[]) {
        const [temperatureStr, powerStr, waterFlowStr] = data
        if (!powerStr || !waterFlowStr || !temperatureStr) return
        
        const temperature = parseFloat(temperatureStr)
        const power = parseFloat(powerStr)
        const waterFlow = parseFloat(waterFlowStr)
        if (isNaN(temperature) || isNaN(power) || isNaN(waterFlow)) return
        
        DatabaseManager.shared.createKillState(id, temperature, power, waterFlow)
    }
}