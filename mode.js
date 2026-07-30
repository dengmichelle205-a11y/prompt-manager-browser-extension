(() => {
  const params = new URLSearchParams(window.location.search);
  const isPopupByQuery = params.get("popup") === "1";
  const isLikelyPopup =
    window.matchMedia("(max-width: 560px)").matches &&
    window.matchMedia("(max-height: 760px)").matches;

  document.documentElement.classList.add(
    isPopupByQuery || isLikelyPopup ? "popup-mode" : "page-mode"
  );
})();
