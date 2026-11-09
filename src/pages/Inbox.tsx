import { useState } from "react";
import { Link } from "react-router-dom";
import { api, useResource } from "../api";
import { Button, Field, Notice, Loading } from "../components/ui";
import { useLocale } from "../i18n";
import type { Product, Quote } from "../../shared/types";

type Message = {
  id: string;
  message: string;
  orderId: string | null;
  dismissed: number;
};
type InboxData = {
  messages: Message[];
  retailers: { id: string; shop: string }[];
  simulation: boolean;
};
type Draft = {
  products: Product[];
  lines: {
    source: string;
    candidates: Product[];
    quantity: number | null;
    unit: string;
    confidence: string;
  }[];
};
const sample =
  "bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, chai patti 250 wala 1 peti";
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Try again.";

export function Inbox() {
  const { locale } = useLocale();
  const l = (en: string, hi: string) => (locale === "hi" ? hi : en);
  const inbox = useResource<InboxData>("/inbox");
  const [message, setMessage] = useState(sample);
  const [id, setId] = useState(() => crypto.randomUUID());
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = inbox.data?.messages.find((row) => row.id === selected);
  async function simulate() {
    setBusy(true);
    setError("");
    try {
      await api("/inbox", {
        method: "POST",
        body: JSON.stringify({ id, message }),
      });
      setSelected(id);
      setId(crypto.randomUUID());
      inbox.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <h1 tabIndex={-1}>{l("Message inbox", "संदेश इनबॉक्स")}</h1>
          <p>
            {l(
              "Review incoming orders and confirm them for a retailer.",
              "आए हुए संदेशों की समीक्षा करें और दुकानदार के लिए ऑर्डर की पुष्टि करें।",
            )}
          </p>
        </div>
      </div>
      {inbox.error ? (
        <Notice tone="error">
          {errorText(inbox.error)}{" "}
          <Button variant="ghost" onClick={inbox.reload}>
            {l("Try again", "फिर कोशिश करें")}
          </Button>
        </Notice>
      ) : null}
      {inbox.data?.simulation && (
        <form
          className="capture-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void simulate();
          }}
        >
          <label htmlFor="sim-message">
            {l("Simulated WhatsApp text", "नकली WhatsApp संदेश")}
          </label>
          <textarea
            className="resize-none"
            id="sim-message"
            rows={3}
            value={message}
            maxLength={3000}
            disabled={busy}
            onChange={(event) => {
              setMessage(event.target.value);
              setId(crypto.randomUUID());
            }}
          />
          <Button busy={busy} disabled={!message.trim()}>
            {l("Simulate incoming message", "आने वाला संदेश बनाएँ")}
          </Button>
          {error && <Notice tone="error">{error}</Notice>}
        </form>
      )}
      {inbox.loading && <Loading />}
      {inbox.data && !inbox.data.messages.length && (
        <Notice>{l("No messages yet.", "अभी कोई संदेश नहीं है।")}</Notice>
      )}
      {inbox.data && inbox.data.messages.length > 0 && (
        <div className="detail-panel">
          <h2>{l("Recent messages", "हाल के संदेश")}</h2>
          {inbox.data.messages.map((row) => (
            <div className="capture-form" key={row.id}>
              <p className="inbox-message-text">{row.message}</p>
              {row.orderId ? (
                <Link to={`/orders/${row.orderId}`}>
                  {l("View confirmed order", "पुष्टि किया ऑर्डर देखें")} ·{" "}
                  {row.orderId}
                </Link>
              ) : row.dismissed ? (
                <span>{l("Dismissed", "खारिज किया गया")}</span>
              ) : (
                <Button
                  variant="secondary"
                  aria-pressed={selected === row.id}
                  onClick={() => setSelected(row.id)}
                >
                  {l("Review message", "संदेश की समीक्षा")}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {active && !active.orderId && !active.dismissed && (
        <MessageReview
          key={active.id}
          message={active}
          retailers={inbox.data!.retailers}
          onResolved={inbox.reload}
        />
      )}
    </section>
  );
}

function MessageReview({
  message,
  retailers,
  onResolved,
}: {
  message: Message;
  retailers: InboxData["retailers"];
  onResolved: () => void;
}) {
  const { locale, money } = useLocale();
  const l = (en: string, hi: string) => (locale === "hi" ? hi : en);
  const [retailerId, setRetailerId] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [choices, setChoices] = useState<
    { sku: string; cases: string; skip: boolean }[]
  >([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const combined = new Map<string, number>();
  for (const item of choices) {
    if (!item.skip && item.sku && /^[1-9]\d{0,3}$/.test(item.cases))
      combined.set(
        item.sku,
        (combined.get(item.sku) ?? 0) + Number(item.cases),
      );
  }
  const items = Array.from(combined, ([sku, cases]) => ({ sku, cases }));
  const ready =
    items.length > 0 &&
    items.every((i) => i.cases <= 1000) &&
    choices.every(
      (item) => item.skip || (item.sku && /^[1-9]\d{0,3}$/.test(item.cases)),
    );
  function edit(index: number, change: Partial<(typeof choices)[number]>) {
    setQuote(null);
    setChoices((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...change } : row)),
    );
  }
  async function action(task: "draft" | "quote" | "confirm" | "dismiss") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const path = `/inbox/${message.id}/${task}`;
      if (task === "draft") {
        setDraft(null);
        setChoices([]);
        setQuote(null);
        const result = await api<Draft>(
          path,
          { method: "POST", body: JSON.stringify({ retailerId }) },
          65_000,
        );
        setDraft(result);
        setChoices(
          result.lines.map((line) => ({
            sku: line.candidates[0]?.id ?? "",
            cases:
              line.unit === "case" && line.quantity
                ? String(line.quantity)
                : "",
            skip: false,
          })),
        );
      } else if (task === "quote") {
        setQuote(
          await api<Quote>(path, {
            method: "POST",
            body: JSON.stringify({ retailerId, items }),
          }),
        );
      } else {
        await api(path, {
          method: "POST",
          body: JSON.stringify(
            task === "confirm"
              ? { retailerId, items, expectedTotalPaise: quote!.totalPaise }
              : {},
          ),
        });
        onResolved();
      }
    } catch (e) {
      if (task === "confirm") setQuote(null);
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="detail-panel"
      aria-label={l("Review incoming message", "संदेश की समीक्षा")}
    >
      <h2>{l("Review incoming message", "संदेश की समीक्षा")}</h2>
      <p className="inbox-message-text">{message.message}</p>
      <div className="capture-form">
        <label htmlFor="inbox-retailer">{l("Retailer", "दुकानदार")}</label>
        <select
          id="inbox-retailer"
          value={retailerId}
          disabled={busy}
          onChange={(event) => {
            setRetailerId(event.target.value);
            setDraft(null);
            setChoices([]);
            setQuote(null);
            setError("");
          }}
        >
          <option value="">{l("Choose retailer", "दुकानदार चुनें")}</option>
          {retailers.map((retailer) => (
            <option key={retailer.id} value={retailer.id}>
              {retailer.shop}
            </option>
          ))}
        </select>
        <Button
          busy={busy}
          disabled={!retailerId}
          onClick={() => action("draft")}
        >
          {l("Draft from message", "संदेश से ड्राफ्ट बनाएँ")}
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => action("dismiss")}
        >
          {l("Dismiss message", "संदेश खारिज करें")}
        </Button>
      </div>
      {draft?.lines.map((line, index) => {
        const choice = choices[index];
        const product = draft.products.find((p) => p.id === choice.sku);
        return (
          <fieldset key={index} className="capture-form" disabled={busy}>
            <legend>{line.source}</legend>
            <p>
              {l("Model confidence", "मॉडल का भरोसा")} · {line.confidence}
            </p>
            <label>
              <input
                type="checkbox"
                checked={choice.skip}
                onChange={(event) =>
                  edit(index, { skip: event.target.checked })
                }
              />{" "}
              {l("Skip this line", "इस पंक्ति को छोड़ें")}
            </label>
            <label htmlFor={`inbox-product-${index}`}>
              {l("Product", "उत्पाद")}
            </label>
            <select
              id={`inbox-product-${index}`}
              value={choice.sku}
              disabled={choice.skip}
              onChange={(event) => edit(index, { sku: event.target.value })}
            >
              <option value="">{l("Choose product", "उत्पाद चुनें")}</option>
              {draft.products.map((p) => (
                <option key={p.id} value={p.id} disabled={!p.stock}>
                  {locale === "hi" ? p.nameHi : p.name} · {p.size}
                  {line.candidates.some((c) => c.id === p.id)
                    ? l(" · Suggested", " · सुझाव")
                    : ""}
                  {!p.stock ? l(" · Out of stock", " · स्टॉक नहीं") : ""}
                </option>
              ))}
            </select>
            <Field
              id={`inbox-cases-${index}`}
              label={l("Whole cases", "पूरी पेटियाँ")}
              inputMode="numeric"
              maxLength={4}
              disabled={choice.skip}
              value={choice.cases}
              onChange={(event) => edit(index, { cases: event.target.value })}
            />
            {product?.stock === 0 && !choice.skip && (
              <Notice>
                {l(
                  "Out of stock. Choose another product or skip this line.",
                  "स्टॉक नहीं है। दूसरा उत्पाद चुनें या पंक्ति छोड़ें।",
                )}
              </Notice>
            )}
          </fieldset>
        );
      })}
      {draft && !draft.lines.length && (
        <Notice>
          {l("No order items were found.", "कोई ऑर्डर आइटम नहीं मिला।")}
        </Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {draft && (
        <Button busy={busy} disabled={!ready} onClick={() => action("quote")}>
          {l("Review price and stock", "कीमत और स्टॉक जाँचें")}
        </Button>
      )}
      {quote && (
        <div className="capture-form">
          <h3>{l("Confirm this order", "इस ऑर्डर की पुष्टि करें")}</h3>
          {quote.lines.map((line) => (
            <p key={line.sku}>
              {locale === "hi" ? line.nameHi : line.name} · {line.cases}
              {line.freeCases
                ? ` + ${line.freeCases} ${l("free", "मुफ़्त")}`
                : ""}{" "}
              · {money(line.totalPaise)}
            </p>
          ))}
          <strong>
            {l("Total", "कुल")} · {money(quote.totalPaise)}
          </strong>
          <Button busy={busy} onClick={() => action("confirm")}>
            {l("Confirm and create order", "पुष्टि करके ऑर्डर बनाएँ")}
          </Button>
        </div>
      )}
    </section>
  );
}
