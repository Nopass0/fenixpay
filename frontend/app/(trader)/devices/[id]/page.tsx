import { DeviceDetail } from "@/components/trader/device-detail"

interface PageProps {
  params: {
    id: string
  }
}

export default function DevicePage({ params }: PageProps) {
  return <DeviceDetail deviceId={params.id} />
}