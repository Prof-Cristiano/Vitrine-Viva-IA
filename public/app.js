const EXEMPLO = {
  estabelecimento: "Café Ipê",
  produto: "bolo de laranja",
  descricao: "Feito no local e vendido em fatias.",
  preco: "R$ 12 por fatia",
  validade: "Válido até domingo, enquanto houver disponibilidade.",
  publico: "Pessoas que moram ou trabalham nas proximidades.",
  tom: "Acolhedor e simples",
  restricoes: "Não afirmar que é sem glúten ou sem lactose."
};
const CAMPOS = ["estabelecimento", "produto", "descricao", "preco", "validade", "publico", "tom", "restricoes"];
const CAMPOS_TEXTO = ["concept", "headline", "caption", "story", "landingText", "visualPrompt"];

const $ = (seletor) => document.querySelector(seletor);
const formulario = $("#formulario");
const erroFormulario = $("#erro-formulario");
const botaoTexto = $("#gerar-texto");
const botaoExemplo = $("#usar-exemplo");
const botaoImagem = $("#gerar-imagem");
const linkDownload = $("#baixar-imagem");
const imagem = $("#imagem-campanha");
const statusTexto = $("#status-texto");
const statusImagem = $("#status-imagem");
const statusCopia = $("#status-copia");
const areaResultados = $("#resultados");

let promptVisual = "";
let enderecoImagem = "";
let ocupado = false;

function atualizarBotoes() {
  botaoTexto.disabled = ocupado;
  botaoExemplo.disabled = ocupado;
  botaoImagem.disabled = ocupado || !promptVisual;
  botaoTexto.setAttribute("aria-busy", String(ocupado));
}

function lerBriefing() {
  const dados = {};
  for (const campo of CAMPOS) {
    const valor = formulario.elements[campo].value.trim();
    if (valor) dados[campo] = valor;
  }
  return dados;
}

function limparImagem() {
  if (enderecoImagem) URL.revokeObjectURL(enderecoImagem);
  enderecoImagem = "";
  imagem.removeAttribute("src");
  imagem.hidden = true;
  linkDownload.removeAttribute("href");
  linkDownload.hidden = true;
}

async function enviar(url, dados) {
  let resposta;
  try {
    resposta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique se o projeto está em execução e tente de novo.");
  }
  if (!resposta.ok) {
    let mensagem = `Algo deu errado (código ${resposta.status}). Tente novamente.`;
    try {
      const erro = await resposta.json();
      if (typeof erro?.error === "string" && erro.error.trim()) mensagem = erro.error;
    } catch {
      // A resposta de erro pode não ser JSON.
    }
    throw new Error(mensagem);
  }
  return resposta;
}

function mostrarPrevia(briefing, resultado) {
  $("#previa-negocio").textContent = `Oferta fictícia • ${briefing.estabelecimento}`;
  $("#previa-produto").textContent = briefing.produto;
  const oferta = [briefing.preco, briefing.validade].filter(Boolean).join(" • ");
  const elementoOferta = $("#previa-oferta");
  elementoOferta.textContent = oferta ? `Oferta confirmada no briefing: ${oferta}` : "";
  elementoOferta.hidden = !oferta;
  const chamada = $("#previa-chamada");
  chamada.textContent = resultado.headline;
  chamada.hidden = false;
  $("#previa-texto").textContent = resultado.landingText;
}

function mostrarResultados(resultado) {
  for (const cartao of areaResultados.querySelectorAll("[data-campo]")) {
    cartao.querySelector(".texto").textContent = resultado[cartao.dataset.campo];
  }
  areaResultados.hidden = false;
  $("#resultados-vazio").hidden = true;
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  erroFormulario.hidden = true;
  const briefing = lerBriefing();
  if (!briefing.estabelecimento || !briefing.produto) {
    erroFormulario.textContent = "Preencha o nome do negócio e o produto para continuar.";
    erroFormulario.hidden = false;
    return;
  }

  ocupado = true;
  atualizarBotoes();
  statusCopia.textContent = "";
  statusTexto.textContent = "Gerando textos... isso pode levar alguns segundos.";
  try {
    const resposta = await enviar("/api/generate-text", briefing);
    const resultado = await resposta.json();
    if (!resultado || CAMPOS_TEXTO.some((campo) =>
      typeof resultado[campo] !== "string" || !resultado[campo].trim())) {
      throw new Error("A resposta da IA veio incompleta. Tente gerar novamente.");
    }
    mostrarResultados(resultado);
    mostrarPrevia(briefing, resultado);
    promptVisual = resultado.visualPrompt;
    limparImagem();
    statusImagem.textContent = "Textos prontos. Agora você pode gerar a imagem.";
    statusTexto.textContent = "Textos gerados. Confira os fatos antes de usar.";
  } catch (erro) {
    statusTexto.textContent = `Não foi possível gerar os textos: ${erro.message}`;
  } finally {
    ocupado = false;
    atualizarBotoes();
  }
});

botaoExemplo.addEventListener("click", () => {
  for (const campo of CAMPOS) formulario.elements[campo].value = EXEMPLO[campo];
  erroFormulario.hidden = true;
  statusTexto.textContent = "Exemplo preenchido. Você pode editar os campos antes de gerar.";
});

botaoImagem.addEventListener("click", async () => {
  if (!promptVisual) return;
  ocupado = true;
  atualizarBotoes();
  statusImagem.textContent = "Gerando imagem... isso pode levar alguns segundos.";
  try {
    const resposta = await enviar("/api/generate-image", { prompt: promptVisual });
    const arquivo = await resposta.blob();
    if (!arquivo.type.startsWith("image/") || arquivo.size === 0) {
      throw new Error("A resposta não trouxe uma imagem válida. Tente novamente.");
    }
    limparImagem();
    enderecoImagem = URL.createObjectURL(arquivo);
    imagem.src = enderecoImagem;
    imagem.hidden = false;
    linkDownload.href = enderecoImagem;
    linkDownload.download = "vitrine-viva-ia.jpg";
    linkDownload.hidden = false;
    statusImagem.textContent = "Imagem gerada por IA. Confira se combina com a oferta antes de baixar.";
  } catch (erro) {
    statusImagem.textContent = `Não foi possível gerar a imagem: ${erro.message}`;
  } finally {
    ocupado = false;
    atualizarBotoes();
  }
});

areaResultados.addEventListener("click", async (evento) => {
  const botao = evento.target.closest(".copiar");
  if (!botao) return;
  const cartao = botao.closest("[data-campo]");
  const titulo = cartao.querySelector("h3").textContent;
  try {
    await navigator.clipboard.writeText(cartao.querySelector(".texto").textContent);
    statusCopia.textContent = `Copiado: ${titulo}.`;
  } catch {
    statusCopia.textContent = "Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.";
  }
});

$("#cta-demo").addEventListener("click", () => {
  $("#cta-aviso").textContent = "Este botão é só uma demonstração: nenhum link foi aberto e nada foi enviado.";
});

atualizarBotoes();
