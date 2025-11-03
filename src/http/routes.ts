import { HttpHandler } from "./handler"

export const routes = {
    "/app/auth/otp/request": {
        POST: async (request: Request) => await HttpHandler.Auth.requestOtp(request)
    },
    "/app/auth/otp/verify": {
        POST: async (request: Request) => await HttpHandler.Auth.verifyOtp(request)
    },
    "/app/auth/broker/certificate": {
        POST: async (request: Request) => await HttpHandler.Auth.generateBrokerCertificate(request)
    },

    "/app/kill/create": {
        POST: async (request: Request) => await HttpHandler.Kill.createKill(request)
    },
    "/app/kill/list": {
        POST: async (request: Request) => await HttpHandler.Kill.listKills(request)
    },

    "/app/kill/reports/summary": {
        POST: async (request: Request) => await HttpHandler.Kill.summaryReport(request)
    },
    "/app/kill/reports/details": {
        POST: async (request: Request) => await HttpHandler.Kill.detailsReport(request)
    }
}