export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#f8fbff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div className="psico-simple-loader">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}