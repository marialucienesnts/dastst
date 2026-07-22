(function() {
  async function syncMaintenance() {
    try {
      const state = await window.PGMEI.fetchState();
      window.PGMEI.applyPageTitleByState(state);
      document.getElementById("secondary-title-label").textContent = state.analytics.secondaryTitle;
      document.getElementById("secondary-message-label").textContent = state.analytics.secondaryMessage;

      if (state.analytics.activePage === "primary") {
        if (window.PGMEI.getSession()) {
          window.PGMEI.redirect("/oficial/");
          return;
        }
        window.PGMEI.redirect("/login/");
      }
    } catch (error) {
      console.warn("Falha ao sincronizar manutencao:", error.message);
    }
  }

  document.addEventListener("DOMContentLoaded", async function() {
    document.title = "PGMEI - Manutencao";
    document.getElementById("secondary-site").classList.add("active");
    try {
      await syncMaintenance();
      await window.PGMEI.recordVisit("secondary", "/manutencao/");
    } catch (error) {
      console.warn("Falha ao registrar visita da manutencao:", error.message);
    }
    setInterval(syncMaintenance, 5000);
  });
})();
