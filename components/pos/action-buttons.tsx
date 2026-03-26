"use client"

import { Button } from "@/components/ui/button"
import { Printer, Trash2, Banknote, Calculator, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActionButtonsProps {
  onPrint: () => void
  onDelete: () => void
  onPay: () => void
  onCashCount: () => void
  onReports: () => void
  hasSelection: boolean
  hasItems: boolean
}

const actions = [
  {
    key: "print",
    label: "Imprimir Vale",
    icon: Printer,
    variant: "secondary" as const,
    requiresItems: true,
    requiresSelection: false,
  },
  {
    key: "delete",
    label: "Eliminar Línea",
    icon: Trash2,
    variant: "destructive" as const,
    requiresItems: false,
    requiresSelection: true,
  },
  {
    key: "pay",
    label: "Pagar Cuenta",
    icon: Banknote,
    variant: "default" as const,
    requiresItems: true,
    requiresSelection: false,
  },
  {
    key: "cashCount",
    label: "Arqueo Caja",
    icon: Calculator,
    variant: "outline" as const,
    requiresItems: false,
    requiresSelection: false,
  },
  {
    key: "reports",
    label: "Informes",
    icon: BarChart3,
    variant: "outline" as const,
    requiresItems: false,
    requiresSelection: false,
  },
]

export function ActionButtons({
  onPrint,
  onDelete,
  onPay,
  onCashCount,
  onReports,
  hasSelection,
  hasItems,
}: ActionButtonsProps) {
  const handlers: Record<string, () => void> = {
    print: onPrint,
    delete: onDelete,
    pay: onPay,
    cashCount: onCashCount,
    reports: onReports,
  }

  return (
    <section className="mt-4">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:flex lg:justify-center lg:gap-3">
        {actions.map((action) => {
          const Icon = action.icon
          const isDisabled =
            (action.requiresSelection && !hasSelection) ||
            (action.requiresItems && !hasItems)

          return (
            <Button
              key={action.key}
              variant={action.variant}
              onClick={handlers[action.key]}
              disabled={isDisabled}
              className={cn(
                "flex h-auto flex-col gap-1 py-3 lg:flex-row lg:gap-2 lg:px-4 lg:py-3",
                action.key === "pay" && "col-span-3 sm:col-span-1"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium lg:text-sm">{action.label}</span>
            </Button>
          )
        })}
      </div>
    </section>
  )
}
