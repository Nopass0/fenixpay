import { httpClient } from "./httpClient"
import type { InfoPayload, NotificationPayload } from "@/types/device-emulator"

export class DeviceApiClient {
  constructor(
    readonly baseUrl: string,
    private token?: string
  ) {}

  async connect(deviceCode: string, model: string, androidVersion: string, initialBattery: number): Promise<string> {
    const response = await httpClient.post(`${this.baseUrl}/api/device/connect`, {
      deviceCode,
      batteryLevel: initialBattery,
      networkInfo: "Wi-Fi",
      deviceModel: model,
      androidVersion,
      appVersion: "2.0.0",
    })

    if (response.status === "success" && response.token) {
      this.token = response.token
      return response.token
    }
    
    throw new Error(response.message || "Failed to connect device")
  }

  async updateInfo(payload: InfoPayload): Promise<void> {
    if (!this.token) {
      throw new Error("Device not connected")
    }

    const response = await httpClient.post(
      `${this.baseUrl}/api/device/info/update`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    )

    if (response.status === "error") {
      if (response.code === 401 || response.code === 404) {
        this.token = undefined
        throw new Error("AUTH_ERROR")
      }
      throw new Error(response.message || "Failed to update info")
    }
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    if (!this.token) {
      throw new Error("Device not connected")
    }

    const response = await httpClient.post(
      `${this.baseUrl}/api/device/notification`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    )

    if (response.status === "error") {
      if (response.code === 401 || response.code === 404) {
        this.token = undefined
        throw new Error("AUTH_ERROR")
      }
      throw new Error(response.message || "Failed to send notification")
    }
  }

  getToken(): string | undefined {
    return this.token
  }

  setToken(token: string | undefined): void {
    this.token = token
  }
}