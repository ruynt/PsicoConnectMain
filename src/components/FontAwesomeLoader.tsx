"use client";

import { useEffect } from "react";

const FONT_AWESOME_ID = "font-awesome-cdn-stylesheet";
const FONT_AWESOME_HREF =
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css";

export default function FontAwesomeLoader() {
  useEffect(() => {
    if (document.getElementById(FONT_AWESOME_ID)) return;

    const link = document.createElement("link");
    link.id = FONT_AWESOME_ID;
    link.rel = "stylesheet";
    link.href = FONT_AWESOME_HREF;
    link.crossOrigin = "anonymous";

    document.head.appendChild(link);
  }, []);

  return null;
}
