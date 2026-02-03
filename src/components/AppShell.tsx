import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ResponsiveBottomNav, ResponsiveBottomNavProps } from "@/components/ResponsiveBottomNav";
import BrandName from "@/components/landing/BrandName";
import TopLoadingBar from "@/components/TopLoadingBar";

type AppShellProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  showNavigation?: boolean;
  showFooter?: boolean;
  showBottomNav?: boolean;
  bottomNavProps?: ResponsiveBottomNavProps;
  onAskGpt?: () => void;
  className?: string;
  contentClassName?: string;
  loading?: boolean;
  loadingLabel?: string;
};

const AppShell = ({
  children,
  header,
  footer,
  showNavigation = false,
  showFooter = true,
  showBottomNav = false,
  bottomNavProps,
  onAskGpt,
  className,
  contentClassName,
  loading = false,
  loadingLabel,
}: AppShellProps) => {
  return (
    <div className={cn("min-h-screen bg-background flex flex-col", className)}>
      {loading ? <TopLoadingBar label={loadingLabel} /> : null}
      {showNavigation && (
        <header className="w-full bg-primary shadow-soft">
          <div className="max-w-6xl mx-auto px-[10px] md:px-6 py-3 md:py-4 flex justify-between items-center">
            <h2 className="text-xl md:text-2xl font-heading font-bold text-primary-foreground">
              <BrandName />
            </h2>
            <Navigation variant="app" onAskGpt={onAskGpt} />
          </div>
        </header>
      )}
      {header}
      <main className={cn("flex-1", contentClassName)}>{children}</main>
      {showBottomNav ? <ResponsiveBottomNav {...bottomNavProps} /> : null}
      {showFooter ? footer ?? <Footer /> : null}
    </div>
  );
};

export default AppShell;
