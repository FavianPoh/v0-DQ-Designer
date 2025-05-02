import { DataQualityDashboard } from "@/components/data-quality-dashboard"

export default function Home() {
  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Data Quality Framework</h1>
      <DataQualityDashboard />
    </main>
  )
}
