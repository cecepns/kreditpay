import logoHorizontal from "@/assets/logo-horizontal.png";
import logoStacked from "@/assets/logo.png";
import logoIcon from "@/assets/logo-icon.png";

export default function Logo({
  size = "md",
  variant = "horizontal", // "horizontal" | "stacked" | "icon"
  className = "",
  alt = "Fastkredit",
}) {
  const horizontalHeights = {
    xs: "h-6",
    sm: "h-8 sm:h-9",
    md: "h-9 sm:h-10",
    lg: "h-12 sm:h-14",
    xl: "h-16 sm:h-20",
  };

  const stackedHeights = {
    xs: "h-9",
    sm: "h-12 sm:h-14",
    md: "h-16 sm:h-20",
    lg: "h-24 sm:h-28",
    xl: "h-32 sm:h-36",
  };

  const iconSizes = {
    xs: "h-6 w-6",
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
    xl: "h-20 w-20",
  };

  if (variant === "icon") {
    const s = iconSizes[size] || iconSizes.md;
    return (
      <span className={`inline-flex items-center select-none ${className}`}>
        <img
          src={logoIcon}
          alt={alt}
          className={`${s} object-contain transition hover:opacity-95`}
        />
      </span>
    );
  }

  if (variant === "stacked") {
    const h = stackedHeights[size] || stackedHeights.md;
    return (
      <span className={`inline-flex items-center select-none ${className}`}>
        <img
          src={logoStacked}
          alt={alt}
          className={`${h} w-auto object-contain transition hover:opacity-95`}
        />
      </span>
    );
  }

  // Default: horizontal (monogram on left, text on right)
  const h = horizontalHeights[size] || horizontalHeights.md;
  return (
    <span className={`inline-flex items-center select-none ${className}`}>
      <img
        src={logoHorizontal}
        alt={alt}
        className={`${h} w-auto object-contain transition hover:opacity-95`}
      />
    </span>
  );
}
