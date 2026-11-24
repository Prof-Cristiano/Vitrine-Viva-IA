const formBriefing = document.querySelector("#briefing-form");
const botaoExemplo = document.querySelector("#usar-exemplo");
const botaoGerarTexto = document.querySelector("#gerar-texto");
const botaoGerarImagem = document.querySelector("#gerar-imagem");
const statusTexto = document.querySelector("#status-texto");
const statusImagem = document.querySelector("#status-imagem");
const statusCopia = document.querySelector("#status-copia");
const resultados = document.querySelector("#resultados");
const imagemCampanha = document.querySelector("#imagem-campanha");
const botaoBaixarImagem = document.querySelector("#baixar-imagem");
const botaoCta = document.querySelector("#cta-demonstrativo");
const statusCta = document.querySelector("#status-cta");
let campanhaAtual;
let urlImagem;
let gerandoTexto = false;
let gerandoImagem = false;

const exemploCafeIpe = {
  estabelecimento: "Café Ipê",
  produto: "Bolo de laranja",
  descricao: "Feito no local e vendido em fatias",
  preco: "R$ 12 por fatia",
  validade: "Válido até domingo enquanto houver disponibilidade",
  publico: "Pessoas que moram ou trabalham nas proximidades",
  tom: "Acolhedor e simples",
  restricoes: "Não afirmar que é sem glúten ou sem lactose."
};

const camposResultado = {
  concept: "#resultado-concept",
  headline: "#resultado-headline",
  caption: "#resultado-caption",
  story: "#resultado-story",
  landingText: "#resultado-landing"
};

function lerBriefing() {
  const dados = new FormData(formBriefing);
  return {
    estabelecimento: dados.get("estabelecimento").trim(),
    produto: dados.get("produto").trim(),
    descricao: dados.get("descricao").trim(),
    preco: dados.get("preco").trim(),
    validade: dados.get("validade").trim(),
    publico: dados.get("publico").trim(),
    tom: dados.get("tom").trim(),
    restricoes: dados.get("restricoes").trim()
  };
}

function atualizarPrevia(briefing, campanha) {
  document.querySelector("#landing-estabelecimento").textContent =
    briefing.estabelecimento || "Nome do negócio";
  document.querySelector("#landing-produto").textContent =
    briefing.produto || "Produto ou serviço";
  document.querySelector("#landing-descricao").textContent =
    briefing.descricao || "A descrição informada aparecerá aqui.";
  document.querySelector("#landing-oferta").textContent =
    [briefing.preco, briefing.validade].filter(Boolean).join(" · ") ||
    "Preço e validade informados aparecerão aqui.";
  document.querySelector("#landing-texto").textContent =
    campanha?.landingText || "O resumo gerado para a landing page aparecerá aqui.";
}

function liberarImagem() {
  if (urlImagem) {
    URL.revokeObjectURL(urlImagem);
    urlImagem = undefined;
  }
  imagemCampanha.removeAttribute("src");
  imagemCampanha.hidden = true;
  botaoBaixarImagem.removeAttribute("href");
  botaoBaixarImagem.hidden = true;
}

function limparCampanha() {
  campanhaAtual = undefined;
  resultados.hidden = true;
  for (const seletor of Object.values(camposResultado)) {
    document.querySelector(seletor).textContent = "";
  }
  statusCopia.textContent = "";
  statusImagem.textContent = "";
  liberarImagem();
  atualizarPrevia(lerBriefing());
  atualizarBotoes();
}

function atualizarBotoes() {
  const ocupado = gerandoTexto || gerandoImagem;
  formBriefing.querySelectorAll("input, textarea, button").forEach((controle) => {
    controle.disabled = ocupado;
  });
  botaoExemplo.disabled = ocupado;
  botaoGerarTexto.textContent = gerandoTexto ? "Gerando textos..." : "Gerar textos";
  botaoGerarImagem.disabled = ocupado || !campanhaAtual?.visualPrompt;
  botaoGerarImagem.textContent = gerandoImagem ? "Gerando imagem..." : "Gerar imagem";
}

async function postarJson(url, dados, mensagemPadrao) {
  let resposta;
  try {
    resposta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique a conexão e tente novamente.");
  }

  if (!resposta.ok) {
    let mensagem = mensagemPadrao;
    try {
      const erro = await resposta.json();
      if (typeof erro.error === "string" && erro.error.trim()) {
        mensagem = erro.error;
      }
    } catch {
      mensagem = mensagemPadrao;
    }
    throw new Error(mensagem);
  }

  return resposta;
}

function respostaDeTextoValida(dados) {
  const campos = ["concept", "headline", "caption", "story", "landingText", "visualPrompt"];
  return dados !== null &&
    typeof dados === "object" &&
    !Array.isArray(dados) &&
    campos.every((campo) => typeof dados[campo] === "string" && dados[campo].trim()) &&
    dados.visualPrompt.trim().length <= 2048;
}

formBriefing.addEventListener("input", () => {
  if (gerandoTexto || gerandoImagem) return;
  if (campanhaAtual) {
    limparCampanha();
    statusTexto.textContent = "Briefing alterado. Gere os textos novamente para atualizar a prévia.";
  }
  atualizarPrevia(lerBriefing());
});

botaoExemplo.addEventListener("click", () => {
  for (const [campo, valor] of Object.entries(exemploCafeIpe)) {
    formBriefing.elements.namedItem(campo).value = valor;
  }
  limparCampanha();
  statusTexto.textContent = "Exemplo Café Ipê preenchido. Confira os dados e gere os textos.";
  formBriefing.elements.namedItem("estabelecimento").focus();
});

formBriefing.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!formBriefing.reportValidity()) return;

  const briefing = lerBriefing();
  limparCampanha();
  gerandoTexto = true;
  atualizarBotoes();
  statusTexto.textContent = "Preparando sugestões. Isso pode levar alguns instantes.";

  try {
    const resposta = await postarJson(
      "/api/generate-text",
      briefing,
      "Não foi possível gerar os textos. Confira o briefing e tente novamente."
    );
    let dados;
    try {
      dados = await resposta.json();
    } catch {
      throw new Error("O servidor retornou uma resposta inválida. Tente gerar novamente.");
    }
    if (!respostaDeTextoValida(dados)) {
      throw new Error("A resposta do servidor está incompleta. Tente gerar novamente.");
    }

    campanhaAtual = {
      concept: dados.concept.trim(),
      headline: dados.headline.trim(),
      caption: dados.caption.trim(),
      story: dados.story.trim(),
      landingText: dados.landingText.trim(),
      visualPrompt: dados.visualPrompt.trim()
    };

    for (const [campo, seletor] of Object.entries(camposResultado)) {
      document.querySelector(seletor).textContent = campanhaAtual[campo];
    }
    resultados.hidden = false;
    atualizarPrevia(briefing, campanhaAtual);
    statusTexto.textContent = "Sugestões prontas. Revise os fatos antes de usar.";
  } catch (erro) {
    statusTexto.textContent = erro instanceof Error
      ? erro.message
      : "Não foi possível gerar os textos. Tente novamente.";
  } finally {
    gerandoTexto = false;
    atualizarBotoes();
  }
});

resultados.addEventListener("click", async (evento) => {
  const botao = evento.target.closest("[data-copy-id]");
  if (!botao) return;

  const texto = document.querySelector(`#${botao.dataset.copyId}`)?.textContent;
  if (!texto) {
    statusCopia.textContent = "Não há texto para copiar.";
    return;
  }

  try {
    await navigator.clipboard.writeText(texto);
    statusCopia.textContent = "Texto copiado. Revise-o antes de usar.";
  } catch {
    statusCopia.textContent = "Não foi possível copiar automaticamente. Selecione e copie o texto.";
  }
});

botaoGerarImagem.addEventListener("click", async () => {
  if (!campanhaAtual?.visualPrompt) {
    statusImagem.textContent = "Gere os textos primeiro para criar uma descrição visual.";
    return;
  }

  gerandoImagem = true;
  atualizarBotoes();
  liberarImagem();
  statusImagem.textContent = "Criando a imagem. Isso pode levar alguns instantes.";

  try {
    const resposta = await postarJson(
      "/api/generate-image",
      { visualPrompt: campanhaAtual.visualPrompt },
      "Não foi possível gerar a imagem. Confira a descrição e tente novamente."
    );
    const tipo = resposta.headers.get("Content-Type")?.split(";")[0].trim();
    const imagem = await resposta.blob();
    if (tipo !== "image/jpeg" || imagem.size === 0) {
      throw new Error("O servidor não retornou uma imagem válida.");
    }

    urlImagem = URL.createObjectURL(imagem);
    imagemCampanha.src = urlImagem;
    imagemCampanha.hidden = false;
    botaoBaixarImagem.href = urlImagem;
    botaoBaixarImagem.download = "vitrine-viva-campanha.jpg";
    botaoBaixarImagem.hidden = false;
    statusImagem.textContent = "Imagem pronta. Confira o resultado antes de baixar.";
  } catch (erro) {
    statusImagem.textContent = erro instanceof Error
      ? erro.message
      : "Não foi possível gerar a imagem. Tente novamente.";
  } finally {
    gerandoImagem = false;
    atualizarBotoes();
  }
});

botaoCta.addEventListener("click", () => {
  statusCta.textContent = "Este CTA é demonstrativo; nenhum link será aberto.";
});

window.addEventListener("pagehide", liberarImagem);
atualizarPrevia(lerBriefing());
atualizarBotoes();
