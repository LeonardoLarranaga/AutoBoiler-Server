import "./src/utils"
import { DatabaseManager } from "./src/database/manager"
import { MqttSubscriber } from "./src/mqtt/subscriber"
import { routes } from "./src/http/routes"

await MqttSubscriber.shared.init()
await DatabaseManager.shared.init()

const port = process.env.PORT || 3000

Bun.serve({ port, routes })

console.success(`🚀 Server running on port ${port}`)