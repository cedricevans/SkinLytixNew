import { AppWalkthrough } from "@/components/AppWalkthrough";
import AppShell from "@/components/AppShell";

const Walkthrough = () => {
  return (
    <AppShell showNavigation showBottomNav contentClassName="px-[5px] lg:px-4 py-12">
      <div className="flex items-center justify-center min-h-[50vh]">
        <AppWalkthrough />
      </div>
    </AppShell>
  );
};

export default Walkthrough;
