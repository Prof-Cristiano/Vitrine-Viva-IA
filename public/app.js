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

function definirStatus(elemento, texto, estado) {
  elemento.textContent = texto;
  if (estado) elemento.dataset.estado = estado;
  else delete elemento.dataset.estado;
}

function marcarEtapa(atual, feitas) {
  for (let n = 1; n <= 4; n++) {
    const item = $(`#trilha-${n}`);
    if (n === atual) item.dataset.estado = "atual";
    else if (feitas.includes(n)) item.dataset.estado = "feito";
    else delete item.dataset.estado;
  }
}

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
  const imagemPrevia = $("#previa-imagem");
  imagemPrevia.removeAttribute("src");
  imagemPrevia.hidden = true;
  $("#previa-imagem-vazio").hidden = false;
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
  $("#previa-negocio").textContent = briefing.estabelecimento;
  $("#previa-produto").textContent = briefing.produto;
  for (const [campo, id] of [["preco", "preco"], ["validade", "validade"]]) {
    $(`#previa-${id}`).textContent = briefing[campo] || "";
    $(`#previa-${id}-bloco`).hidden = !briefing[campo];
  }
  $("#previa-oferta").hidden = !briefing.preco && !briefing.validade;
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
  definirStatus(statusCopia, "");
  definirStatus(statusTexto, "Gerando textos... isso pode levar alguns segundos.", "carregando");
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
    definirStatus(statusImagem, "Textos prontos. Agora você pode gerar a imagem.");
    definirStatus(statusTexto, "Textos gerados. Confira os fatos antes de usar.", "sucesso");
    marcarEtapa(3, [1, 2, 4]);
  } catch (erro) {
    definirStatus(statusTexto, `Não foi possível gerar os textos: ${erro.message}`, "erro");
  } finally {
    ocupado = false;
    atualizarBotoes();
  }
});

botaoExemplo.addEventListener("click", () => {
  for (const campo of CAMPOS) formulario.elements[campo].value = EXEMPLO[campo];
  erroFormulario.hidden = true;
  definirStatus(statusTexto, "Exemplo preenchido. Você pode editar os campos antes de gerar.", "sucesso");
});

botaoImagem.addEventListener("click", async () => {
  if (!promptVisual) return;
  ocupado = true;
  atualizarBotoes();
  definirStatus(statusImagem, "Gerando imagem... isso pode levar alguns segundos.", "carregando");
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
    $("#previa-imagem").src = enderecoImagem;
    $("#previa-imagem").hidden = false;
    $("#previa-imagem-vazio").hidden = true;
    linkDownload.href = enderecoImagem;
    linkDownload.download = "vitrine-viva-ia.jpg";
    linkDownload.hidden = false;
    definirStatus(statusImagem, "Imagem gerada por IA. Confira se combina com a oferta antes de baixar.", "sucesso");
    marcarEtapa(4, [1, 2, 3]);
  } catch (erro) {
    definirStatus(statusImagem, `Não foi possível gerar a imagem: ${erro.message}`, "erro");
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
    definirStatus(statusCopia, `Copiado: ${titulo}.`, "sucesso");
  } catch {
    definirStatus(statusCopia, "Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.", "erro");
  }
});

$("#cta-demo").addEventListener("click", () => {
  $("#cta-aviso").textContent = "Este botão é só uma demonstração: nenhum link foi aberto e nada foi enviado.";
});

atualizarBotoes();
