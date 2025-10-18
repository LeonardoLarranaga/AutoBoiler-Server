import "./src/utils"
import { MqttSubscriber } from "./src/mqtt/subscriber"
import { DatabaseManager } from "./src/database/manager"

new MqttSubscriber()

const databaseManager = new DatabaseManager()
await databaseManager.init()