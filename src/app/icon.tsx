import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 30% 24%, rgba(169,244,49,0.6), transparent 24%), radial-gradient(circle at 72% 22%, rgba(55,214,255,0.45), transparent 24%), linear-gradient(140deg, #08111a, #0a1930 48%, #0f2f61)",
          color: "#f5fbff",
          fontSize: 138,
          fontWeight: 700,
          letterSpacing: "-0.08em",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 320,
            height: 320,
            borderRadius: 96,
            border: "12px solid rgba(255,255,255,0.2)",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 50px rgba(0,0,0,0.28)",
            background:
              "linear-gradient(135deg, rgba(167,236,56,0.18), rgba(57,214,255,0.14) 46%, rgba(23,97,242,0.18))",
          }}
        >
          CA
        </div>
      </div>
    ),
    size,
  );
}
