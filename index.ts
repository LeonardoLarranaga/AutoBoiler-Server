import "./src/utils"
import { MqttSubscriber } from "./src/mqtt/subscriber"
import { HttpHandler } from "./src/http/handler"
import { DatabaseManager } from "./src/database/manager"

MqttSubscriber.shared
await DatabaseManager.shared.init()

const port = process.env.PORT || 3000

Bun.serve({
    port,
    routes: {
        "/app/auth/user-exists": {
            POST: async (request) => await HttpHandler.Auth.userExists(request)
        },
        "/app/auth/otp/request": {
            POST: async (request) => await HttpHandler.Auth.requestOtp(request)
        },
        "/app/auth/otp/verify": {
            POST: async (request) => await HttpHandler.Auth.verifyOtp(request)
        }
    }
})

console.success(`🚀 Server running on port ${port}`)