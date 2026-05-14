export default function KalendarzLayout({ children }: { children: React.ReactNode }) {
  return <div className="relative -mx-4 min-w-0 w-[calc(100%+2rem)] max-w-none md:-mx-8 md:w-[calc(100%+4rem)]">{children}</div>;
}
