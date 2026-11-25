function criarEstudio() {
  const formatos = {
    post: { nome: "folder-quadrado", largura: 1080, altura: 1080 },
    avatar: { nome: "avatar", largura: 1080, altura: 1080 },
    capa: { nome: "capa", largura: 1600, altura: 900 },
    story: { nome: "story", largura: 1080, altura: 1920 },
    poster: { nome: "poster-digital", largura: 1200, altura: 1600 },
    flyer: { nome: "flyer-digital", largura: 1200, altura: 1800 }
  };
  const paletas = {
    terracota: { fundo: "#fbf7f0", texto: "#3b2a20", destaque: "#963f14", marca: "#3b2a20" },
    verde: { fundo: "#f2f7ef", texto: "#173d2b", destaque: "#245d3b", marca: "#173d2b" },
    azul: { fundo: "#f4f8ff", texto: "#173459", destaque: "#194c80", marca: "#173459" }
  };
  const controles = {
    formato: document.querySelector("#estudio-formato"),
    negocio: document.querySelector("#estudio-negocio"),
    chamada: document.querySelector("#estudio-chamada"),
    texto: document.querySelector("#estudio-texto"),
    paleta: document.querySelector("#estudio-paleta"),
    zoom: document.querySelector("#estudio-zoom"),
    x: document.querySelector("#estudio-x"),
    y: document.querySelector("#estudio-y")
  };
  const canvas = document.querySelector("#estudio-previa");
  const status = document.querySelector("#estudio-status");
  const baixar = document.querySelector("#estudio-baixar");
  const estados = {};
  let base = null;
  let foto = null;
  let geometria = null;
  let arrasto = null;
  let exportando = false;

  function estadoAtual() {
    const formato = controles.formato.value;
    if (!estados[formato]) {
      estados[formato] = {
        negocio: base.briefing.estabelecimento,
        chamada: base.resultado.headline,
        texto: formato === "story" ? base.resultado.story : base.resultado.landingText,
        paleta: "terracota",
        zoom: 100,
        x: 50,
        y: 50
      };
    }
    return estados[formato];
  }

  function preencher() {
    const estado = estadoAtual();
    for (const chave of ["negocio", "chamada", "texto", "paleta", "zoom", "x", "y"]) {
      controles[chave].value = estado[chave];
    }
    desenhar();
  }

  function linhasDeTexto(ctx, texto, largura) {
    const linhas = [];
    for (const paragrafo of texto.split("\n")) {
      let linha = "";
      for (const palavra of paragrafo.trim().split(/\s+/).filter(Boolean)) {
        const proposta = linha ? `${linha} ${palavra}` : palavra;
        if (ctx.measureText(proposta).width <= largura) {
          linha = proposta;
          continue;
        }
        if (linha) linhas.push(linha);
        linha = "";
        for (const caractere of palavra) {
          if (linha && ctx.measureText(linha + caractere).width > largura) {
            linhas.push(linha);
            linha = "";
          }
          linha += caractere;
        }
      }
      linhas.push(linha);
    }
    return linhas;
  }

  function desenhar() {
    if (!foto || !base) return;
    const formato = formatos[controles.formato.value];
    const estado = estadoAtual();
    const cores = paletas[estado.paleta];
    canvas.width = formato.largura;
    canvas.height = formato.altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      status.textContent = "Este navegador não permite desenhar a composição.";
      status.dataset.estado = "erro";
      baixar.disabled = true;
      return;
    }

    const w = canvas.width;
    const h = canvas.height;
    const unidade = Math.min(w, h);
    const margem = unidade * 0.055;
    const rodape = h * 0.075;
    const topoFoto = h * 0.105;
    const alturaFoto = h * 0.50;
    const larguraFoto = w - 2 * margem;
    const escala = Math.max(larguraFoto / foto.naturalWidth, alturaFoto / foto.naturalHeight) * estado.zoom / 100;
    const origemLargura = larguraFoto / escala;
    const origemAltura = alturaFoto / escala;
    const maxX = Math.max(0, foto.naturalWidth - origemLargura);
    const maxY = Math.max(0, foto.naturalHeight - origemAltura);
    const origemX = maxX * estado.x / 100;
    const origemY = maxY * estado.y / 100;
    geometria = { margem, topoFoto, larguraFoto, alturaFoto, origemLargura, origemAltura, maxX, maxY };

    ctx.fillStyle = cores.fundo;
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(foto, origemX, origemY, origemLargura, origemAltura, margem, topoFoto, larguraFoto, alturaFoto);

    const fonte = 'system-ui, -apple-system, "Segoe UI", sans-serif';
    const larguraTexto = w - 2 * margem;
    ctx.textBaseline = "top";
    ctx.fillStyle = cores.destaque;
    ctx.font = `700 ${Math.round(unidade * 0.027)}px ${fonte}`;
    const linhasNegocio = linhasDeTexto(ctx, estado.negocio.trim(), larguraTexto);
    ctx.fillText(linhasNegocio[0], margem, h * 0.034);

    let y = topoFoto + alturaFoto + h * 0.025;
    const limite = h - rodape - h * 0.025;
    const tamanhoChamada = Math.round(unidade * 0.049);
    const tamanhoTexto = Math.round(unidade * 0.027);
    const passoChamada = tamanhoChamada * 1.18;
    const passoTexto = tamanhoTexto * 1.35;
    ctx.font = `800 ${tamanhoChamada}px ${fonte}`;
    const chamadas = linhasDeTexto(ctx, estado.chamada.trim(), larguraTexto);
    const textoChamada = ctx.font;
    ctx.font = `400 ${tamanhoTexto}px ${fonte}`;
    const textos = estado.texto.trim() ? linhasDeTexto(ctx, estado.texto.trim(), larguraTexto) : [];
    const alturaNecessaria = chamadas.length * passoChamada + (textos.length ? h * 0.014 + textos.length * passoTexto : 0);
    const problemas = [];
    if (!estado.chamada.trim()) problemas.push("Preencha a chamada principal.");
    if (linhasNegocio.length > 1) problemas.push("Encurte o nome do negócio.");
    if (y + alturaNecessaria > limite) problemas.push("Encurte os textos para caberem na composição.");

    ctx.save();
    ctx.beginPath();
    ctx.rect(margem, y, larguraTexto, Math.max(0, limite - y));
    ctx.clip();
    ctx.fillStyle = cores.texto;
    ctx.font = textoChamada;
    for (const linha of chamadas) {
      ctx.fillText(linha, margem, y);
      y += passoChamada;
    }
    if (textos.length) y += h * 0.014;
    ctx.font = `400 ${tamanhoTexto}px ${fonte}`;
    for (const linha of textos) {
      ctx.fillText(linha, margem, y);
      y += passoTexto;
    }
    ctx.restore();

    ctx.fillStyle = cores.marca;
    ctx.fillRect(0, h - rodape, w, rodape);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${Math.round(unidade * 0.024)}px ${fonte}`;
    ctx.textBaseline = "middle";
    ctx.fillText("Vitrine Viva IA", margem, h - rodape / 2);

    document.querySelector("#estudio-dimensoes").textContent = `${w} × ${h} pixels · tamanho de trabalho, não oficial`;
    for (const chave of ["zoom", "x", "y"]) {
      document.querySelector(`#estudio-${chave}-valor`).textContent = `${estado[chave]}%`;
    }
    status.textContent = problemas.length ? problemas.join(" ") : "Confira o recorte, os textos e os dados da oferta antes de baixar.";
    status.dataset.estado = problemas.length ? "erro" : "sucesso";
    baixar.disabled = problemas.length > 0 || exportando;
  }

  for (const chave of ["negocio", "chamada", "texto", "paleta", "zoom", "x", "y"]) {
    controles[chave].addEventListener("input", () => {
      estadoAtual()[chave] = ["zoom", "x", "y"].includes(chave) ? Number(controles[chave].value) : controles[chave].value;
      desenhar();
    });
  }
  controles.formato.addEventListener("change", preencher);

  canvas.addEventListener("pointerdown", (evento) => {
    if (!geometria || evento.button !== 0) return;
    const retangulo = canvas.getBoundingClientRect();
    const x = (evento.clientX - retangulo.left) * canvas.width / retangulo.width;
    const y = (evento.clientY - retangulo.top) * canvas.height / retangulo.height;
    if (x < geometria.margem || x > geometria.margem + geometria.larguraFoto ||
        y < geometria.topoFoto || y > geometria.topoFoto + geometria.alturaFoto) return;
    arrasto = { id: evento.pointerId, x: evento.clientX, y: evento.clientY };
    canvas.setPointerCapture(evento.pointerId);
  });
  canvas.addEventListener("pointermove", (evento) => {
    if (!arrasto || arrasto.id !== evento.pointerId || !geometria) return;
    const retangulo = canvas.getBoundingClientRect();
    const estado = estadoAtual();
    const dx = (evento.clientX - arrasto.x) * canvas.width / retangulo.width;
    const dy = (evento.clientY - arrasto.y) * canvas.height / retangulo.height;
    if (geometria.maxX) estado.x = Math.round(Math.max(0, Math.min(100, estado.x - dx * geometria.origemLargura / geometria.larguraFoto / geometria.maxX * 100)));
    if (geometria.maxY) estado.y = Math.round(Math.max(0, Math.min(100, estado.y - dy * geometria.origemAltura / geometria.alturaFoto / geometria.maxY * 100)));
    arrasto.x = evento.clientX;
    arrasto.y = evento.clientY;
    controles.x.value = estado.x;
    controles.y.value = estado.y;
    desenhar();
  });
  for (const evento of ["pointerup", "pointercancel", "lostpointercapture"]) {
    canvas.addEventListener(evento, () => { arrasto = null; });
  }

  baixar.addEventListener("click", () => {
    if (baixar.disabled) return;
    exportando = true;
    baixar.disabled = true;
    const nome = formatos[controles.formato.value].nome;
    canvas.toBlob((arquivo) => {
      exportando = false;
      if (!arquivo || arquivo.size === 0) {
        status.textContent = "Não foi possível gerar o PNG. Tente novamente ou use outro navegador.";
        status.dataset.estado = "erro";
        baixar.disabled = false;
        return;
      }
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement("a");
      link.href = url;
      link.download = `vitrine-viva-${nome}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      desenhar();
      status.textContent = "Arquivo preparado para download. Confira o resultado antes de usar.";
      status.dataset.estado = "sucesso";
    }, "image/png");
  });

  return {
    definirTextos(briefing, resultado) {
      base = { briefing, resultado };
    },
    definirImagem(imagem) {
      foto = imagem;
      document.querySelector("#estudio-vazio").hidden = true;
      document.querySelector("#estudio").hidden = false;
      preencher();
    },
    limparImagem() {
      foto = null;
      geometria = null;
      document.querySelector("#estudio").hidden = true;
      const vazio = document.querySelector("#estudio-vazio");
      vazio.textContent = "Gere a imagem para continuar. As edições de cada formato permanecem nesta página.";
      vazio.hidden = false;
    },
    informarErro() {
      const vazio = document.querySelector("#estudio-vazio");
      vazio.textContent = "Não foi possível carregar a imagem no estúdio. Gere a imagem novamente ou use outro navegador.";
      vazio.hidden = false;
    }
  };
}
