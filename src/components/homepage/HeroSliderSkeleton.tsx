/**
 * The hero's placeholder while its banners are still on the way.
 *
 * It wears exactly the same frame as the real slider — the same rounded box and
 * the same aspect ratio (960×600 on phones, 1920×700 on wider screens) — so the
 * page never jumps when the banners arrive. It is used as the homepage's
 * Suspense fallback, which is why it must not be shorter than the banner itself.
 */
export default function HeroSliderSkeleton() {
  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-alt)] aspect-[960/600] sm:aspect-[1920/700]">
        {/* Sweeping shimmer across the whole frame */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Ghost title, subtitle and CTA, in the same place the real copy sits */}
        <div className="absolute left-6 sm:left-10 md:left-14 bottom-10 md:bottom-16 w-2/3 max-w-md space-y-3">
          <div className="h-7 md:h-10 w-3/4 rounded-lg bg-[var(--foreground)]/10" />
          <div className="h-3 w-1/2 rounded bg-[var(--foreground)]/10" />
          <div className="h-9 w-32 rounded-full bg-[var(--foreground)]/10" />
        </div>
      </div>
    </div>
  );
}
