import { initializeThemeControls } from "./theme.mjs";

initializeThemeControls();
document.getElementById("theme-toggle").hidden = false;

const legacyDemoAnchors = new Set(["#demo", "#design"]);
function restoreDemoBookmark() {
  if (!legacyDemoAnchors.has(window.location.hash)) return;
  const target = new URL("lab.html", document.baseURI);
  target.search = window.location.search;
  target.hash = window.location.hash;
  window.location.replace(target.href);
}
restoreDemoBookmark();
window.addEventListener("hashchange", restoreDemoBookmark);

const printButton = document.getElementById("print-profile");
printButton.hidden = false;
printButton.addEventListener("click", () => window.print());

const gallery = document.getElementById("photo-gallery");
const track = document.getElementById("gallery-track");
const slides = [...track.querySelectorAll(".gallery-slide")];
const dots = [...gallery.querySelectorAll(".gallery-dot")];
const previous = document.getElementById("gallery-previous");
const next = document.getElementById("gallery-next");
const status = document.getElementById("gallery-status");
const position = document.getElementById("gallery-position");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let activeIndex = 0;
let intendedIndex = null;
let scrollFrame = null;

document.getElementById("gallery-controls").hidden = false;

function refreshGallery(index) {
  activeIndex = index;
  dots.forEach((dot, i) => dot.setAttribute("aria-pressed", String(i === index)));
  previous.disabled = index === 0;
  next.disabled = index === slides.length - 1;
  position.textContent = `${String(index + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
}

function nearestSlide() {
  const edge = track.getBoundingClientRect().left + track.clientLeft;
  let distance = Infinity;
  let nearest = 0;
  slides.forEach((slide, index) => {
    const offset = Math.abs(slide.getBoundingClientRect().left - edge);
    if (offset < distance) {
      nearest = index;
      distance = offset;
    }
  });
  return nearest;
}

function showSlide(index) {
  const target = Math.max(0, Math.min(slides.length - 1, index));
  intendedIndex = target;
  const offset = slides[target].getBoundingClientRect().left - track.getBoundingClientRect().left - track.clientLeft;
  track.scrollTo({ left: track.scrollLeft + offset, behavior: reducedMotion.matches ? "instant" : "smooth" });
  refreshGallery(target);
  status.textContent = `Photo ${target + 1} of ${slides.length}: ${slides[target].querySelector("strong").textContent}.`;
}

previous.addEventListener("click", () => showSlide(activeIndex - 1));
next.addEventListener("click", () => showSlide(activeIndex + 1));
dots.forEach((dot, index) => dot.addEventListener("click", () => showSlide(index)));

track.addEventListener("keydown", (event) => {
  const actions = {
    ArrowLeft: () => showSlide(activeIndex - 1),
    ArrowRight: () => showSlide(activeIndex + 1),
    Home: () => showSlide(0),
    End: () => showSlide(slides.length - 1),
  };
  if (!Object.hasOwn(actions, event.key)) return;
  event.preventDefault();
  actions[event.key]();
});

track.addEventListener("scroll", () => {
  if (scrollFrame !== null) return;
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = null;
    const index = nearestSlide();
    if (intendedIndex === null || index === intendedIndex) {
      intendedIndex = null;
      if (index !== activeIndex) {
        refreshGallery(index);
        status.textContent = `Photo ${index + 1} of ${slides.length}: ${slides[index].querySelector("strong").textContent}.`;
      }
    }
  });
}, { passive: true });
for (const event of ["pointerdown", "wheel"]) {
  track.addEventListener(event, () => { intendedIndex = null; }, { passive: true });
}
track.addEventListener("scrollend", () => {
  intendedIndex = null;
  refreshGallery(nearestSlide());
});
refreshGallery(0);

const navLinks = [...document.querySelectorAll(".main-nav a[href^='#']")];
const sectionObserver = new IntersectionObserver((entries) => {
  const visible = entries.filter((entry) => entry.isIntersecting);
  if (!visible.length) return;
  const id = visible[0].target.id;
  navLinks.forEach((link) => {
    if (link.hash === `#${id}`) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}, { rootMargin: "-15% 0px -60% 0px" });
for (const link of navLinks) {
  const section = document.querySelector(link.hash);
  if (section) sectionObserver.observe(section);
}
