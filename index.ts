import "./src/utils"
import { DatabaseManager } from "./src/database/manager"
import { HttpHandler } from "./src/http/handler"
import { MqttSubscriber } from "./src/mqtt/subscriber"

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
        },

        "/app/kill/create": {
            POST: async (request) => await HttpHandler.Kill.createKill(request)
        },

        "/app/kill/reports/summary": {
            POST: async (request) => await HttpHandler.Kill.summaryReport(request)
        }
    }
})

console.success(`🚀 Server running on port ${port}`)