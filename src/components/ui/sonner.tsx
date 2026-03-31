import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

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
            "group toast group-[.toaster]:bg-white/60 group-[.toaster]:dark:bg-zinc-950/60 group-[.toaster]:backdrop-blur-2xl group-[.toaster]:text-zinc-900 group-[.toaster]:dark:text-zinc-50 group-[.toaster]:border-white/20 group-[.toaster]:dark:border-white/10 group-[.toaster]:shadow-[0_8px_30px_rgb(0,0,0,0.08)] group-[.toaster]:dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl p-4 ring-1 ring-black/5 dark:ring-white/10",
          title: "text-[14px] font-medium tracking-tight",
          description: "group-[.toast]:text-zinc-500 group-[.toast]:dark:text-zinc-400 text-[13px]",
          icon: "group-data-[type=error]:text-red-500 group-data-[type=success]:text-emerald-500 group-data-[type=warning]:text-amber-500 group-data-[type=info]:text-blue-500 mt-0.5",
          actionButton: "group-[.toast]:bg-zinc-900 group-[.toast]:dark:bg-zinc-50 group-[.toast]:text-white group-[.toast]:dark:text-zinc-900 font-medium rounded-lg text-xs px-4 py-2 hover:scale-105 transition-transform active:scale-95 shadow-sm",
          cancelButton: "group-[.toast]:bg-zinc-100 group-[.toast]:dark:bg-zinc-800 group-[.toast]:text-zinc-600 group-[.toast]:dark:text-zinc-300 font-medium rounded-lg text-xs px-4 py-2 hover:scale-105 transition-transform active:scale-95 ring-1 ring-inset ring-black/5 dark:ring-white/10",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
