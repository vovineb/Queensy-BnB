import { Logo } from "@/components/site/logo";
import { CalendarCheck2, MessagesSquare, ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative hidden overflow-hidden bg-lagoon-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo tone="light" />
        <div className="max-w-md">
          <h2 className="text-h1 font-bold text-white">Your stays, messages and bookings in one place.</h2>
          <ul className="mt-8 space-y-4 text-white/85">
            <li className="flex gap-3"><CalendarCheck2 className="size-5 shrink-0 text-sunset-300" /> Book with live availability and clear pricing</li>
            <li className="flex gap-3"><MessagesSquare className="size-5 shrink-0 text-sunset-300" /> Chat with our Kenya-based team in real time</li>
            <li className="flex gap-3"><ShieldCheck className="size-5 shrink-0 text-sunset-300" /> You control your data and marketing preferences</li>
          </ul>
        </div>
        <p className="text-sm text-white/60">Queensy BnB · Kenya</p>
      </aside>
      <main id="main" className="flex flex-col px-4 py-6 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
