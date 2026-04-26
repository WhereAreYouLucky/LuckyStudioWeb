/* global React, ReactDOM, useTweaks, TweaksPanel, TweakSection, TweakRadio */
const { useState, useEffect, useRef, useMemo, useLayoutEffect } = React;

// ─── Live reload from admin ───
const _bc = new BroadcastChannel("things_admin");
_bc.onmessage = () => location.reload();

// ─── Global site data ───
let SITE = null;

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let done = false;
    const fire = () => { if (done) return; done = true; el.classList.add("in"); };
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) fire();
    });
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { fire(); io.disconnect(); }
    }, { threshold: 0, rootMargin: "0px 0px -5% 0px" });
    io.observe(el);
    const t = setTimeout(fire, 1500);
    return () => { io.disconnect(); clearTimeout(t); };
  }, []);
  return ref;
}

function WordReveal({ children, as: As = "span", delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let done = false;
    const fire = () => { if (done) return; done = true; setTimeout(() => el.classList.add("in"), delay); };
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) fire();
    });
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { fire(); io.disconnect(); }
    }, { threshold: 0, rootMargin: "0px 0px -5% 0px" });
    io.observe(el);
    const t = setTimeout(fire, 1200);
    return () => { io.disconnect(); clearTimeout(t); };
  }, [delay]);
  const tokens = [];
  React.Children.forEach(children, (child) => {
    if (typeof child === "string") {
      child.split(/(\s+)/).forEach((p) => {
        if (p === "") return;
        if (/^\s+$/.test(p)) tokens.push({ type: "space", val: p });
        else tokens.push({ type: "word", val: p });
      });
    } else if (child != null && child !== false) {
      tokens.push({ type: "el", val: child });
    }
  });
  return (
    <As className="words" ref={ref}>
      {tokens.map((tok, i) => {
        if (tok.type === "space") return <React.Fragment key={i}>{tok.val}</React.Fragment>;
        return <span className="w" key={i}><span>{tok.val}</span></span>;
      })}
    </As>
  );
}

function ScrollProgress() {
  const ref = useRef(null);
  useEffect(() => {
    const onScroll = () => {
      if (!ref.current) return;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      ref.current.style.transform = `scaleX(${h > 0 ? window.scrollY / h : 0})`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <div ref={ref} className="scroll-progress" />;
}

function PageTransition() {
  const [done, setDone] = useState(false);
  useEffect(() => { requestAnimationFrame(() => requestAnimationFrame(() => setDone(true))); }, []);
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest("a[href]");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript")) return;
      if (a.target === "_blank") return;
      e.preventDefault();
      setDone(false);
      setTimeout(() => { window.location.href = href; }, 450);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return <div className={`page-transition ${done ? "done" : ""}`} />;
}

function MagneticBtn({ children, primary, href = "#", className = "" }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.18}px, ${(e.clientY - (r.top + r.height / 2)) * 0.28}px)`;
  };
  const onLeave = () => { if (ref.current) ref.current.style.transform = ""; };
  return (
    <a ref={ref} href={href} onMouseMove={onMove} onMouseLeave={onLeave}
       className={`btn ${primary ? "btn-primary" : "btn-ghost"} ${className}`}>
      {children}
    </a>
  );
}

// ─── Pastry SVG illustrations ───
function Pastry({ kind, style }) {
  const wrap = { width:"100%", height:"100%", display:"block", ...style };
  if (kind === "croissant") return (
    <svg viewBox="0 0 200 200" style={wrap}><defs><radialGradient id="c1" cx="50%" cy="40%" r="70%"><stop offset="0%" stopColor="#f3d49a"/><stop offset="60%" stopColor="#c98947"/><stop offset="100%" stopColor="#7e4a1f"/></radialGradient></defs><path d="M30 130 Q 60 60, 110 60 Q 165 60, 175 120 Q 165 140, 140 130 Q 130 105, 100 100 Q 75 100, 60 130 Q 40 145, 30 130 Z" fill="url(#c1)"/><path d="M55 120 Q 70 95, 95 95" stroke="#5a2f12" strokeWidth="1.5" fill="none" opacity=".4"/><path d="M85 115 Q 105 90, 130 95" stroke="#5a2f12" strokeWidth="1.5" fill="none" opacity=".4"/><path d="M115 120 Q 135 100, 158 110" stroke="#5a2f12" strokeWidth="1.5" fill="none" opacity=".4"/></svg>
  );
  if (kind === "tart") return (
    <svg viewBox="0 0 200 200" style={wrap}><defs><radialGradient id="t1" cx="50%" cy="50%" r="55%"><stop offset="0%" stopColor="#f7c8a0"/><stop offset="100%" stopColor="#a86a3a"/></radialGradient></defs><ellipse cx="100" cy="115" rx="80" ry="22" fill="#7d4a23"/><ellipse cx="100" cy="105" rx="78" ry="20" fill="url(#t1)"/><circle cx="78" cy="100" r="9" fill="#c0303a"/><circle cx="98" cy="96" r="9" fill="#7e1d2a"/><circle cx="118" cy="100" r="9" fill="#c0303a"/><circle cx="88" cy="108" r="7" fill="#a31f2a"/><circle cx="110" cy="108" r="7" fill="#7e1d2a"/></svg>
  );
  if (kind === "cake") return (
    <svg viewBox="0 0 200 200" style={wrap}><defs><linearGradient id="ck1" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#f5e3c8"/><stop offset="100%" stopColor="#c89a66"/></linearGradient></defs><polygon points="50,150 150,150 130,60 70,60" fill="url(#ck1)"/><rect x="50" y="78" width="100" height="6" fill="#7d3a2a"/><rect x="50" y="110" width="100" height="6" fill="#7d3a2a"/><path d="M50 60 Q 100 50, 150 60 L 150 64 Q 100 56, 50 64 Z" fill="#fff8ec"/><circle cx="100" cy="48" r="6" fill="#b22a3a"/></svg>
  );
  if (kind === "macaron") return (
    <svg viewBox="0 0 200 200" style={wrap}><ellipse cx="100" cy="80" rx="70" ry="32" fill="#f4cdd6"/><rect x="30" y="90" width="140" height="20" fill="#fff3d6"/><ellipse cx="100" cy="120" rx="70" ry="32" fill="#f4cdd6"/><ellipse cx="100" cy="74" rx="68" ry="6" fill="#fff" opacity=".4"/></svg>
  );
  if (kind === "coffee") return (
    <svg viewBox="0 0 200 200" style={wrap}><ellipse cx="100" cy="115" rx="55" ry="14" fill="#3a2010"/><path d="M50 110 Q 50 60 100 60 Q 150 60 150 110 Z" fill="#f4ebd9"/><ellipse cx="100" cy="68" rx="48" ry="8" fill="#5a3318"/><ellipse cx="100" cy="64" rx="44" ry="5" fill="#c39966" opacity=".7"/><path d="M150 80 Q 175 80 175 100 Q 175 120 150 120" fill="none" stroke="#f4ebd9" strokeWidth="6"/></svg>
  );
  return null;
}

// Helper: render image or gradient+svg fallback
function ItemImage({ image, gradient, kind, className, style, label }) {
  if (image) {
    return (
      <div className={className} style={style}>
        <img src={image} alt={label || "Ürün görseli"} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}} />
        {label && <span className="lbl">{label}</span>}
      </div>
    );
  }
  return (
    <div className={className} style={{...style, background: gradient || "var(--bg-2)"}}>
      {kind && <Pastry kind={kind} style={{position:"absolute",inset:"8% 8%"}} />}
      {label && <span className="lbl">{label}</span>}
    </div>
  );
}

// ─── Sections (API-driven) ───
function Nav({ data }) {
  const s = data.settings || {};
  const socials = data.social || [];
  const igLink = (socials.find(s => (s.url||"").toLowerCase().includes("instagram.com")) || {}).url || "";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onS = () => setScrolled(window.scrollY > 30);
    onS();
    window.addEventListener("scroll", onS, { passive: true });
    return () => window.removeEventListener("scroll", onS);
  }, []);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);
  const closeMenu = () => setMenuOpen(false);
  return (
    <>
      <nav className={`nav ${scrolled ? "scr" : ""}`} aria-label="Ana navigasyon" style={menuOpen ? {background:"var(--bg)",backdropFilter:"none"} : {}}>
        <div className="wrap nav-inner">
          <a href="#" className="brand" aria-label={`${s.siteName || "Things"} ${s.siteSubtitle || "pastane"} ana sayfa`}>
            <span className="brand-mark" aria-hidden="true">T</span>
            <span>{s.siteName || "Things"} <em>{s.siteSubtitle || "pastane"}</em></span>
          </a>
          <div className="nav-links">
            <a href="Menu.html">Menü</a>
            <a href="#hikaye">Hikâyemiz</a>
            <a href="#sezon">Mevsim</a>
            <a href="#ziyaret">Ziyaret</a>
          </div>
          <div className="nav-cta">
            {igLink && <a className="nav-ig" href={igLink} target="_blank" rel="noopener noreferrer" title="Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg></a>}
            <a className="btn btn-ghost btn-sm" href="Menu.html">Menüyü gör</a>
            <a className="btn btn-primary btn-sm" href="#ziyaret">Rezervasyon <span className="arrow">→</span></a>
            <button className={`hamburger ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menü">
              <span/><span/><span/>
            </button>
          </div>
        </div>
      </nav>
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`} role="dialog" aria-label="Mobil menü" aria-hidden={!menuOpen}>
        <a href="Menu.html" onClick={closeMenu}>Menü</a>
        <a href="#hikaye" onClick={closeMenu}>Hikâyemiz</a>
        <a href="#sezon" onClick={closeMenu}>Mevsim</a>
        <a href="#ziyaret" onClick={closeMenu}>Ziyaret</a>
        <div className="mobile-menu-cta">
          <a className="btn btn-primary" href="#ziyaret" onClick={closeMenu}>Rezervasyon <span className="arrow">→</span></a>
        </div>
      </div>
    </>
  );
}

function Hero({ data }) {
  const h = data.hero || {};
  const s = data.settings || {};
  const tape = h.tape || "";
  const tapeDouble = tape + " · " + tape + " · ";
  return (
    <section className="hero" aria-label="Karşılama">
      <div className="hero-grain" aria-hidden="true"/>
      <div className="wrap hero-grid">
        <div>
          <div className="ribbon">
            <span className="dot"/><span>{h.badge || ""}</span>
          </div>
          <h1 className="h-display">
            <WordReveal>{h.line1 || ""}</WordReveal><br/>
            <WordReveal as="span" delay={120}>{h.line2 || ""} <em>{h.line2em || ""}</em></WordReveal>
          </h1>
          <p className="lede">{h.desc || ""}</p>
          <div className="hero-actions">
            <MagneticBtn primary href="Menu.html">{h.btn1 || "Bugünün vitrini"} <span className="arrow">→</span></MagneticBtn>
            <MagneticBtn href="#ziyaret">{h.btn2 || "Bizi ziyaret et"}</MagneticBtn>
          </div>
          <div className="hero-meta">
            <div><span className="num-mono">{s.ovenTime || "06:00"}</span><br/>fırın yanar</div>
            <div className="vr"/>
            <div><span className="num-mono">{s.openTime || "08:00"}</span><br/>kapı açılır</div>
            <div className="vr"/>
            <div><span className="num-mono">{s.closeTime || "21:00"}</span><br/>son kahve</div>
          </div>
        </div>
        <div className="hero-stage">
          {(() => {
            const heroPlates = h.plates || [];
            const menuItems = (data.menu || []).slice(0, 4);
            const plateClasses = ["plate-a","plate-b","plate-c","plate-d"];
            const kinds = ["croissant","tart","macaron","coffee"];
            return plateClasses.map((cls, i) => {
              const plate = heroPlates[i] || {};
              const menuItem = menuItems[i] || {};
              const image = plate.image || menuItem.image;
              const name = plate.name || menuItem.name || "";
              return (
                <div key={i} className={`hero-plate ${cls}`}>
                  {image
                    ? <img src={image} alt={name || "Tabak görseli"} loading={i < 2 ? "eager" : "lazy"} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}} />
                    : <Pastry kind={kinds[i]}/>}
                  <span className="hp-tag">{plate.tag || name || ""}</span>
                </div>
              );
            });
          })()}
          <div className="hero-stamp">
            <div>Hot<br/><strong>News</strong></div>
          </div>
        </div>
      </div>
      <div className="hero-tape" aria-hidden="true">
        <span>{tapeDouble}</span>
        <span>{tapeDouble}</span>
      </div>
    </section>
  );
}

function Vitrine({ data }) {
  const v = data.vitrin || {};
  const menu = data.menu || [];
  const featured = (v.featured || [0, 3, 7]).map(i => menu[i]).filter(Boolean).slice(0, 3);
  const kinds = ["croissant", "tart", "cake", "macaron", "coffee"];
  const palette = [
    "linear-gradient(135deg, #f4e8d3, #e3cba2)",
    "linear-gradient(135deg, #f7d8df, #d98a99)",
    "linear-gradient(135deg, #efe1cc, #c19a64)",
  ];
  return (
    <section id="vitrin" className="sect">
      <div className="wrap">
        <div className="sect-head">
          <div className="sect-eyebrow">— {v.eyebrow || "Vitrin"} —</div>
          <h2 className="sect-title"><WordReveal>{v.title || "Bugün vitrinde"} <em>{v.titleEm || "ne var?"}</em></WordReveal></h2>
          <p className="sect-lede">{v.desc || ""}</p>
        </div>
        <div className="cards" style={{gridTemplateColumns:"repeat(3, 1fr)"}}>
          {featured.map((item, i) => (
            <article key={i} className="card reveal" ref={useReveal()}>
              <div className="card-illu" style={{background: item.image ? "none" : (item.gradient || palette[i % 3]), position:"relative"}}>
                {item.image
                  ? <img src={item.image} alt={item.name || "Vitrin ürünü"} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                  : <Pastry kind={kinds[i % kinds.length]} style={{position:"absolute",inset:"8% 8%"}} />}
              </div>
              <div className="card-body">
                {(v.labels && v.labels[i]) ? <div className="card-num" aria-hidden="true">{v.labels[i]}</div> : null}
                <h3>{item.name}</h3>
              </div>
            </article>
          ))}
        </div>
        <div style={{marginTop:48,textAlign:"center"}}>
          <a href="Menu.html" className="btn btn-primary">Menünün tamamını gör <span className="arrow">→</span></a>
        </div>
      </div>
    </section>
  );
}

function Hikaye({ data }) {
  const h = data.hikaye || {};
  const photos = h.photos || [{},{},{}];
  return (
    <section id="hikaye" className="sect tones">
      <div className="wrap hikaye-grid">
        <div>
          <div className="sect-eyebrow">— {h.eyebrow || "Hikâyemiz"} —</div>
          <h2 className="sect-title">
            <WordReveal>{h.title || ""} <em>{h.titleEm1 || ""}</em> {h.titleRest || ""} <em>{h.titleEm2 || ""}</em></WordReveal>
          </h2>
          <p className="sect-lede" style={{maxWidth:"42ch"}}>{h.desc || ""}</p>
          <div className="quote">
            <p>"{h.quote || ""}"</p>
            <div className="quote-by">— {h.quoteBy || ""}</div>
          </div>
          <div className="house-keys">
            {(h.stats || []).map((s, i) => (
              <div key={i}><div className="hk-n">{s.value}</div><div className="hk-l">{s.label}</div></div>
            ))}
          </div>
        </div>
        <div className="hikaye-photos">
          {photos.map((p, i) => {
            const cls = ["ph ph-1","ph ph-2","ph ph-3"][i] || "ph";
            return (
              <div key={i} className={cls} style={p.image ? {} : {}}>
                {p.image && <img src={p.image} alt={p.label || "Hikâye fotoğrafı"} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}} />}
                <span className="ph-lbl">{p.label || ""}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StickyPhilosophy({ data }) {
  const f = data.felsefe || {};
  const wrapRef = useRef(null);
  const textRef = useRef(null);
  const glowRef = useRef(null);
  useEffect(() => {
    const onScroll = () => {
      const wrap = wrapRef.current, text = textRef.current, glow = glowRef.current;
      if (!wrap || !text || !glow) return;
      const rect = wrap.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -rect.top / (wrap.offsetHeight - window.innerHeight)));
      if (progress > 0.05 && progress < 0.95) { text.classList.add("visible"); glow.style.opacity = "1"; }
      else { text.classList.remove("visible"); glow.style.opacity = "0"; }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="sticky-wrap" ref={wrapRef}>
      <div className="sticky-content" style={{background:"var(--bg)"}}>
        <div className="sticky-bg-glow" ref={glowRef} style={{top:"20%",left:"50%",transform:"translateX(-50%)"}} />
        <div className="sticky-text sticky-fade" ref={textRef}>
          <div className="sect-eyebrow">— {f.eyebrow || "Felsefemiz"} —</div>
          <h2 className="sect-title" style={{margin:"14px auto 0"}}>
            <em>{f.title || ""}</em> {f.titleRest || ""}
          </h2>
          <p>{f.desc || ""}</p>
        </div>
      </div>
    </div>
  );
}

function Sezon({ data }) {
  const s = data.sezon || {};
  const items = s.items || [];
  const kinds = ["tart","cake","macaron"];
  return (
    <section id="sezon" className="sect dark">
      <div className="wrap">
        <div className="sect-head center">
          <div className="sect-eyebrow gold">— {s.eyebrow || "Mevsim"} —</div>
          <h2 className="sect-title"><WordReveal>{s.title || ""} <em>{s.titleEm || ""}</em></WordReveal></h2>
          <p className="sect-lede" style={{margin:"18px auto 0"}}>{s.desc || ""}</p>
        </div>
        <div className="season-grid">
          {items.map((it, i) => (
            <div key={i} className={`season-card${i === 1 ? " big" : ""}`}>
              <div className={`sc-illu${i === 1 ? " wide" : ""}`} style={{background:`linear-gradient(135deg, ${it.color1 || "#ccc"}, ${it.color2 || "#999"})`, position:"relative"}}>
                {it.image
                  ? <img src={it.image} alt={it.name || "Mevsim ürünü"} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                  : <Pastry kind={kinds[i % kinds.length]} style={i === 1 ? {position:"absolute",inset:"8% 8%"} : {}} />}
              </div>
              <div className="sc-body">
                <div className="sc-no" aria-hidden="true">N° {it.num || (i+1)}</div>
                <h3>{it.name || ""}</h3>
                <p>{it.desc || ""}</p>
                <div className="sc-foot"><span>{it.price || ""}</span><a href="#" className="card-link light">İste <span className="arrow">→</span></a></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BirGun({ data }) {
  const b = data.birgun || {};
  const cards = b.cards || [];
  const stripRef = useRef(null);
  const [paused, setPaused] = useState(false);

  const renderCard = (c, i) => (
    <div key={i} className="day-card">
      <div className="day-time">{c.time || ""}</div>
      <div className="day-img" style={{background:`linear-gradient(135deg,${c.color1||"#ccc"},${c.color2||"#999"})`, position:"relative"}}>
        {c.image && <img src={c.image} alt={c.caption || "Bir gün görseli"} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0,borderRadius:"14px"}} />}
      </div>
      <div className="day-cap">{c.caption || ""}</div>
    </div>
  );

  return (
    <section className="sect tones2">
      <div className="wrap">
        <div className="sect-head">
          <div className="sect-eyebrow">— {b.eyebrow || "Bir Gün"} —</div>
          <h2 className="sect-title"><WordReveal>{b.title || "Things'te"} <em>{b.titleEm || "bir gün"}</em> {b.titleRest || "böyle geçer."}</WordReveal></h2>
        </div>
      </div>
      <div className="day-strip-wrapper"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className={`day-strip-track${paused ? " paused" : ""}`} ref={stripRef}>
          {cards.map((c, i) => renderCard(c, i))}
          {cards.map((c, i) => renderCard(c, `dup-${i}`))}
        </div>
      </div>
    </section>
  );
}

function Ziyaret({ data }) {
  const c = data.contact || {};
  const hours = c.hours || [];
  const menu = data.menu || [];
  const cakes = menu.filter(m => m.cat === "cakes");
  return (
    <section id="ziyaret" className="sect">
      <div className="wrap">
        <div className="sect-head">
          <div className="sect-eyebrow">— Ziyaret —</div>
          <h2 className="sect-title"><WordReveal>Geç, otur, <em>kahve içelim.</em></WordReveal></h2>
        </div>
        <div className="visit-grid">
          <div className="visit-card map">
            <div className="map-fake">
              <svg viewBox="0 0 400 280" style={{width:"100%",height:"100%",display:"block"}}>
                <rect width="400" height="280" fill="#f4ecd9"/>
                <path d="M0 90 L 400 110" stroke="#d6c598" strokeWidth="14" fill="none"/>
                <path d="M0 200 L 400 180" stroke="#d6c598" strokeWidth="10" fill="none"/>
                <path d="M120 0 L 130 280" stroke="#d6c598" strokeWidth="12" fill="none"/>
                <path d="M260 0 L 270 280" stroke="#d6c598" strokeWidth="8" fill="none"/>
                <circle cx="200" cy="140" r="14" fill="#a85a2a"/>
                <circle cx="200" cy="140" r="6" fill="#fff"/>
                <text x="200" y="120" textAnchor="middle" fontSize="11" fill="#5a3318" fontFamily="ui-monospace, monospace" letterSpacing="1.5">THINGS · 1</text>
              </svg>
            </div>
            <div className="visit-card-foot">
              <div>
                <div className="vc-l">Adres</div>
                <div className="vc-v">{c.address || ""}</div>
              </div>
              <a href="#" className="card-link">Yol tarifi <span className="arrow">→</span></a>
            </div>
          </div>
          <div className="visit-card hours">
            <div className="vc-l">Açık olduğumuz saatler</div>
            <div className="hours-list">
              {hours.map((h, i) => (
                <div key={i}><span>{h.days}</span><span className="num-mono">{h.time}</span></div>
              ))}
            </div>
            <div className="vc-divider"/>
            <div className="vc-l">İletişim</div>
            <div className="hours-list">
              {c.phone && <div><span>Telefon</span><span className="num-mono">{c.phone}</span></div>}
              {c.whatsapp && <div><span>WhatsApp sipariş</span><span className="num-mono">{c.whatsapp}</span></div>}
              {c.email && <div><span>E-posta</span><span>{c.email}</span></div>}
            </div>
          </div>
          <div className="visit-card form">
            <div className="vc-l">Pasta siparişi</div>
            <h3 className="vc-h">Doğum günleri, küçük kutlamalar — 24 saat önceden lütfen.</h3>
            <div className="form-rows">
              <label><span>Adınız</span><input placeholder="Elif" aria-label="Adınız"/></label>
              <label><span>Tarih</span><input type="date" defaultValue="2026-05-04" aria-label="Sipariş tarihi"/></label>
              <label className="full"><span>Hangi pasta?</span>
                <select aria-label="Pasta seçimi">
                  {cakes.map((ck, i) => <option key={i}>{ck.name}</option>)}
                  <option>Sürpriz — Elif karar versin</option>
                </select>
              </label>
              <label className="full"><span>Bir not</span><textarea rows="2" placeholder="Üstüne ne yazalım?" aria-label="Sipariş notu"/></label>
            </div>
            <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",marginTop:14}}>Siparişi gönder <span className="arrow">→</span></button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SocialIcon({ url, size = 20, label = "" }) {
  try {
    const host = new URL(url).hostname;
    return <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`} alt={label || host} width={size} height={size} style={{borderRadius:4,opacity:.85}} onError={(e)=>{e.target.style.display="none"}} />;
  } catch { return null; }
}

function Footer({ data }) {
  const s = data.settings || {};
  const c = data.contact || {};
  const socials = (data.social || []).filter(s => s.url);
  return (
    <footer>
      <div className="wrap">
        <div className="ft-top">
          <div className="ft-brand">
            <span className="brand-mark big">T</span>
            <h3>{s.siteName || "Things"} <em>{s.siteSubtitle || "pastane"}</em></h3>
            <p>{c.address ? `${c.city || "İstanbul"}'da küçük bir pastane, büyük bir tutku.` : ""}</p>
            {socials.length > 0 && (
              <div className="ft-socials">
                {socials.map((sc, i) => (
                  <a key={i} href={sc.url} target="_blank" rel="noopener noreferrer" className="ft-social-link" title={sc.label || ""} aria-label={sc.label || "Sosyal medya"}>
                    <SocialIcon url={sc.url} size={20} label={sc.label}/>
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="ft-cols">
            <div>
              <h5>Hakkımızda</h5>
              <ul><li><a href="#hikaye">Hikâyemiz</a></li><li><a href="#vitrin">Vitrin</a></li><li><a href="#sezon">Sezonluk</a></li></ul>
            </div>
            <div>
              <h5>Ziyaret</h5>
              <ul><li><a href="#ziyaret">Adres</a></li><li><a href="#ziyaret">Saatler</a></li><li><a href="#">Rezervasyon</a></li></ul>
            </div>
            <div>
              <h5>Bağlan</h5>
              <ul>
                {socials.length > 0
                  ? socials.slice(0, 4).map((sc, i) => (
                    <li key={i}><a href={sc.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <SocialIcon url={sc.url} size={16} label={sc.label}/> {sc.label || "Link"}
                    </a></li>
                  ))
                  : <><li><a href="#">Instagram</a></li><li><a href="#">WhatsApp</a></li></>
                }
              </ul>
            </div>
          </div>
        </div>
        <div className="ft-bot">
          <span>© 2026 {s.siteName || "Things"} {s.siteSubtitle ? s.siteSubtitle.charAt(0).toUpperCase() + s.siteSubtitle.slice(1) : "Pastane"} · {c.city || "İstanbul"}</span>
          <span>Tereyağı, vanilya ve sabırla yapılır. · Designed by <a href="#" style={{color:"var(--accent)"}}>Lucky Studio</a></span>
        </div>
      </div>
    </footer>
  );
}

function App() {
  const [data, setData] = useState(null);
  const [t, setTweak] = useTweaks(window.__TWEAK_DEFAULTS);

  useEffect(() => {
    fetch("/api/data").then(r => r.json()).then(d => {
      setData(d);
      // Sync tweaks with API settings
      if (d.settings) {
        if (d.settings.theme) setTweak("theme", d.settings.theme);
        if (d.settings.fontPair) setTweak("fontPair", d.settings.fontPair);
        if (d.settings.accent) setTweak("accent", d.settings.accent);
      }
    }).catch(() => setData({}));
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = t.theme;
    document.documentElement.dataset.pair = t.fontPair;
    const darkThemes = ["kakao","espresso","gece","tarçın"];
    const isDark = darkThemes.includes(t.theme);
    const accents = {
      caramel:   { light: { a:"#a85a2a", ink:"#5a3318" }, dark: { a:"#e0a070", ink:"#f4d4ad" } },
      framboise: { light: { a:"#b54a59", ink:"#6a2530" }, dark: { a:"#e8828e", ink:"#f4b8be" } },
      pistache:  { light: { a:"#7a8a4a", ink:"#3f4a22" }, dark: { a:"#a8b870", ink:"#d0dca0" } },
      gold:      { light: { a:"#c8a96a", ink:"#7a5d23" }, dark: { a:"#e0c888", ink:"#f4e0b0" } },
      rose:      { light: { a:"#b56a7a", ink:"#7a3848" }, dark: { a:"#d8909e", ink:"#f0c0c8" } },
      chocolate: { light: { a:"#6a3e20", ink:"#3a200e" }, dark: { a:"#c09060", ink:"#e0c0a0" } },
      berry:     { light: { a:"#7a3a6a", ink:"#4a1840" }, dark: { a:"#b870a8", ink:"#d8a8d0" } },
      honey:     { light: { a:"#c89a30", ink:"#7a5e10" }, dark: { a:"#e0b850", ink:"#f0d888" } },
      sage:      { light: { a:"#6a8060", ink:"#3a4a30" }, dark: { a:"#98b088", ink:"#c0d0b0" } },
      copper:    { light: { a:"#b06a3a", ink:"#6a3a18" }, dark: { a:"#d89060", ink:"#f0b898" } },
      plum:      { light: { a:"#6a3050", ink:"#3e1830" }, dark: { a:"#a86888", ink:"#d0a0b8" } },
      cinnamon:  { light: { a:"#8a4a2a", ink:"#5a2e16" }, dark: { a:"#c88050", ink:"#e0b090" } },
    };
    const ac = accents[t.accent] || accents.caramel;
    const a = isDark ? ac.dark : ac.light;
    document.documentElement.style.setProperty("--accent", a.a);
    document.documentElement.style.setProperty("--accent-ink", a.ink);
  }, [t]);

  if (!data) return null; // Loading

  return (
    <>
      <ScrollProgress/>
      <PageTransition/>
      <Nav data={data}/>
      <main id="main-content">
      <Hero data={data}/>
      <Vitrine data={data}/>
      <Hikaye data={data}/>
      <StickyPhilosophy data={data}/>
      <Sezon data={data}/>
      <BirGun data={data}/>
      <Ziyaret data={data}/>
      </main>
      <Footer data={data}/>

      <TweaksPanel>
        <TweakSection label="Görünüm"/>
        <TweakRadio label="Tema" value={t.theme}
                    options={["krem","kakao","vanilya","espresso","fildisi","gece","tarçın","zeytin","lavanta","mermer"]}
                    onChange={(v)=>setTweak("theme", v)}/>
        <TweakRadio label="Tipografi" value={t.fontPair}
                    options={["editöryel","modern","klasik","zarif","minimal","retro","el-yazısı","art-deco","geometric","rustik"]}
                    onChange={(v)=>setTweak("fontPair", v)}/>
        <TweakRadio label="Vurgu rengi" value={t.accent}
                    options={["caramel","framboise","pistache","gold","rose","chocolate","berry","honey","sage","copper","plum","cinnamon"]}
                    onChange={(v)=>setTweak("accent", v)}/>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
