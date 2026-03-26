"use client"

interface TotalDisplayProps {
  total: number
}

export function TotalDisplay({ total }: TotalDisplayProps) {
  return (
    <div className="text-right">
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">Total</p>
      <p className="text-lg font-bold tabular-nums lg:text-xl">
        ${total.toLocaleString("es-CL")}
      </p>
    </div>
  )
}
