import { useRef, useState } from "react";
import {
  ArrowRight,
  Boxes,
  Check,
  Languages,
  Store,
  Users,
} from "lucide-react";
import { api, useResource } from "../api";
import { useLocale } from "../i18n";
import { Button, ErrorNotice, Field, Loading, Notice } from "../components/ui";
import { ProductArt } from "../components/ProductArt";

export function Login({ onSignedIn }: { onSignedIn: () => Promise<void> }) {
  const { t, locale, setLocale } = useLocale();
  const config = useResource<{ demo: boolean }>("/config");
  const [email, setEmail] = useState("sharma@peti.demo");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<{
    challengeId: string;
    demoCode: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [fieldError, setFieldError] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setFieldError("");
    if (!challenge && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError(t("loginError"));
      emailRef.current?.focus();
      return;
    }
    if (challenge && !/^\d{6}$/.test(code)) {
      setFieldError(t("codeError"));
      codeRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      if (!challenge) {
        const result = await api<{ challengeId: string; demoCode: string }>(
          "/auth/request",
          { method: "POST", body: JSON.stringify({ email }) },
        );
        setChallenge(result);
        setTimeout(() => codeRef.current?.focus(), 0);
      } else {
        await api("/auth/verify", {
          method: "POST",
          body: JSON.stringify({ challengeId: challenge.challengeId, code }),
        });
        await onSignedIn();
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <a href="/" className="brand brand-light">
          <span className="brand-icon">
            <Boxes size={25} />
          </span>
          peti<span className="brand-dot">.</span>
        </a>
        <div className="story-copy">
          <span className="eyebrow">{t("distribution")}</span>
          <h1>{t("loginTitle")}</h1>
          <p>{t("loginIntro")}</p>
          <div className="shelf-art">
            <ProductArt
              product={{ art: "biscuit", brand: "Rozana", size: "75 g" }}
            />
            <ProductArt
              product={{ art: "detergent", brand: "Ujala Home", size: "1 kg" }}
            />
            <ProductArt
              product={{ art: "tea", brand: "Pahadi", size: "250 g" }}
            />
          </div>
          <ul className="story-points">
            {(["points1", "points2", "points3"] as const).map((k) => (
              <li key={k}>
                <Check size={18} />
                {t(k)}
              </li>
            ))}
          </ul>
        </div>
        <span className="story-footer">{t("tagline")}</span>
      </section>
      <section className="login-form-side">
        <div className="login-toolbar">
          <span className="demo-label">{t("sampleData")}</span>
          <Button
            variant="ghost"
            onClick={() => setLocale(locale === "en" ? "hi" : "en")}
          >
            <Languages size={17} />
            {locale === "en" ? "हिन्दी" : "English"}
          </Button>
        </div>
        <div className="login-form-wrap">
          <div className="login-icon">
            <Store size={27} />
          </div>
          <h2>{t("welcome")}</h2>
          <p className="muted">{t("loginSubtitle")}</p>
          {config.loading ? (
            <Loading />
          ) : config.error ? (
            <ErrorNotice error={config.error} retry={config.reload} />
          ) : !config.data?.demo ? (
            <Notice>{t("unavailable")}</Notice>
          ) : (
            <>
              {!challenge ? (
                <div className="account-switch">
                  <button
                    className={email === "sharma@peti.demo" ? "selected" : ""}
                    onClick={() => {
                      setEmail("sharma@peti.demo");
                      setError(null);
                      setFieldError("");
                    }}
                  >
                    <Store size={19} />
                    {t("retailerAccount")}
                  </button>
                  <button
                    className={email === "desk@peti.demo" ? "selected" : ""}
                    onClick={() => {
                      setEmail("desk@peti.demo");
                      setError(null);
                      setFieldError("");
                    }}
                  >
                    <Users size={19} />
                    {t("deskAccount")}
                  </button>
                </div>
              ) : (
                <div className="demo-code">
                  <span>{t("demoCode")}</span>
                  <strong>{challenge.demoCode}</strong>
                  <p>{t("codeHelp")}</p>
                </div>
              )}
              <form onSubmit={submit} noValidate>
                {!challenge ? (
                  <Field
                    ref={emailRef}
                    id="email"
                    label={t("email")}
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldError("");
                    }}
                    error={fieldError}
                  />
                ) : (
                  <Field
                    ref={codeRef}
                    id="code"
                    label={t("code")}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      setFieldError("");
                    }}
                    error={fieldError}
                  />
                )}
                {error ? <ErrorNotice error={error} /> : null}
                <Button className="full" type="submit" busy={busy}>
                  {t(challenge ? "verify" : "sendCode")}
                  <ArrowRight size={18} />
                </Button>
                {challenge ? (
                  <Button
                    variant="ghost"
                    className="full"
                    onClick={() => {
                      setChallenge(null);
                      setCode("");
                      setError(null);
                      setFieldError("");
                    }}
                    type="button"
                  >
                    {t("changeAccount")}
                  </Button>
                ) : null}
              </form>
              <div className="demo-explanation">
                <strong>{t("demoTitle")}</strong>
                <p>{t("demoNote")}</p>
                <span>sharma@peti.demo · verma@peti.demo · desk@peti.demo</span>
              </div>
            </>
          )}
        </div>
        <div className="login-footer">Peti / {t("distribution")}</div>
      </section>
    </div>
  );
}
