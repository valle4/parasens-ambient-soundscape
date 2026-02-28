import { useRef, useState } from "react";
import html2canvas from "html2canvas";

interface LogoVariant {
  name: string;
  description: string;
  width: number;
  height: number;
  filename: string;
  bgClass: string;
  showOrbs: boolean;
  textClass: string;
}

const variants: LogoVariant[] = [
  {
    name: "Dark Master",
    description: "Full atmosphere with orb backgrounds",
    width: 3840,
    height: 2160,
    filename: "parasens-dark-master.png",
    bgClass: "bg-background",
    showOrbs: true,
    textClass: "text-gradient",
  },
  {
    name: "Transparent",
    description: "No background, gradient text only",
    width: 3840,
    height: 2160,
    filename: "parasens-transparent.png",
    bgClass: "",
    showOrbs: false,
    textClass: "text-gradient",
  },
  {
    name: "Light",
    description: "White background variant",
    width: 3840,
    height: 2160,
    filename: "parasens-light.png",
    bgClass: "",
    showOrbs: false,
    textClass: "",
  },
  {
    name: "Square",
    description: "Square format for social & avatars",
    width: 2160,
    height: 2160,
    filename: "parasens-square.png",
    bgClass: "bg-background",
    showOrbs: true,
    textClass: "text-gradient",
  },
];

const LogoRender = ({
  variant,
  captureRef,
}: {
  variant: LogoVariant;
  captureRef: React.Ref<HTMLDivElement>;
}) => {
  const isLight = variant.name === "Light";
  const isTransparent = variant.name === "Transparent";
  const aspectRatio = variant.width / variant.height;

  return (
    <div
      ref={captureRef}
      className={`relative overflow-hidden ${variant.bgClass}`}
      style={{
        aspectRatio: `${aspectRatio}`,
        width: "100%",
        backgroundColor: isLight
          ? "#FAFAFA"
          : isTransparent
          ? "transparent"
          : undefined,
      }}
    >
      {/* Orb backgrounds - matching site exactly */}
      {variant.showOrbs && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 100% 80% at 50% 0%, hsla(260, 80%, 8%, 0.6) 0%, transparent 50%),
                radial-gradient(ellipse 80% 50% at 10% 30%, hsla(280, 70%, 12%, 0.5) 0%, transparent 45%),
                radial-gradient(ellipse 60% 40% at 90% 20%, hsla(220, 60%, 10%, 0.4) 0%, transparent 45%),
                radial-gradient(ellipse 70% 60% at 75% 75%, hsla(300, 50%, 10%, 0.45) 0%, transparent 50%),
                radial-gradient(ellipse 50% 50% at 5% 85%, hsla(240, 60%, 8%, 0.5) 0%, transparent 45%),
                radial-gradient(ellipse 40% 35% at 50% 50%, hsla(270, 40%, 6%, 0.3) 0%, transparent 50%)
              `,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(circle 400px at 20% 60%, hsla(260, 50%, 15%, 0.25) 0%, transparent 70%),
                radial-gradient(circle 300px at 80% 40%, hsla(200, 40%, 12%, 0.2) 0%, transparent 70%),
                radial-gradient(circle 250px at 60% 90%, hsla(280, 45%, 10%, 0.25) 0%, transparent 70%)
              `,
            }}
          />
          {/* Vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 20%, hsla(0, 0%, 0%, 0.4) 100%)",
            }}
          />
        </>
      )}

      {/* Logo text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p
          className="text-xs tracking-[0.3em] uppercase mb-4"
          style={{
            color: isLight ? "#666" : "hsl(0 0% 55%)",
            fontSize: "clamp(0.5rem, 1.2vw, 0.875rem)",
          }}
        >
          Mood Music Management
        </p>
        <h1
          className={`font-display font-bold leading-[1.1] tracking-tight ${variant.textClass}`}
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: "clamp(2rem, 8vw, 6rem)",
            ...(isLight
              ? {
                  background:
                    "linear-gradient(135deg, #222 0%, #555 25%, #222 50%, #666 75%, #333 100%)",
                  backgroundSize: "200% 200%",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }
              : {}),
          }}
        >
          PARASENS
        </h1>
        <p
          className="mt-3 text-xs tracking-[0.2em] uppercase font-light"
          style={{
            color: isLight ? "#999" : "hsl(0 0% 55% / 0.6)",
            fontSize: "clamp(0.4rem, 1vw, 0.75rem)",
          }}
        >
          set the tone
        </p>
      </div>
    </div>
  );
};

const LogosPage = () => {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const [downloading, setDownloading] = useState<number | null>(null);

  const handleDownload = async (index: number, variant: LogoVariant) => {
    const el = refs.current[index];
    if (!el) return;

    setDownloading(index);
    try {
      const scale = variant.width / el.offsetWidth;
      const canvas = await html2canvas(el, {
        scale,
        useCORS: true,
        backgroundColor:
          variant.name === "Transparent"
            ? null
            : variant.name === "Light"
            ? "#FAFAFA"
            : "#0A0A0A",
        width: el.offsetWidth,
        height: el.offsetHeight,
      });

      const link = document.createElement("a");
      link.download = variant.filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-display text-3xl font-bold text-gradient mb-2">
          Logo Assets
        </h1>
        <p className="text-muted-foreground text-sm mb-12">
          Download pixel-perfect PNG logos rendered with the site's actual CSS.
        </p>

        <div className="space-y-12">
          {variants.map((variant, i) => (
            <div key={variant.name}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    {variant.name}
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    {variant.description} · {variant.width}×{variant.height}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(i, variant)}
                  disabled={downloading === i}
                  className="button-minimal text-xs"
                >
                  {downloading === i ? "Exporting…" : "Download PNG"}
                </button>
              </div>

              <div className="border border-border rounded overflow-hidden">
                <LogoRender
                  variant={variant}
                  captureRef={(el) => {
                    refs.current[i] = el;
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LogosPage;
