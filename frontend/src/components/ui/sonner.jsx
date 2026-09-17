import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/ThemeProvider";

/**
 * ============================================================================
 * SONNER TOASTER COMPONENT (sonner.jsx) - Workstream B
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Configures and mounts the Sonner toast notification engine for AudioScape.
 * Bridges application theme states (Midnight Studio Dark / Aura Lumina Light)
 * and custom design tokens to provide fluid, physics-based toast notifications.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Theme Reactivity: Subscribes to ThemeProvider's `resolvedTheme` ('dark' | 'light')
 *    so notifications immediately adapt when users toggle themes or OS preferences change.
 * 2. Visual Polish: Uses AudioScape's CSS variables (--color-surface-raised,
 *    --color-border-default, --color-primary) ensuring toasts match the glassmorphic
 *    cyber-music aesthetic.
 * 3. Mobile-Responsive & Player-Safe: Defaulted to 'top-right' (with mobile top-center
 *    alignment) so toasts never obstruct the persistent bottom playback bar.
 * 4. Rich Interactivity: Configured with swipe-to-dismiss, expandable stack on hover,
 *    and styled action buttons for interactive "Undo" operations.
 * ============================================================================
 */
export function Toaster({ ...props }) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme || "dark"}
      className="toaster group font-sans"
      position="top-right"
      richColors
      closeButton
      expand={true}
      duration={4000}
      visibleToasts={5}
      gap={12}
      offset={16}
      style={{
        "--width": "380px",
        "--toast-close-button-start": "unset",
        "--toast-close-button-end": "10px",
        "--toast-close-button-transform": "none",
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[var(--color-surface-raised)] group-[.toaster]:text-[var(--color-on-surface)] group-[.toaster]:border-[var(--color-border-default)] group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl group-[.toaster]:backdrop-blur-md font-sans select-none border py-3 px-4 sm:py-3.5 sm:px-4.5 pr-9 sm:pr-10 transition-all duration-200 text-sm",
          title:
            "group-[.toast]:text-sm sm:group-[.toast]:text-[15px] group-[.toast]:font-semibold group-[.toast]:text-inherit tracking-tight",
          description:
            "group-[.toast]:text-xs sm:group-[.toast]:text-[13px] group-[.toast]:text-inherit group-[.toast]:opacity-85 leading-relaxed mt-0.5",
          actionButton:
            "group-[.toast]:!bg-[var(--color-primary)] group-[.toast]:!text-[var(--color-text-on-primary)] group-[.toast]:font-semibold group-[.toast]:text-xs sm:group-[.toast]:text-sm group-[.toast]:rounded-xl group-[.toast]:px-3.5 group-[.toast]:py-1.5 group-[.toast]:shadow-md transition-all duration-150 hover:opacity-90 active:scale-95 cursor-pointer ml-2 shrink-0",
          cancelButton:
            "group-[.toast]:!bg-[var(--color-surface-overlay)] group-[.toast]:!text-[var(--color-on-surface)] group-[.toast]:text-xs sm:group-[.toast]:text-sm group-[.toast]:rounded-xl group-[.toast]:px-3 group-[.toast]:py-1.5 transition-colors hover:opacity-90 cursor-pointer shrink-0",
          closeButton:
            "group-[.toast]:!left-auto group-[.toast]:!right-2.5 group-[.toast]:!top-2.5 group-[.toast]:!transform-none group-[.toast]:!w-6 group-[.toast]:!h-6 group-[.toast]:!rounded-full group-[.toast]:!border group-[.toast]:!border-black/10 dark:group-[.toast]:!border-white/15 group-[.toast]:!bg-black/5 dark:group-[.toast]:!bg-white/10 group-[.toast]:!text-inherit group-[.toast]:opacity-70 group-[.toast]:hover:opacity-100 group-[.toast]:hover:!bg-black/10 dark:group-[.toast]:hover:!bg-white/20 transition-all cursor-pointer flex items-center justify-center",
          icon: "group-[.toast]:scale-110 group-[.toast]:mr-1.5",
          success:
            "group-[.toaster]:!border-emerald-500/30 group-[.toaster]:dark:!border-emerald-400/25",
          error:
            "group-[.toaster]:!border-rose-500/40 group-[.toaster]:dark:!border-rose-400/30",
          info:
            "group-[.toaster]:!border-sky-500/30 group-[.toaster]:dark:!border-sky-400/25",
          warning:
            "group-[.toaster]:!border-amber-500/35 group-[.toaster]:dark:!border-amber-400/25",
        },
      }}
      {...props}
    />
  );
}

export default Toaster;
