import { DatabaseManager } from "../database/manager"

export class KillHandler {
    static async createKill(request: Request): Promise<Response> {
        const body = await request.json() as {
            userId: string,
            token: string,
            espId: string,
            name: string
        }

        if (!body.userId || !body.token || !body.espId || !body.name) return ErrorResponse.MISSING_PARAMETERS

        if (!await DatabaseManager.shared.verifyToken(body.token)) return ErrorResponse.NOT_AUTHORIZED

        const kill = await DatabaseManager.shared.createKill(body.userId, body.espId, body.name)
        
        if (kill instanceof Response) return kill
        return new Response(JSON.stringify(kill), { status: 200 })
    }
}