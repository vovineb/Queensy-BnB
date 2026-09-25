import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { AnnouncementBar } from "@/components/site/announcement-bar";
import { PageViewTracker } from "@/components/site/page-view-tracker";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AnnouncementBar />
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <PageViewTracker />
    </div>
  );
}
