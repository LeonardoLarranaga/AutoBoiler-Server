import mqtt, { MqttClient } from "mqtt"
import { DatabaseManager } from "../database/manager"

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

    private constructor() {
        const MQTT_URL = process.env.MQTT_URL
        this.topic = process.env.MQTT_TOPIC || ""

        if (!MQTT_URL || !this.topic) {
            console.error("Missing environment variables.")
            process.exit(1)
        }

        this.client = mqtt.connect(MQTT_URL, {
            clientId: `killserver_${Math.random().toString(16).slice(2, 10)}`,
            clean: true,
            reconnectPeriod: this.RECONNECT_DELAY,
            connectTimeout: this.CONNECTION_TIMEOUT,
            keepalive: this.PING_INTERVAL,
            resubscribe: true,
        })

        this.setupEventHandlers()
    }

    async init() {
        this.client.reconnect()
    }

    private setupEventHandlers() {
        this.setupOnConnect()
        this.setupOnReconnect()
        this.setupOnDisconnect()
        this.setupOnMessage()
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
            console.success(`🔗 Connected to MQTT broker!`)
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
            console.success("Reconnected to MQTT broker...")
            this.subscribeToTopic()
        })
    }

    private setupOnDisconnect() {
        this.client.on("disconnect", () => {
            console.warn("Disconnected from MQTT broker")
            this.isSubscribed = false
        })
    }

    private handleMessage(id: string, data: string[]) {
        const [powerStr, flowStr, tempOutStr, tempInStr, targetStr] = data
        if (!powerStr || !flowStr || !tempOutStr || !tempInStr || !targetStr) return
        
        const power = parseFloat(powerStr)
        const flow = parseFloat(flowStr)
        const tempOut = parseFloat(tempOutStr)
        const tempIn = parseFloat(tempInStr)
        const target = parseFloat(targetStr)
        if (isNaN(power) || isNaN(flow) || isNaN(tempOut) || isNaN(tempIn) || isNaN(target)) return
        
        DatabaseManager.shared.createKillState(id, tempOut, power, flow, tempIn, target)
    }
}