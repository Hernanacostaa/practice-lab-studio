export function initializeThemeControls() {
  const button = document.getElementById("theme-toggle");
  const refresh = () => {
    const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    button.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
    for (const link of document.querySelectorAll("a[data-site-link]")) {
      const url = new URL(link.getAttribute("href"), document.baseURI);
      url.searchParams.set("scoutTheme", theme);
      link.href = url.href;
    }
  };
  button.addEventListener("click", () => {
    document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    refresh();
  });
  refresh();
}
