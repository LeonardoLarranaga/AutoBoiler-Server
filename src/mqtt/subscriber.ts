import mqtt from "mqtt"

const client = mqtt.connect(`${process.env.MQTT_URL}`)

client.on("connect", () => {
    console.log("Connected to MQTT broker")
})

client.on("message", (topic, message) => {
    const match = topic.match(/^kill\/updates\/(.+)$/)
    if (match) {
        console.log("Topic:", topic)
        console.log("Payload:", message.toString())
    }
})

// Subscribe to dynamic topics under kill/updates/#
client.subscribe("kill/updates/#", (err) => {
    if (err) {
        console.error("Failed to subscribe to kill/updates/#:", err)
    } else {
        console.log("Subscribed to kill/updates/#")
    }
})
