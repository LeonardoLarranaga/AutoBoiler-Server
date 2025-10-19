const GREEN = "\x1b[32m"
const RESET = "\x1b[0m"

declare global {
    interface Console {
        /**
         * Logs a green message to the console.
         * @param args - The arguments to log.
         */
        success: (...args: any[]) => void
    }

    var ErrorResponse: typeof ErrorResponseClass
}

console.success = (...args: any[]) => {
    console.log(`${GREEN}${args.join(" ")}${RESET}`)
}

// MARK: Error responses

class ErrorResponseClass {
    static readonly MISSING_PARAMETERS = new Response(JSON.stringify({
        error: "Missing parameters"
    }), { status: 400 })

    static INTERNAL_SERVER_ERROR(error: any, message: string = "Internal server error"): Response {
        return new Response(JSON.stringify({
            error: error.message || message,
        }), { status: 500 })
    }

    static NOT_AUTHORIZED = new Response(JSON.stringify({
        error: "Not authorized"
    }), { status: 401 })
}

globalThis.ErrorResponse = ErrorResponseClass

export {}
