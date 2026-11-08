import type { Product } from "../../shared/types";

/** Original fictional packaging, drawn locally; no third-party brand imagery. */
export function ProductArt({
  product,
}: {
  product: Pick<Product, "art" | "brand" | "size">;
}) {
  const colours = {
    biscuit: ["#f2ca64", "#b94525", "#ffe9ad"],
    detergent: ["#dcebef", "#245e8b", "#ffffff"],
    tea: ["#3c7052", "#f6d98b", "#26513d"],
    soap: ["#9ccad0", "#155766", "#e3f4ee"],
    rice: ["#dfceb0", "#643b28", "#fbf5e6"],
  };
  const [base, ink, light] = colours[product.art];
  return (
    <svg
      viewBox="0 0 260 180"
      aria-hidden="true"
      focusable="false"
      className={`product-art art-${product.art}`}
    >
      <ellipse cx="131" cy="158" rx="61" ry="8" fill="#203b30" opacity=".08" />
      <path
        d="M85 23 L175 23 L182 151 Q132 164 78 151 Z"
        fill={base}
        stroke={ink}
        strokeOpacity=".18"
      />
      <path
        d="M85 23H175L176 32H84Z M79 145L181 145L182 151Q130 162 78 151Z"
        fill={ink}
        opacity=".3"
      />
      <path d="M87 37Q130 45 173 37V78Q130 88 84 78Z" fill={light} />
      <text
        x="130"
        y="61"
        textAnchor="middle"
        fill={ink}
        fontFamily="sans-serif"
        fontSize={product.brand.length > 8 ? 11 : 16}
        fontWeight="800"
      >
        {product.brand.toUpperCase()}
      </text>
      {product.art === "biscuit" ? (
        <g fill="#cf903a" stroke="#ab6e24" strokeWidth="2">
          <rect
            x="96"
            y="92"
            width="65"
            height="31"
            rx="8"
            transform="rotate(-10 130 108)"
          />
          <rect
            x="97"
            y="105"
            width="65"
            height="31"
            rx="8"
            transform="rotate(10 130 120)"
          />
          <path d="M108 113h42m-40 7h38m-35 7h32" opacity=".5" />
        </g>
      ) : product.art === "detergent" ? (
        <g fill={ink}>
          <circle cx="130" cy="111" r="25" fill={light} />
          <path d="M110 109L130 91l21 18-9 7-3-6v24h-18v-24l-3 6Z" />
          <path d="M162 87v12m-6-6h12" stroke={ink} strokeWidth="2" />
        </g>
      ) : product.art === "soap" ? (
        <g>
          <rect x="97" y="94" width="66" height="37" rx="16" fill={light} />
          <circle cx="155" cy="88" r="6" fill={light} />
          <circle cx="170" cy="99" r="4" fill={light} />
          <path d="M114 113h30" stroke={ink} strokeWidth="3" />
        </g>
      ) : (
        <g stroke={light} strokeWidth="2.5" fill={light}>
          <path d="M130 134V91" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <ellipse
                cx="121"
                cy={100 + i * 11}
                rx="9"
                ry="3"
                transform={`rotate(30 121 ${100 + i * 11})`}
              />
              <ellipse
                cx="139"
                cy={97 + i * 11}
                rx="9"
                ry="3"
                transform={`rotate(-30 139 ${97 + i * 11})`}
              />
            </g>
          ))}
        </g>
      )}
      <text
        x="130"
        y="146"
        textAnchor="middle"
        fill={ink}
        fontFamily="sans-serif"
        fontSize="9"
        fontWeight="700"
      >
        {product.size.toUpperCase()}
      </text>
    </svg>
  );
}
