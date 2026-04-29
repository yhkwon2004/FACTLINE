export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="12" fill="#111827"/>
    <path d="M17 18h30v7H25v8h18v7H25v15h-8V18z" fill="#ffffff"/>
  </svg>`;

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

