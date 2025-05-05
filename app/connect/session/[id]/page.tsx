"use client"

import { useParams } from "next/navigation"
import MobileView from "../../mobile-view"
import Background from "../../../components/background"

export default function SessionPage() {
  const params = useParams()
  const sessionId = params.id as string

  return (
    <div className="overflow-hidden">
      <Background />
      <MobileView sessionId={sessionId} />
    </div>
  )
}
