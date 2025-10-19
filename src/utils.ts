const GREEN = "\x1b[32m"
const RESET = "\x1b[0m"

declare global {
    interface Console {
        /**
         * Logs a green message to the console.
         */
        success: (...args: any[]) => void
    }

    var ErrorResponse: typeof ErrorResponseClass
    /**
     * Parses and validates JSON request body.
     * Throws `ErrorResponse.MISSING_PARAMETERS` if any required field is missing or empty.
     */
    var parseAndValidate: typeof parseAndValidateFunction
}

console.success = (...args: any[]) => {
    console.log(`${GREEN}${args.join(" ")}${RESET}`)
}

/**
 * Parses and validates JSON request body.
 * Throws `ErrorResponse.MISSING_PARAMETERS` if any required field is missing or empty.
 */
async function parseAndValidateFunction<T extends Record<string, any>>(
    request: Request,
    requiredFields?: (keyof T)[]
): Promise<T> {
    try {
        const body = await request.json() as T
        const fieldsToCheck = requiredFields ?? (Object.keys(body) as (keyof T)[])

        for (const field of fieldsToCheck) {
            const value = body[field]
            if (value === undefined || value === null || value === '') {
                throw ErrorResponse.MISSING_PARAMETERS
            }
        }

        return body
    } catch {
        throw ErrorResponse.MISSING_PARAMETERS
    }
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
globalThis.parseAndValidate = parseAndValidateFunction

export { }
