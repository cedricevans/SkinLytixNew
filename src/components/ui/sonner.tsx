import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as baseToast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

const toast = ((...args: Parameters<typeof baseToast>) => baseToast(...args)) as typeof baseToast;

toast.error = ((...args: Parameters<typeof baseToast.error>) => {
  if (import.meta.env.DEV) {
    // Keep error visibility in console without surfacing to users
    console.error(...args);
  }
  return undefined as unknown as ReturnType<typeof baseToast.error>;
}) as typeof baseToast.error;

export { Toaster, toast };
