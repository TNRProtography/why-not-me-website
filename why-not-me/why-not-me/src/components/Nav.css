.main-nav {
  position: relative;
  z-index: 2;
  padding: 18px 42px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  background: rgba(13,13,13,0.94);
}

.main-nav.scrolled {
  background: rgba(13,13,13,0.96);
  padding: 10px 42px;
}

.nav-logo-link {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
}

.nav-logo {
  height: 62px;
  width: auto;
  object-fit: contain;
}

.nav-mobile-donation {
  display: none;
}

.nav-links {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 34px;
  align-items: center;
}

.nav-link {
  color: var(--white);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 3px;
  text-transform: uppercase;
  position: relative;
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: -7px;
  left: 50%;
  width: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
  transform: translateX(-50%);
}

.nav-link:hover,
.nav-link.active {
  color: var(--gold);
}

.nav-link:hover::after,
.nav-link.active::after {
  width: 120%;
}

.nav-donate-btn {
  background: rgba(168,142,93,0.92);
  color: var(--black) !important;
  padding: 11px 23px;
  border: 1px solid rgba(245,243,236,0.18);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;

}

.nav-donate-btn:hover {
  background: var(--warm);
}

.hamburger {
  display: none;
  position: relative;
  z-index: 1001;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
}

.hamburger span {
  width: 25px;
  height: 2px;
  background: var(--white);
  display: block;
}

.hamburger.open span:nth-child(1) { transform: rotate(45deg) translate(6px, 6px); }
.hamburger.open span:nth-child(2) { opacity: 0; }
.hamburger.open span:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }

.mobile-menu {
  position: fixed;
  inset: 0;
  z-index: 999;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--black);
  display: flex;
  justify-content: center;
  align-items: center;
}

.mobile-menu-bg {
  position: absolute;
  inset: 0;
  background: var(--black);
}

.mobile-menu-close {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
  background: none;
  border: none;
  color: var(--white-50);
  font-size: 36px;
  line-height: 1;
  cursor: pointer;
  padding: 8px;
  transition: color 0.2s;
}

.mobile-menu-close:hover {
  color: var(--gold);
}

.mobile-menu-inner {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  padding: 100px 20px 60px;
  min-height: min-content;
}

.mobile-menu a {
  color: var(--white);
  font-family: var(--font-hero);
  font-size: clamp(42px, 12vw, 72px);
  line-height: 0.95;

}

.mobile-menu a:hover,
.mobile-menu a.active {
  color: var(--gold);
}

@media (max-width: 1050px) {
  .nav-links { gap: 22px; }
  .nav-link { letter-spacing: 2px; }
}

@media (max-width: 900px) {
  .nav-links { display: none; }
  .hamburger { display: flex; }
  .main-nav { padding: 12px 20px; }
  .main-nav.scrolled { padding: 8px 20px; }
  .nav-logo { height: 56px; }
}

/* ============ MOBILE-SPECIFIC NAV VIEW ============ */
body.is-mobile-view .main-nav {
  gap: 14px;
  padding: 12px 18px;
  background: rgba(13,13,13,0.96);
}

body.is-mobile-view .main-nav.scrolled {
  padding: 9px 18px;
  background: rgba(13,13,13,0.98);
}

body.is-mobile-view .nav-logo {
  height: 56px;
}

body.is-mobile-view .nav-logo-link {
  flex: 0 0 auto;
}

body.is-mobile-view .nav-mobile-donation {
  display: block;
  flex: 1 1 auto;
  min-width: 0;
  margin-left: auto;
}

body.is-mobile-view .hamburger {
  display: flex;
  flex: 0 0 auto;
  min-width: 52px;
  min-height: 52px;
  justify-content: center;
  align-items: center;
  border: 1px solid rgba(245,243,236,0.1);
  background: rgba(13,13,13,0.5);
}

body.is-mobile-view .mobile-menu-inner {
  width: min(100%, 420px);
  padding: 0 26px;
  gap: 26px;
}

body.is-mobile-view .mobile-menu a {
  display: block;
  width: 100%;
  padding: 6px 0;
  text-align: center;
  font-size: clamp(46px, 15vw, 74px);
}

@media (max-width: 420px) {
  body.is-mobile-view .main-nav {
    gap: 9px;
    padding-left: 14px;
    padding-right: 14px;
  }

  body.is-mobile-view .nav-logo {
    height: 50px;
  }

  body.is-mobile-view .mobile-menu a {
    font-size: clamp(42px, 14vw, 64px);
  }
}
