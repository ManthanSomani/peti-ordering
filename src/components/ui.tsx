import type {
  ButtonHTMLAttributes,
  ComponentPropsWithRef,
  ReactNode,
} from "react";
import {
  AlertCircle,
  ArrowRight,
  LoaderCircle,
  PackageOpen,
} from "lucide-react";
import { useLocale } from "../i18n";
import { ApiError } from "../api";
import type { Status } from "../../shared/types";
export function Button({
  busy,
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      aria-busy={busy || undefined}
      className={`button button-${variant} ${className}`}
    >
      {busy ? <LoaderCircle className="spin" size={18} /> : null}
      {children}
    </button>
  );
}
export function Field({
  label,
  error,
  ...props
}: ComponentPropsWithRef<"input"> & { label: string; error?: string }) {
  return (
    <div className="field">
      <label htmlFor={props.id}>{label}</label>
      <input
        {...props}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id}-error` : undefined}
      />
      {error ? (
        <span className="field-error" id={`${props.id}-error`}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "error" | "success";
}) {
  return (
    <div
      className={`notice notice-${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <AlertCircle size={18} />
      <div>{children}</div>
    </div>
  );
}
export function Loading() {
  const { t } = useLocale();
  return (
    <div className="loading" role="status">
      <LoaderCircle size={24} className="spin" />
      {t("loading")}
    </div>
  );
}
export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <PackageOpen size={38} strokeWidth={1.3} />
      <h2>{title}</h2>
      <p>{body}</p>
      {children}
    </div>
  );
}
export function ErrorNotice({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const { t } = useLocale();
  const map = {
    UNAUTHENTICATED: "unauthorized",
    UNKNOWN_ACCOUNT: "unknownAccount",
    CODE_INVALID: "invalidCode",
    CODE_EXPIRED: "expiredCode",
    INSUFFICIENT_STOCK: "insufficient",
    PRICE_CHANGED: "priceChanged",
    FORBIDDEN: "forbidden",
    NOT_FOUND: "notFound",
    INVALID_TRANSITION: "invalidTransition",
    RATE_LIMIT: "rateLimit",
    DEMO_DISABLED: "unavailable",
  } as const;
  const key =
    error instanceof ApiError ? map[error.code as keyof typeof map] : undefined;
  return (
    <Notice tone="error">
      <span>{key ? t(key) : t("connection")}</span>
      {retry ? (
        <Button variant="ghost" onClick={retry}>
          {t("retry")}
          <ArrowRight size={16} />
        </Button>
      ) : null}
    </Notice>
  );
}
export function StatusBadge({ status }: { status: Status }) {
  const { t } = useLocale();
  return (
    <span className={`status status-${status}`}>
      <span aria-hidden="true" />
      {t(status)}
    </span>
  );
}
