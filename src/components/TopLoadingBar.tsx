import { cn } from "@/lib/utils";

type TopLoadingBarProps = {
  label?: string;
  className?: string;
};

const TopLoadingBar = ({ label, className }: TopLoadingBarProps) => {
  return (
    <div className={cn("fixed inset-x-0 top-0 z-50 pointer-events-none", className)} role="status" aria-live="polite">
      <div className="relative h-1 w-full overflow-hidden bg-primary/10">
        <div className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent animate-[sl-topbar_1.2s_ease-in-out_infinite]" />
      </div>
      {label ? (
        <div className="flex justify-center px-3 pt-2">
          <span className="text-[13px] md:text-sm font-semibold text-red-600">
            {label}
          </span>
        </div>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
};

export default TopLoadingBar;
