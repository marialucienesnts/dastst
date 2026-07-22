(function() {
  const status = document.getElementById("router-status");

  function setStatus(message) {
    if (status) {
      status.textContent = message;
    }
  }

  async function route() {
    try {
      setStatus("Verificando o ambiente...");
      const state = await window.PGMEI.fetchState();
      window.PGMEI.applyPageTitleByState(state);
      const session = window.PGMEI.getSession();

      if (state.analytics.activePage === "secondary") {
        document.title = "PGMEI - Manutencao";
        window.PGMEI.redirect("/manutencao/");
        return;
      }

      if (session) {
        window.PGMEI.redirect("/oficial/");
        return;
      }

      window.PGMEI.redirect("/login/");
    } catch (error) {
      console.warn("Falha ao consultar estado global:", error.message);
      window.PGMEI.applyPageTitleByState();
      if (window.PGMEI.getSession()) {
        window.PGMEI.redirect("/oficial/");
        return;
      }
      setStatus("Abrindo acesso principal...");
      window.PGMEI.redirect("/login/");
    }
  }

  route();
})();
