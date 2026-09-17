"use client";

import { cx } from "@/lib/format";

/**
 * HelloFit / هلوفیت brand mark — a leaf-and-pulse monogram.
 * The same geometry is used for the PWA icons and the TWA splash.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="14" fill="url(#hf-grad)" />
      <path
        d="M34 13c0 9.5-5.6 16-13.5 16C17 29 15 27.4 15 24.6 15 18.6 22.6 13.6 34 13Z"
        fill="#fff"
        fillOpacity="0.95"
      />
      <path
        d="M13 36c2.2-5.4 6-9.6 11.5-12.4"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M9 30.5h5.2l2-4.2 2.8 8 2.4-5.2h4.6"
        stroke="#ECFDF5"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />
      <defs>
        <linearGradient id="hf-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#059669" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function BrandLockup({
  size = 32,
  showLatin = true,
  className,
}: {
  size?: number;
  showLatin?: boolean;
  className?: string;
}) {
  return (
    <span className={cx("flex items-center gap-2", className)}>
      <LogoMark size={size} />
      <span className="flex flex-col leading-none">
        <span className="text-[0.95rem] font-extrabold tracking-tight text-ink">هلوفیت</span>
        {showLatin && (
          <span className="mt-0.5 text-[0.6rem] font-medium tracking-wide text-primary-600">
            HelloFit
          </span>
        )}
      </span>
    </span>
  );
}
