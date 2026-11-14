import Image from "next/image";
export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Image
      className="brand"
      src={compact ? "/brand/mascot.png" : "/brand/logo.png"}
      alt="Token Doctor"
      width={compact ? 38 : 174}
      height={compact ? 40 : 67}
      priority
    />
  );
}
export function MascotAssistant({ size = 56 }: { size?: number }) {
  return (
    <Image
      className="mascot"
      src="/brand/mascot.png"
      alt=""
      width={size}
      height={size}
    />
  );
}
