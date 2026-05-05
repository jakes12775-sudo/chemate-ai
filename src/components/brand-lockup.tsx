import Image from "next/image";

type BrandLockupProps = {
  compact?: boolean;
  showMeta?: boolean;
};

export function BrandLockup({
  compact = false,
  showMeta = false,
}: BrandLockupProps) {
  return (
    <div className={`flex ${compact ? "items-center gap-4" : "flex-col gap-5"}`}>
      <div className="inline-flex items-center rounded-[30px] border border-white/12 bg-white/6 px-4 py-3 shadow-[0_20px_60px_rgba(4,113,255,0.16)] backdrop-blur-xl">
        <Image
          src="/brand/chemate-logo.png"
          alt="Chemate AI"
          width={1024}
          height={1024}
          priority
          className={
            compact
              ? "h-16 w-auto object-contain"
              : "h-24 w-auto object-contain md:h-28"
          }
        />
      </div>

      <div className="space-y-2">
        <div>
          <p className="eyebrow">Chemate AI</p>
          <h1
            className={`mt-3 font-semibold tracking-tight text-ink ${
              compact ? "text-2xl" : "text-3xl md:text-5xl"
            }`}
          >
            Your chemistry study OS.
          </h1>
        </div>

        {showMeta ? (
          <div className="grid gap-2 text-sm leading-6 text-ink-soft md:grid-cols-2">
            <p>Upload. Ask. Revise. Predict.</p>
            <p>Notes first. Citations included.</p>
            <p>Labs, groups, and study tracking in one place.</p>
            <p>Built for Kenyan students and ready to grow globally.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
