export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#F5F2EA] p-6">
      <div className="text-center">
        <div className="font-[family-name:var(--font-display)] text-[32px] font-extrabold tracking-[-0.03em] text-[#123B2E]">
          NetSifr
        </div>
        <div className="ns-label mt-1.5 text-[#4A6258]">Learn · Attend · Volunteer</div>
      </div>
      <div className="ns-card w-full max-w-sm p-6 shadow-float">{children}</div>
    </div>
  );
}
