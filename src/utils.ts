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
}

console.success = (...args: any[]) => {
    console.log(`${GREEN}${args.join(" ")}${RESET}`)
}

export {}