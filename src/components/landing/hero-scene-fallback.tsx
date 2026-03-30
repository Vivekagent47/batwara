const heroLedgerRows = [
  {
    name: "Aanya",
    detail: "Flights and cabs",
    amount: "+₹1,240",
    tone: "text-primary",
    status: "settle back",
  },
  {
    name: "Kabir",
    detail: "Villa deposit",
    amount: "-₹860",
    tone: "text-foreground",
    status: "needs split",
  },
  {
    name: "Meera",
    detail: "Groceries and snacks",
    amount: "-₹420",
    tone: "text-foreground/80",
    status: "captured",
  },
] as const

export function HeroSceneFallback() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_24%_28%,rgba(26,107,60,0.28),transparent_30%),radial-gradient(circle_at_76%_22%,rgba(202,142,45,0.24),transparent_28%),radial-gradient(circle_at_70%_72%,rgba(109,115,135,0.18),transparent_24%),linear-gradient(180deg,rgba(250,247,240,0.97),rgba(239,235,225,0.88))]">
      <div className="paper-grid pointer-events-none absolute inset-0 opacity-[0.14]" />
      <div className="animate-batwara-ambient absolute -top-14 right-6 h-40 w-40 rounded-full bg-[rgba(202,142,45,0.14)] blur-3xl" />
      <div className="animate-batwara-ambient-delayed absolute bottom-8 left-5 h-44 w-44 rounded-full bg-primary/12 blur-3xl" />
      <div className="absolute inset-4 rounded-[1.7rem] border border-white/60 bg-white/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]" />

      <div className="absolute top-7 right-5 hidden rounded-full border border-white/80 bg-white/82 px-3 py-1 text-[11px] tracking-[0.16em] text-foreground/70 uppercase shadow-[0_10px_26px_rgba(28,28,24,0.08)] sm:inline-flex">
        2 payments to settle
      </div>

      <div className="absolute left-4 right-4 bottom-5 rounded-[1.7rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,244,236,0.95))] p-4 shadow-[0_26px_55px_rgba(28,28,24,0.12)] backdrop-blur sm:left-6 sm:right-auto sm:w-[22rem] sm:p-5 lg:w-[24rem]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] text-primary uppercase">
              Weekend ledger
            </p>
            <h3 className="mt-2 font-heading text-3xl leading-none text-foreground">
              Goa trip
            </h3>
            <p className="mt-2 max-w-[15rem] text-sm leading-6 text-muted-foreground">
              One glance at who paid, what is pending, and the cleanest next
              settle-up.
            </p>
          </div>

          <div className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
            4 members
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {heroLedgerRows.map((row) => (
            <div
              key={row.name}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/76 px-3 py-3 shadow-[0_10px_24px_rgba(28,28,24,0.05)]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {row.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.detail}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className={`font-mono-ui text-sm ${row.tone}`}>{row.amount}</p>
                <p className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                  {row.status}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/80 bg-white/70 px-3 py-2.5">
            <p className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              You are owed
            </p>
            <p className="font-mono-ui mt-1 text-sm text-foreground">₹1,580</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/70 px-3 py-2.5">
            <p className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              Suggested settle-up
            </p>
            <p className="font-mono-ui mt-1 text-sm text-foreground">
              2 payments
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
