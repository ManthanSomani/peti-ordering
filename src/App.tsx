import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Boxes,
  LayoutGrid,
  ClipboardList,
  ShoppingBag,
  LogOut,
  Languages,
  Store,
  ArrowUpRight,
} from "lucide-react";
import type { User } from "../shared/types";
import { api, ApiError } from "./api";
import { useLocale } from "./i18n";
import { CartProvider, useCart } from "./state";
import { Button, ErrorNotice, Loading } from "./components/ui";
import { Login } from "./pages/Login";
import { Catalogue, CartPage } from "./pages/Catalogue";
import { Capture } from "./pages/Capture";
import { Orders, OrderDetail } from "./pages/Orders";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const navigate = useNavigate();
  async function load() {
    setError(null);
    try {
      setUser(await api<User>("/me"));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setUser(null);
      else setError(e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const expire = () => {
      setUser(null);
      navigate("/login", { replace: true });
    };
    window.addEventListener("peti:session-expired", expire);
    return () => window.removeEventListener("peti:session-expired", expire);
  }, []);
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="boot-error">
        <ErrorNotice error={error} retry={load} />
      </div>
    );
  if (!user)
    return (
      <Login
        onSignedIn={async () => {
          const u = await api<User>("/me");
          setUser(u);
          navigate(u.role === "desk" ? "/orders" : "/catalogue", {
            replace: true,
          });
        }}
      />
    );
  return (
    <CartProvider key={user.id}>
      <Shell user={user} onLogout={() => setUser(null)} />
    </CartProvider>
  );
}

function Shell({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { t, locale, setLocale } = useLocale();
  const { items } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState<unknown>(null);
  const count = items.reduce((sum, i) => sum + i.cases, 0);
  const nav =
    user.role === "retailer"
      ? [
          { to: "/catalogue", label: t("catalogue"), icon: LayoutGrid },
          { to: "/orders", label: t("orders"), icon: ClipboardList },
          { to: "/cart", label: t("cart"), icon: ShoppingBag },
        ]
      : [{ to: "/orders", label: t("desk"), icon: ClipboardList }];
  useEffect(() => {
    document.title = `Peti · ${location.pathname.startsWith("/catalogue") ? t("catalogue") : location.pathname === "/cart" ? t("cart") : t(user.role === "desk" ? "desk" : "orders")}`;
    document.querySelector<HTMLElement>("main h1")?.focus();
  }, [location.pathname, locale]);
  async function logout() {
    setLogoutBusy(true);
    try {
      await api("/auth/logout", { method: "POST" });
      onLogout();
      navigate("/login", { replace: true });
    } catch (e) {
      setLogoutError(e);
    } finally {
      setLogoutBusy(false);
    }
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {t("skip")}
      </a>
      <aside className="sidebar">
        <Link
          className="brand"
          to={user.role === "desk" ? "/orders" : "/catalogue"}
        >
          <span className="brand-icon">
            <Boxes size={25} />
          </span>
          peti<span className="brand-dot">.</span>
        </Link>
        <div className="workspace-label">{t("distribution")}</div>
        <nav aria-label={t("catalogue")}>
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <n.icon size={19} />
              {n.label}
              {n.to === "/cart" && count > 0 ? (
                <span className="nav-count">{count}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <Boxes size={24} strokeWidth={1.4} />
          <strong>{t("needCases")}</strong>
          <p>{t("caseHelp")}</p>
        </div>
        <div className="sidebar-bottom">
          <div className="avatar">{user.name.slice(0, 1)}</div>
          <div>
            <strong>{user.shop ?? t("desk")}</strong>
            <span>{t("sampleData")}</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="mobile-brand">
            <Boxes size={22} />
            <strong>peti.</strong>
          </div>
          <div className="store-label">
            <Store size={17} />
            <span>{user.shop ?? t("desk")}</span>
            <span className="location-label">Jabalpur</span>
          </div>
          <div className="top-actions">
            <Button
              variant="ghost"
              onClick={() => setLocale(locale === "en" ? "hi" : "en")}
            >
              <Languages size={16} />
              {locale === "en" ? "हिन्दी" : "English"}
            </Button>
            <Button
              variant="ghost"
              busy={logoutBusy}
              onClick={logout}
              title={t("signOut")}
              aria-label={t("signOut")}
            >
              <LogOut size={17} />
              <span className="signout-label">{t("signOut")}</span>
            </Button>
          </div>
        </header>
        <main id="main">
          {logoutError ? (
            <ErrorNotice error={logoutError} retry={logout} />
          ) : null}
          <Routes>
            <Route
              path="/capture"
              element={
                user.role === "retailer" ? (
                  <Capture />
                ) : (
                  <Navigate to="/orders" replace />
                )
              }
            />
            <Route
              path="/catalogue"
              element={
                user.role === "retailer" ? (
                  <Catalogue />
                ) : (
                  <Navigate to="/orders" replace />
                )
              }
            />
            <Route
              path="/cart"
              element={
                user.role === "retailer" ? (
                  <CartPage />
                ) : (
                  <Navigate to="/orders" replace />
                )
              }
            />
            <Route path="/orders" element={<Orders user={user} />} />
            <Route path="/orders/:id" element={<OrderDetail user={user} />} />
            <Route
              path="/"
              element={
                <Navigate
                  to={user.role === "desk" ? "/orders" : "/catalogue"}
                  replace
                />
              }
            />
            <Route
              path="/login"
              element={
                <Navigate
                  to={user.role === "desk" ? "/orders" : "/catalogue"}
                  replace
                />
              }
            />
            <Route
              path="*"
              element={
                <section className="page">
                  <h1 tabIndex={-1}>404</h1>
                  <p>{t("notFound")}</p>
                  <Link className="button button-primary" to="/">
                    {t("back")}
                    <ArrowUpRight size={16} />
                  </Link>
                </section>
              }
            />
          </Routes>
        </main>
        <footer className="app-footer">
          <span>Peti · {t("sampleData")}</span>
          <span>{t("tax")}</span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label={t("catalogue")}>
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to}>
            <n.icon size={20} />
            <span>
              {n.label}
              {n.to === "/cart" && count > 0 ? ` (${count})` : ""}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
