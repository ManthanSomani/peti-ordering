import { useState } from "react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import type { Order, Page, Status, User } from "../../shared/types";
import { api, useResource } from "../api";
import { useLocale } from "../i18n";
import {
  Button,
  EmptyState,
  ErrorNotice,
  Field,
  Loading,
  Notice,
  StatusBadge,
} from "../components/ui";
export function Orders({ user }: { user: User }) {
  const { t, locale, money } = useLocale();
  const [params, setParams] = useSearchParams();
  const r = useResource<Page<Order>>(`/orders?${params}`);
  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {t(user.role === "desk" ? "desk" : "orders")}
          </span>
          <h1 tabIndex={-1}>
            {t(user.role === "desk" ? "deskTitle" : "ordersTitle")}
          </h1>
          <p>{t(user.role === "desk" ? "deskIntro" : "ordersIntro")}</p>
        </div>
        <Button variant="secondary" onClick={r.reload} busy={r.loading}>
          <RefreshCw size={16} />
          {t("refresh")}
        </Button>
      </div>
      <div className="filter-row order-filters">
        {(
          ["all", "confirmed", "processing", "packed", "cancelled"] as const
        ).map((s) => (
          <button
            key={s}
            className={`filter-chip ${(params.get("status") ?? "all") === s ? "selected" : ""}`}
            aria-pressed={(params.get("status") ?? "all") === s}
            onClick={() => setParams({ status: s, page: "1" })}
          >
            {s === "all" ? t("allStatuses") : t(s)}
          </button>
        ))}
      </div>
      {r.loading ? (
        <Loading />
      ) : r.error ? (
        <ErrorNotice error={r.error} retry={r.reload} />
      ) : !r.data?.items.length ? (
        <EmptyState title={t("noOrders")} body={t("noOrdersBody")}>
          {user.role === "retailer" ? (
            <Link className="button button-primary" to="/catalogue">
              {t("browse")}
            </Link>
          ) : null}
        </EmptyState>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <caption className="sr-only">
                {t(user.role === "desk" ? "desk" : "orders")}
              </caption>
              <thead>
                <tr>
                  <th>{t("order")}</th>
                  {user.role === "desk" ? <th>{t("retailer")}</th> : null}
                  <th>{t("placed")}</th>
                  <th>{t("cases")}</th>
                  <th>{t("total")}</th>
                  <th>{t("status")}</th>
                  <th>
                    <span className="sr-only">{t("view")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {r.data.items.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link className="order-link" to={`/orders/${o.id}`}>
                        {o.id}
                      </Link>
                    </td>
                    {user.role === "desk" ? <td>{o.shop}</td> : null}
                    <td>
                      {new Intl.DateTimeFormat(
                        locale === "hi" ? "hi-IN" : "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Kolkata",
                        },
                      ).format(new Date(o.createdAt))}
                    </td>
                    <td>{o.paidCases + o.freeCases}</td>
                    <td className="money-cell">{money(o.totalPaise)}</td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td>
                      <Link
                        className="icon-link"
                        aria-label={`${t("view")} ${o.id}`}
                        to={`/orders/${o.id}`}
                      >
                        <ArrowRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>
              {r.data.total} {t("orders")} · {t("page")} {r.data.page} /{" "}
              {r.data.pages}
            </span>
            <div>
              <Button
                variant="secondary"
                disabled={r.data.page === 1}
                onClick={() =>
                  setParams({
                    ...Object.fromEntries(params),
                    page: String(r.data!.page - 1),
                  })
                }
              >
                {t("previous")}
              </Button>
              <Button
                variant="secondary"
                disabled={r.data.page === r.data.pages}
                onClick={() =>
                  setParams({
                    ...Object.fromEntries(params),
                    page: String(r.data!.page + 1),
                  })
                }
              >
                {t("next")}
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
export function OrderDetail({ user }: { user: User }) {
  const { id } = useParams();
  const { t, locale, money } = useLocale();
  const location = useLocation();
  const r = useResource<
    Order & { events: { status: Status; createdAt: string }[] }
  >(`/orders/${encodeURIComponent(id ?? "")}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [cancelReview, setCancelReview] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [exporting, setExporting] = useState(false);
  async function downloadExport(orderId: string) {
    setExporting(true);
    setExportError(false);
    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}/export`,
        {
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (
        !response.ok ||
        !response.headers.get("Content-Type")?.startsWith("text/csv")
      )
        throw new Error("Export failed");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `peti-${orderId}-tally-staging.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  }
  async function advance(status: "processing" | "packed" | "cancelled") {
    setBusy(true);
    setError(null);
    try {
      await api(`/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      r.reload();
      setCancelReview(false);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (r.loading)
    return (
      <section className="page">
        <Loading />
      </section>
    );
  if (r.error)
    return (
      <section className="page">
        <Link className="text-link" to="/orders">
          <ArrowLeft size={16} />
          {t("backOrders")}
        </Link>
        <ErrorNotice error={r.error} retry={r.reload} />
      </section>
    );
  const order = r.data!;
  return (
    <section className="page">
      <Link className="text-link" to="/orders">
        <ArrowLeft size={16} />
        {t("backOrders")}
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {t("orderDetails")} · {order.shop}
          </span>
          <h1 tabIndex={-1}>{order.id}</h1>
          <p>
            {new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Kolkata",
            }).format(new Date(order.createdAt))}{" "}
            IST
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      {location.state?.created ? (
        <Notice tone="success">{t("orderSuccess")}</Notice>
      ) : null}
      <div className="detail-layout">
        <section className="detail-panel">
          <h2>{t("breakdown")}</h2>
          {order.lines.map((l) => (
            <div className="detail-line" key={l.sku}>
              <span className="quantity-stamp">{l.cases}×</span>
              <div>
                <strong>{locale === "hi" ? l.nameHi : l.name}</strong>
                <p>
                  {l.pack} {t("piecesPerCase")} · {money(l.unitPricePaise)} /{" "}
                  {t("piece")}
                </p>
                {l.freeCases > 0 ? (
                  <span className="scheme-note">
                    +{l.freeCases} {t("freeCases")}
                  </span>
                ) : null}
                {l.discountPaise > 0 ? (
                  <span className="scheme-note">
                    {t("discount")}: {money(l.discountPaise)}
                  </span>
                ) : null}
                {user.role === "desk" && (
                  <details>
                    <summary>
                      {locale === "hi"
                        ? "उत्पाद का नाम सिखाएँ"
                        : "Teach a product alias"}
                    </summary>
                    <AliasForm orderId={order.id} sku={l.sku} />
                  </details>
                )}
              </div>
              <strong>{money(l.totalPaise)}</strong>
            </div>
          ))}
          <div className="totals">
            <div>
              <span>{t("subtotal")}</span>
              <span>{money(order.subtotalPaise)}</span>
            </div>
            <div className="savings">
              <span>{t("discount")}</span>
              <span>−{money(order.discountPaise)}</span>
            </div>
            <div className="grand-total">
              <strong>{t("total")}</strong>
              <strong>{money(order.totalPaise)}</strong>
            </div>
            <small>{t("tax")}</small>
          </div>
        </section>
        <aside className="detail-panel">
          <h2>{t("history")}</h2>
          <ol className="timeline">
            {order.events.map((event, index) => (
              <li key={index}>
                <span className="timeline-dot">
                  <Check size={13} />
                </span>
                <div>
                  <strong>{t(event.status)}</strong>
                  <small>
                    {new Intl.DateTimeFormat(
                      locale === "hi" ? "hi-IN" : "en-IN",
                      {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Kolkata",
                      },
                    ).format(new Date(event.createdAt))}
                  </small>
                </div>
              </li>
            ))}
          </ol>
          {error ? <ErrorNotice error={error} /> : null}
          {user.role === "desk" && order.status === "confirmed" ? (
            <Button
              className="full"
              busy={busy}
              onClick={() => advance("processing")}
            >
              <Clock3 size={17} />
              {t("startProcessing")}
            </Button>
          ) : null}
          {user.role === "desk" && order.status === "processing" ? (
            <Button
              className="full"
              busy={busy}
              onClick={() => advance("packed")}
            >
              <PackageCheck size={17} />
              {t("markPacked")}
            </Button>
          ) : null}
          {user.role === "desk" &&
            order.status === "confirmed" &&
            (cancelReview ? (
              <div>
                <Notice>
                  {locale === "hi"
                    ? "ऑर्डर रद्द करने पर पेटियाँ स्टॉक में वापस जाएँगी।"
                    : "Cancelling returns the reserved cases to stock."}
                </Notice>
                <Button busy={busy} onClick={() => advance("cancelled")}>
                  {locale === "hi"
                    ? "रद्द करने की पुष्टि करें"
                    : "Confirm cancellation"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setCancelReview(false)}
                >
                  {locale === "hi" ? "ऑर्डर रखें" : "Keep order"}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => setCancelReview(true)}
              >
                {locale === "hi" ? "ऑर्डर रद्द करें" : "Cancel order"}
              </Button>
            ))}
          {user.role === "desk" && order.status === "packed" && (
            <div>
              <p>
                {locale === "hi"
                  ? "Tally मैपिंग के लिए CSV"
                  : "CSV for Tally field mapping"}
              </p>
              {exportError && (
                <Notice tone="error">
                  {locale === "hi"
                    ? "डाउनलोड नहीं हुआ। रिफ़्रेश करके फिर कोशिश करें।"
                    : "Download failed. Refresh and try again."}
                </Notice>
              )}
              <Button
                className="full"
                busy={exporting}
                onClick={() => downloadExport(order.id)}
              >
                {locale === "hi" ? "CSV डाउनलोड करें" : "Download export CSV"}
              </Button>
            </div>
          )}
          <Button variant="ghost" className="full" onClick={r.reload}>
            <RefreshCw size={15} />
            {t("refresh")}
          </Button>
        </aside>
      </div>
    </section>
  );
}

function AliasForm({ orderId, sku }: { orderId: string; sku: string }) {
  const { locale } = useLocale();
  const hi = locale === "hi";
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"saved" | "error" | null>(null);

  return (
    <form
      className="capture-form"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || phrase.trim().length < 2) return;
        setBusy(true);
        setStatus(null);
        try {
          await api(`/orders/${encodeURIComponent(orderId)}/aliases`, {
            method: "POST",
            body: JSON.stringify({ phrase, sku }),
          });
          setPhrase("");
          setStatus("saved");
        } catch {
          setStatus("error");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field
        id={`alias-${sku}`}
        label={
          hi
            ? "इस दुकानदार के उत्पाद का नाम"
            : "Retailer’s words for this product"
        }
        value={phrase}
        maxLength={100}
        disabled={busy}
        onChange={(event) => {
          setPhrase(event.target.value);
          setStatus(null);
        }}
      />
      <Button busy={busy} disabled={phrase.trim().length < 2}>
        {hi ? "नाम सहेजें" : "Save product alias"}
      </Button>
      {status && (
        <Notice tone={status === "saved" ? "success" : "error"}>
          {status === "saved"
            ? hi
              ? "नाम इस दुकानदार के लिए सहेजा गया।"
              : "Alias saved for this retailer."
            : hi
              ? "नाम सहेजा नहीं जा सका।"
              : "Could not save the alias."}
        </Notice>
      )}
    </form>
  );
}
