import { HttpHandler } from "./handler"

export const routes = {
    "/app/auth/otp/request": {
        POST: async (request: Request) => await HttpHandler.Auth.requestOtp(request)
    },
    "/app/auth/otp/verify": {
        POST: async (request: Request) => await HttpHandler.Auth.verifyOtp(request)
    },

    "/app/kill/create": {
        POST: async (request: Request) => await HttpHandler.Kill.createKill(request)
    },

    "/app/kill/reports/summary": {
        POST: async (request: Request) => await HttpHandler.Kill.summaryReport(request)
    }
}