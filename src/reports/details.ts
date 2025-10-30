import type { RecordModel } from "pocketbase"
import { DatabaseManager } from "../database/manager"

type DataPoint = {
    timestamp: Date
    value: number
}

type ReportDetailResult = {
    dataPoints: DataPoint[]
    average: number
}

export class ReportDetailProcessor {
    public static shared: ReportDetailProcessor = new ReportDetailProcessor()

    public async process(killId: string, dateInterval: "hour" | "day" | "week" | "month" | "year" | "range", type: "temperature" | "power" | "water-flow", currentTimestamp: Date, startDate?: Date, endDate?: Date): Promise<ReportDetailResult> {
        if (dateInterval === "range") {
            if (!startDate || !endDate) throw ErrorResponse.MISSING_PARAMETERS
        }

        let dataPoints = await this.fetchDataPoints(killId, dateInterval, type, currentTimestamp)
        switch (dateInterval) {
            case "hour": 
                break
            case "day": 
                dataPoints = this.groupBy("hour", dataPoints)
                break
            case "week":
            case "month":
                dataPoints = this.groupBy("day", dataPoints)
                break
            case "year":
                dataPoints = this.groupBy("month", dataPoints)
                break
            case "range":
                break
        }

        return {
            dataPoints: dataPoints,
            average: dataPoints.reduce((acc, curr) => acc + curr.value, 0) / dataPoints.length,
        }
    }

    private async fetchDataPoints(killId: string, dateInterval: "hour" | "day" | "week" | "month" | "year" | "range", type: "temperature" | "power" | "water-flow", currentTimestamp: Date | string): Promise<DataPoint[]> {
        // Calculate the interval in days for the given date interval
        const intervals: Record<string, number> = {
            hour: 1,
            day: 1,
            week: 7,
            month: 30,
            year: 365
        }

        // Calculate the start date based on the end date and the date interval
        const startDateFunc = (endDate: Date) => {
            const startDate = new Date(endDate)
            if (dateInterval === "hour") {
                startDate.setHours(startDate.getHours() - intervals[dateInterval]!)
            } else {
                startDate.setDate(startDate.getDate() - intervals[dateInterval]!)
            }
            return startDate
        }

        let endDate = new Date(currentTimestamp)
        let startDate = startDateFunc(endDate)

        let states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)

        // If no data is found, look for the latest state before the current timestamp
        if (states.length === 0) {
            const lastStateDate = await DatabaseManager.shared.getLastKillStateDateBeforeTimestamp(killId, endDate)
            if (!lastStateDate) return []
            endDate = new Date(lastStateDate)
            startDate = startDateFunc(endDate)
            states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)
        }

        return this.mapDataPoints(states, type).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    }

    private mapDataPoints(states: RecordModel[], type: "temperature" | "power" | "water-flow"): DataPoint[] {
        return states.map(state => {
            let value: number
            switch (type) {
                case "temperature":
                    value = state.temperature
                    break
                case "power":
                    value = state.power
                    break
                case "water-flow":
                    value = state.water_flow
                    break
            }

            return {
                timestamp: new Date(state.created),
                value: value
            }
        })
    }

    private groupBy(interval: "hour" | "day" | "month", dataPoints: DataPoint[]): DataPoint[] {
        const averages = new Map<string, { sum: number, count: number, date: Date }>()

        dataPoints.forEach(point => {
            const dateKey = new Date(point.timestamp)
            if (interval === "month") dateKey.setDate(1)
            if (interval === "hour") {
                dateKey.setMinutes(0, 0, 0)
            } else {
                dateKey.setHours(0, 0, 0, 0)
            }
            
            let key: string
            if (interval === "hour") {
                key = dateKey.toISOString()
            } else if (interval === "day") {
                key = dateKey.toISOString()
            } else {
                key = `${dateKey.getFullYear()}-${dateKey.getMonth()}`
            }
            
            const existing = averages.get(key) || { sum: 0, count: 0, date: dateKey }
            averages.set(key, {
                sum: existing.sum + point.value,
                count: existing.count + 1,
                date: dateKey
            })
        })

        // Convert to DataPoint array with averages
        const points: DataPoint[] = Array.from(averages.values()).map(data => {
            return {
                timestamp: data.date,
                value: data.sum / data.count
            }
        }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

        return points
    }
}