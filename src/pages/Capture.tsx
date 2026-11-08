import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { Button, Field, Notice } from "../components/ui";
import { useLocale } from "../i18n";
import { useCart } from "../state";
import type { Product } from "../../shared/types";

type DraftLine = {
  source: string;
  candidates: Product[];
  quantity: number | null;
  unit: "case" | "piece" | "unknown";
  confidence: "high" | "medium" | "low";
};

export function Capture() {
  const { locale } = useLocale();
  const copy = (en: string, hi: string) => (locale === "hi" ? hi : en);
  const { items, setCount } = useCart();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lines, setLines] = useState<(DraftLine | null)[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [choices, setChoices] = useState<
    Record<number, { sku: string; cases: string }>
  >({});

  async function extract() {
    setBusy(true);
    setError("");
    setLines([]);
    setChoices({});
    try {
      const result = await api<{ lines: DraftLine[]; products: Product[] }>(
        "/capture",
        {
          method: "POST",
          body: JSON.stringify({ message: message.trim() }),
        },
        65_000,
      );
      setLines(result.lines);
      setProducts(result.products);
      if (!result.lines.length)
        setError(copy("No order lines found.", "कोई ऑर्डर आइटम नहीं मिला।"));
    } catch (error) {
      setError(
        error instanceof ApiError && error.code === "CAPTURE_DISABLED"
          ? copy(
              "Order capture is unavailable. You can still order from the catalogue.",
              "ऑर्डर कैप्चर उपलब्ध नहीं है। कैटलॉग से ऑर्डर करें।",
            )
          : copy(
              "Could not read the message. Try again or use the catalogue.",
              "संदेश पढ़ा नहीं जा सका। फिर कोशिश करें या कैटलॉग खोलें।",
            ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <div className="page-heading">
        <h1 tabIndex={-1}>
          {copy("Review a message order", "संदेश से ऑर्डर की समीक्षा")}
        </h1>
      </div>
      <Link to="/catalogue">{copy("Back to catalogue", "कैटलॉग पर वापस")}</Link>
      <form
        className="capture-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void extract();
        }}
      >
        <label htmlFor="order-message">
          {copy(
            "Paste the retailer's order message",
            "दुकानदार का ऑर्डर संदेश पेस्ट करें",
          )}
        </label>
        <textarea
          className="resize-none"
          id="order-message"
          rows={5}
          maxLength={3000}
          value={message}
          disabled={busy}
          onChange={(event) => {
            setMessage(event.target.value);
            setLines([]);
            setChoices({});
            setError("");
          }}
        />
        <Button busy={busy} disabled={!message.trim()}>
          {copy("Read message", "संदेश पढ़ें")}
        </Button>
      </form>
      {error && <Notice tone="error">{error}</Notice>}
      {lines.map((line, index) => {
        if (!line) return null;
        const choice = choices[index] ?? { sku: "", cases: "" };
        const options = [
          ...line.candidates,
          ...products.filter(
            (p) => !line.candidates.some((candidate) => candidate.id === p.id),
          ),
        ];
        const product = options.find((p) => p.id === choice.sku);
        const count = Number(choice.cases);
        const current =
          items.find((item) => item.sku === choice.sku)?.cases ?? 0;
        const total = current + count;
        const stockNeeded =
          total + (product?.scheme === "free10" ? Math.floor(total / 10) : 0);
        const valid =
          product &&
          Number.isInteger(count) &&
          count > 0 &&
          total <= 1000 &&
          stockNeeded <= product.stock;
        return (
          <fieldset className="capture-form" key={index}>
            <legend>{line.source}</legend>
            <p>
              {copy("Model suggestion", "मॉडल का सुझाव")} ·{" "}
              {line.quantity ?? "—"} ·{" "}
              {line.unit === "unknown"
                ? copy("Unit needs review", "इकाई जाँचें")
                : line.unit === "case"
                  ? copy("Cases", "पेटियाँ")
                  : copy("Pieces", "पीस")}{" "}
              ·{" "}
              {line.confidence === "high"
                ? copy("High confidence", "अधिक भरोसा")
                : line.confidence === "medium"
                  ? copy("Medium confidence", "मध्यम भरोसा")
                  : copy("Low confidence", "कम भरोसा")}
            </p>
            <label htmlFor={`capture-sku-${index}`}>
              {copy("Choose product", "उत्पाद चुनें")}
            </label>
            <select
              id={`capture-sku-${index}`}
              value={choice.sku}
              onChange={(event) =>
                setChoices({
                  ...choices,
                  [index]: { ...choice, sku: event.target.value },
                })
              }
            >
              <option value="">
                {copy("Select a match", "मिलता उत्पाद चुनें")}
              </option>
              {options.map((p) => (
                <option key={p.id} value={p.id} disabled={!p.stock}>
                  {line.candidates.some((candidate) => candidate.id === p.id)
                    ? copy("Suggested: ", "सुझाव: ")
                    : ""}
                  {locale === "hi" ? p.nameHi : p.name} · {p.size} ·{" "}
                  {p.stock
                    ? `${p.stock} ${copy("cases available", "पेटियाँ उपलब्ध")}`
                    : copy("Out of stock", "स्टॉक नहीं है")}
                </option>
              ))}
            </select>
            <Field
              id={`capture-cases-${index}`}
              label={copy(
                "Confirm whole cases",
                "पूरी पेटियों की संख्या की पुष्टि करें",
              )}
              inputMode="numeric"
              value={choice.cases}
              onChange={(event) =>
                setChoices({
                  ...choices,
                  [index]: { ...choice, cases: event.target.value },
                })
              }
            />
            <Button
              disabled={!valid}
              onClick={() => {
                setCount(choice.sku, total);
                setLines(lines.map((entry, i) => (i === index ? null : entry)));
              }}
            >
              {copy("Add to cart", "कार्ट में जोड़ें")}
            </Button>
          </fieldset>
        );
      })}
      <Link to="/cart">{copy("Review cart", "कार्ट देखें")}</Link>
    </section>
  );
}
