// Opens images in GitHub PR comments in a zoomable popup instead of a new tab.
// Runs on all of github.com because GitHub navigates between pages without full reloads.
const IMAGES = ".markdown-body img:not(.emoji)";

let overlay, view, counter;
let images = [];
let index = 0;
let scale = 1, x = 0, y = 0;
let drag = null, moved = false;

document.addEventListener("click", (e) => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (!location.pathname.includes("/pull/")) return;
  const img = e.target.closest(IMAGES);
  if (!img || !viewable(img)) return;
  e.preventDefault();
  e.stopPropagation();
  // GitHub's GIF player keeps a hidden copy of each GIF, so only visible images count.
  images = [...document.querySelectorAll(IMAGES)].filter((i) => i.checkVisibility() && viewable(i));
  show(images.indexOf(img));
}, true);

// GitHub links uploaded images to themselves. Images linking elsewhere are badges/buttons
// (Devin Review, CodeRabbit), so their clicks keep the normal link behavior.
function viewable(img) {
  const a = img.closest("a");
  return !a || a.href === img.src || a.href === img.dataset.canonicalSrc;
}

window.addEventListener("keydown", (e) => {
  if (!overlay || overlay.hidden) return;
  const actions = {
    ArrowLeft: () => show(index - 1),
    ArrowRight: () => show(index + 1),
    Escape: () => (overlay.hidden = true),
  };
  if (!actions[e.key]) return;
  e.preventDefault();
  e.stopPropagation();
  actions[e.key]();
}, true);

// Shows image i, wrapping around at either end.
function show(i) {
  if (!overlay) build();
  index = (i + images.length) % images.length;
  view.src = images[index].currentSrc || images[index].src;
  counter.textContent = `${index + 1} / ${images.length}`;
  scale = 1, x = 0, y = 0;
  render();
  overlay.hidden = false;
}

function build() {
  overlay = document.createElement("div");
  overlay.className = "ghiv-overlay";
  view = document.createElement("img");
  view.className = "ghiv-img";
  view.draggable = false;
  counter = document.createElement("div");
  counter.className = "ghiv-counter";
  overlay.append(view, counter);
  document.body.append(overlay);

  overlay.addEventListener("pointerdown", () => (moved = false));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay && !moved) overlay.hidden = true;
  });
  overlay.addEventListener("wheel", (e) => {
    e.preventDefault();
    // Clamp so a mouse wheel notch and a trackpad pinch both zoom at a usable speed.
    zoomTo(e, scale * Math.exp(-Math.max(-40, Math.min(40, e.deltaY)) * 0.005));
  }, { passive: false });
  view.addEventListener("dblclick", (e) => zoomTo(e, scale > 1 ? 1 : 2.5));
  view.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    drag = { x: e.clientX - x, y: e.clientY - y };
    view.setPointerCapture(e.pointerId);
  });
  view.addEventListener("pointermove", (e) => {
    if (!drag) return;
    x = e.clientX - drag.x;
    y = e.clientY - drag.y;
    moved = true;
    render();
  });
  view.addEventListener("pointerup", () => (drag = null));
}

// Zooms to `next` while keeping the point under the cursor fixed.
function zoomTo(e, next) {
  next = Math.min(20, Math.max(1, next));
  if (next === 1) {
    x = y = 0;
  } else {
    const mx = e.clientX - innerWidth / 2;
    const my = e.clientY - innerHeight / 2;
    x = mx - (mx - x) * (next / scale);
    y = my - (my - y) * (next / scale);
  }
  scale = next;
  render();
}

function render() {
  view.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
}
