import { Construction, Shield } from "lucide-react"

export function Guardrails() {
  return (
    <div className="flex min-h-[min(420px,60vh)] flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-border bg-background px-8 py-16 text-center shadow-sm">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Shield className="h-8 w-8 text-muted-foreground" aria-hidden />
        <span className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background shadow-sm">
          <Construction className="h-4 w-4 text-amber-600" aria-hidden />
        </span>
      </div>
      <div className="max-w-sm space-y-1.5">
        <p className="text-base font-semibold tracking-tight text-foreground">Building</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Guardrails analytics and policy management are not wired up in this prototype yet.
        </p>
      </div>
    </div>
  )
}
