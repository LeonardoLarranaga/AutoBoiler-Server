import mqtt, { MqttClient } from "mqtt"

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
     * The message is sent by a KiLL boiler or the KiLL app.
     * If sent by the boiler, the message could represent:
     *  - The status of the boiler when it is on and water flow is detected.
     *  - A status change (on/off) from the physical buttons on the boiler.
     * If sent by the KiLL app, the message could represent:
     *  - A command to the boiler (on/off/set temperature).
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
        console.log(`Message for ${id}: ${data.join(", ")}`)
    }

    public test() {
        console.log("Test")
    }
}