import type { CSSProperties } from "react";

type PsicoInlineSkeletonProps = {
  rows?: number;
  minHeight?: number;
};

const wrapperStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "16px",
  backgroundColor: "#f8fafc",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

function SkeletonLine({
  width,
  height = "12px",
}: {
  width: string;
  height?: string;
}) {
  return (
    <span
      className="psico-inline-skeleton-line"
      style={{
        display: "block",
        width,
        height,
        borderRadius: "999px",
      }}
    />
  );
}

export default function PsicoInlineSkeleton({
  rows = 3,
  minHeight = 120,
}: PsicoInlineSkeletonProps) {
  return (
    <div aria-hidden="true" style={{ ...wrapperStyle, minHeight }}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={`psico-inline-skeleton-${index}`}
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "12px",
            backgroundColor: "#ffffff",
          }}
        >
          <SkeletonLine width={index % 2 === 0 ? "62%" : "48%"} height="14px" />
          <div style={{ height: "9px" }} />
          <SkeletonLine width="88%" />
          <div style={{ height: "7px" }} />
          <SkeletonLine width={index % 2 === 0 ? "54%" : "70%"} />
        </div>
      ))}

      <style jsx>{`
        .psico-inline-skeleton-line {
          background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 42%, #e2e8f0 84%);
          background-size: 220% 100%;
          animation: psicoInlineSkeletonShimmer 1.35s ease-in-out infinite;
        }

        @keyframes psicoInlineSkeletonShimmer {
          0% {
            background-position: 120% 0;
          }

          100% {
            background-position: -120% 0;
          }
        }
      `}</style>
    </div>
  );
}
