"use client";

import { cx } from "@/lib/format";

/**
 * HelloFit / هلوفیت brand mark — the hexagonal H monogram in brand coral,
 * split by a diagonal highlight.
 *
 * Traced from the supplied Figma PDF by `scripts/pdf-logo-to-svg.mjs`; the
 * same geometry drives the PWA icons via `scripts/generate-icons.mjs`. Do not
 * hand-edit the path data — re-run the converter instead.
 */
export function LogoMark({
  size = 32,
  color = "#FF5252",
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={(size * 18.0) / 20.202}
      height={size}
      viewBox="39.000 -0.101 18.000 20.202"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M53.171 17.284L56.298 15.509C56.3 15.507 56.303 15.506 56.305 15.504L56.788 15.029C56.938 14.789 56.991 14.518 57 14.186L57 10L57 8.908L57 5.686C56.987 5.521 56.96 5.376 56.918 5.248C56.796 4.881 56.552 4.648 56.187 4.427L52.501 2.334L49.588 0.68L45.477 4.936L45.477 8.758L50.525 8.758L50.525 5.655L53.05 5.655L53.05 12.794L46.415 19.32L47.299 19.822C47.889 20.101 48.306 20.03 48.815 19.759L52.501 17.665L53.171 17.284Z"
        fill={color}
        fillRule="evenodd"
        clipRule="evenodd"
      />
      <path
        d="M42.95 7.208L45.475 4.725L49.587 0.681L48.701 0.178C48.112 -0.101 47.695 -0.03 47.186 0.241L43.5 2.334L42.829 2.715L39.702 4.491C39.161 4.854 39.016 5.245 39 5.814L39 10L39 11.093L39 14.313C39.013 14.479 39.04 14.623 39.083 14.751C39.204 15.118 39.448 15.351 39.814 15.572L43.5 17.665L46.413 19.32L50.524 14.936L50.524 11.241L45.475 11.241L45.475 14.345L42.95 14.345L42.95 7.208Z"
        fill={color}
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Mark + Persian wordmark, as used in the app header and the admin/specialist
 * consoles. `inverse` swaps to the white-wordmark cut for dark surfaces.
 */
export function BrandLockup({
  size = 28,
  inverse = false,
  showLatin = false,
  className,
}: {
  size?: number;
  inverse?: boolean;
  showLatin?: boolean;
  className?: string;
}) {
  return (
    <span className={cx("flex items-center gap-2", className)}>
      {/* Traced SVG asset — next/image adds nothing for vector artwork. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={inverse ? "/brand/hellofit-logo-inverse.svg" : "/brand/hellofit-logo.svg"}
        alt="هلوفیت — HelloFit"
        style={{ height: size, width: "auto" }}
        className="shrink-0"
      />
      {showLatin && (
        <span className="text-[0.6rem] font-medium tracking-wide text-ink-soft">HelloFit</span>
      )}
    </span>
  );
}
