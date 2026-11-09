import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import type { Page, Product } from "../../shared/types";
import { api, useResource } from "../api";
import { useLocale } from "../i18n";
import { useCart } from "../state";
import {
  Button,
  EmptyState,
  ErrorNotice,
  Loading,
  Notice,
} from "../components/ui";
import { ProductArt } from "../components/ProductArt";

export function Catalogue() {
  const { t, locale, money } = useLocale();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const category = params.get("category") ?? "all";
  const resource = useResource<Page<Product>>(
    `/catalogue?${params.toString()}`,
  );
  const { items, setCount } = useCart();
  useEffect(() => setSearch(params.get("q") ?? ""), [params]);
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    next.set(key, value);
    next.set("page", "1");
    setParams(next);
  }
  return (
    <section className="page catalogue-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {t("shopFor")} · {t("distribution")}
          </span>
          <h1 tabIndex={-1}>{t("title")}</h1>
          <p>{t("intro")}</p>
          <Link className="button button-secondary" to="/capture">
            {locale === "hi" ? "संदेश से ऑर्डर" : "Order from a message"}
          </Link>
        </div>
        <span className="tax-tag">
          <Check size={15} />
          {t("tax")}
        </span>
      </div>
      <div className="catalogue-layout">
        <div className="catalogue-content">
          <div className="catalogue-tools">
            <form
              className="search-form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                filter("q", search);
              }}
            >
              <Search size={19} />
              <input
                aria-label={t("search")}
                placeholder={t("search")}
                value={search}
                maxLength={100}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search ? (
                <Button
                  variant="ghost"
                  type="button"
                  aria-label={t("clear")}
                  onClick={() => {
                    setSearch("");
                    filter("q", "");
                  }}
                >
                  <X size={16} />
                </Button>
              ) : null}
              <Button type="submit" variant="secondary">
                {t("searchAction")}
              </Button>
            </form>
            <div className="filter-row" aria-label={t("catalogue")}>
              {(["all", "food", "home", "offers"] as const).map((c) => (
                <button
                  key={c}
                  className={`filter-chip ${category === c ? "selected" : ""}`}
                  aria-pressed={category === c}
                  onClick={() => filter("category", c)}
                >
                  {c === "offers" ? <Tag size={14} /> : null}
                  {t(c)}
                </button>
              ))}
              <span className="results-count">
                {resource.data ? `${resource.data.total} ${t("products")}` : ""}
              </span>
            </div>
          </div>
          {resource.loading ? (
            <Loading />
          ) : resource.error ? (
            <ErrorNotice error={resource.error} retry={resource.reload} />
          ) : !resource.data?.items.length ? (
            <EmptyState title={t("noResults")} body={t("noResultsBody")}>
              <Button variant="secondary" onClick={() => setParams({})}>
                {t("clear")}
              </Button>
            </EmptyState>
          ) : (
            <>
              <div className="product-grid">
                {resource.data.items.map((p) => {
                  const count = items.find((i) => i.sku === p.id)?.cases ?? 0;
                  return (
                    <article
                      className={`product-card ${!p.stock ? "unavailable" : ""}`}
                      key={p.id}
                    >
                      <div className="product-visual">
                        <ProductArt product={p} />
                        <span className="pack-badge">{p.size}</span>
                        {p.scheme !== "none" ? (
                          <span className="offer-marker">
                            <Tag size={12} />
                            {t("offers")}
                          </span>
                        ) : null}
                      </div>
                      <div className="product-body">
                        <div className="product-brand">{p.brand}</div>
                        <h2>{locale === "hi" ? p.nameHi : p.name}</h2>
                        <div className="pack-info">
                          <Package size={13} />
                          {p.pack} {t("piecesPerCase")}
                        </div>
                        <div className="price-row">
                          <strong>{money(p.pricePaise)}</strong>
                          <span>/ {t("piece")}</span>
                        </div>
                        <div className="case-price">
                          {money(p.pricePaise * p.pack)} / {t("case")}
                        </div>
                        <div
                          className={`scheme-strip ${p.scheme === "none" ? "no-scheme" : ""}`}
                        >
                          {p.scheme === "free10"
                            ? t("freeScheme")
                            : p.scheme === "discount3"
                              ? t("discountScheme")
                              : t("noScheme")}
                        </div>
                        <div
                          className={`stock-line ${!p.stock ? "zero-stock" : ""}`}
                        >
                          <span aria-hidden="true" />
                          {p.stock
                            ? `${p.stock} ${t("stock")}`
                            : t("outOfStock")}
                        </div>
                        <Button
                          variant={count ? "primary" : "secondary"}
                          className="full"
                          disabled={
                            !p.stock || count >= p.stock || count >= 1000
                          }
                          onClick={() => setCount(p.id, count + 1)}
                          aria-label={`${t("add")}: ${locale === "hi" ? p.nameHi : p.name} ${p.size}`}
                        >
                          {count ? (
                            <>
                              <Check size={16} />
                              {count} {t("added")}
                            </>
                          ) : (
                            <>
                              <Plus size={16} />
                              {t("add")}
                            </>
                          )}
                        </Button>
                        {count > 0 && (
                          <Button
                            variant="ghost"
                            className="full"
                            aria-label={`${t("remove")}: ${locale === "hi" ? p.nameHi : p.name} ${p.size}`}
                            onClick={() => setCount(p.id, 0)}
                          >
                            <Trash2 size={16} />
                            {t("remove")}
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
              {resource.data.pages > 1 ? (
                <div className="pagination">
                  <Button
                    variant="secondary"
                    disabled={resource.data.page === 1}
                    onClick={() =>
                      setParams({
                        ...Object.fromEntries(params),
                        page: String(resource.data!.page - 1),
                      })
                    }
                  >
                    {t("previous")}
                  </Button>
                  <span>
                    {t("page")} {resource.data.page} / {resource.data.pages}
                  </span>
                  <Button
                    variant="secondary"
                    disabled={resource.data.page === resource.data.pages}
                    onClick={() =>
                      setParams({
                        ...Object.fromEntries(params),
                        page: String(resource.data!.page + 1),
                      })
                    }
                  >
                    {t("next")}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
        <OrderSlip />
      </div>
    </section>
  );
}

function OrderSlip() {
  const { t, locale, money } = useLocale();
  const { items, quote } = useCart();
  return (
    <aside className="order-slip">
      <div className="slip-heading">
        <ShoppingBag size={19} />
        <h2>{t("cart")}</h2>
        <span>{items.length}</span>
      </div>
      {!items.length ? (
        <div className="slip-empty">
          <div className="bag-outline">
            <ShoppingBag size={34} strokeWidth={1.3} />
          </div>
          <h3>{t("emptyCart")}</h3>
          <p>{t("emptyCartBody")}</p>
        </div>
      ) : (
        <>
          {quote.loading ? (
            <Loading />
          ) : quote.error ? (
            <ErrorNotice error={quote.error} />
          ) : quote.data ? (
            <>
              <div className="slip-lines">
                {quote.data.lines.map((l) => (
                  <div className="slip-line" key={l.sku}>
                    <span className="quantity-stamp">{l.cases}×</span>
                    <div>
                      <strong>{locale === "hi" ? l.nameHi : l.name}</strong>
                      <small>
                        {l.pack} {t("piecesPerCase")}
                      </small>
                    </div>
                    <span>{money(l.totalPaise)}</span>
                  </div>
                ))}
              </div>
              <Totals />
            </>
          ) : null}
          <Link to="/cart" className="button button-primary full">
            {t("review")}
            <ArrowRight size={17} />
          </Link>
        </>
      )}
      <div className="slip-foot">
        <Check size={14} />
        {t("tax")}
      </div>
    </aside>
  );
}

function Totals() {
  const { t, money } = useLocale();
  const { quote } = useCart();
  if (!quote.data) return null;
  const q = quote.data;
  return (
    <div className="totals">
      <div>
        <span>{t("subtotal")}</span>
        <span>{money(q.subtotalPaise)}</span>
      </div>
      {q.discountPaise > 0 ? (
        <div className="savings">
          <span>{t("discount")}</span>
          <span>−{money(q.discountPaise)}</span>
        </div>
      ) : null}
      {q.freeCases > 0 ? (
        <div className="savings">
          <span>{t("freeCases")}</span>
          <span>+{q.freeCases}</span>
        </div>
      ) : null}
      <div className="grand-total">
        <strong>{t("total")}</strong>
        <strong>{money(q.totalPaise)}</strong>
      </div>
    </div>
  );
}

export function CartPage() {
  const { t, locale, money } = useLocale();
  const { items, setCount, quote, key, clear } = useCart();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const catalogue = useResource<Page<Product>>("/catalogue");
  async function place() {
    if (!quote.data || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ id: string }>("/orders", {
        method: "POST",
        body: JSON.stringify({
          items,
          idempotencyKey: key,
          expectedTotalPaise: quote.data.totalPaise,
        }),
      });
      clear();
      navigate(`/orders/${result.id}`, { state: { created: true } });
    } catch (e) {
      setError(e);
      quote.reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="page">
      <Link className="text-link" to="/catalogue">
        <ArrowLeft size={16} />
        {t("back")}
      </Link>
      <div className="page-heading">
        <div>
          <h1 tabIndex={-1}>{t("cartTitle")}</h1>
          <p>{t("cartIntro")}</p>
        </div>
      </div>
      {!items.length ? (
        <EmptyState title={t("emptyCart")} body={t("emptyCartBody")}>
          <Link className="button button-primary" to="/catalogue">
            {t("browse")}
            <ArrowRight size={16} />
          </Link>
        </EmptyState>
      ) : (
        <div className="cart-layout">
          <div className="cart-lines">
            {items.map((item) => {
              const product = catalogue.data?.items.find(
                (p) => p.id === item.sku,
              );
              const line = quote.data?.lines.find((l) => l.sku === item.sku);
              return (
                <article className="cart-line" key={item.sku}>
                  <div className="cart-art">
                    {product ? (
                      <ProductArt product={product} />
                    ) : (
                      <Package size={30} />
                    )}
                  </div>
                  <div className="cart-line-main">
                    <h2>
                      {product
                        ? locale === "hi"
                          ? product.nameHi
                          : product.name
                        : line
                          ? locale === "hi"
                            ? line.nameHi
                            : line.name
                          : item.sku}
                    </h2>
                    <p>
                      {product
                        ? `${product.size} · ${product.pack} ${t("piecesPerCase")}`
                        : item.sku}
                    </p>
                    {line && line.freeCases > 0 ? (
                      <span className="scheme-note">
                        +{line.freeCases} {t("freeCases")}
                      </span>
                    ) : null}
                    <label
                      className="quantity-field"
                      htmlFor={`qty-${item.sku}`}
                    >
                      {t("quantity")}
                      <input
                        id={`qty-${item.sku}`}
                        type="number"
                        min="1"
                        max="1000"
                        step="1"
                        value={item.cases}
                        disabled={busy}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (Number.isInteger(n) && n >= 1 && n <= 1000) {
                            setCount(item.sku, n);
                            setError(null);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className="cart-line-end">
                    <strong>{line ? money(line.totalPaise) : "—"}</strong>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      aria-label={`${t("remove")}: ${product?.name ?? item.sku}`}
                      onClick={() => {
                        setCount(item.sku, 0);
                        setError(null);
                      }}
                    >
                      <Trash2 size={16} />
                      {t("remove")}
                    </Button>
                  </div>
                </article>
              );
            })}
            <Notice>{t("taxNote")}</Notice>
          </div>
          <aside className="order-slip cart-summary">
            <div className="slip-heading">
              <ShoppingBag size={19} />
              <h2>{t("summary")}</h2>
            </div>
            {quote.loading ? (
              <Loading />
            ) : quote.error ? (
              <ErrorNotice error={quote.error} retry={quote.reload} />
            ) : (
              <Totals />
            )}
            {error ? <ErrorNotice error={error} /> : null}
            <Button
              className="full"
              disabled={!quote.data || quote.loading || !!quote.error}
              busy={busy}
              onClick={place}
            >
              {t(busy ? "placing" : "confirm")}
              <ArrowRight size={17} />
            </Button>
            <p className="confirmation-note">{t("confirmNote")}</p>
          </aside>
        </div>
      )}
    </section>
  );
}
