import { AuthHandler } from "./auth"
import { KillHandler } from "./kill"

export class HttpHandler {
    static Auth = AuthHandler
    static Kill = KillHandler
}