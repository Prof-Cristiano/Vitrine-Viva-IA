const EXEMPLO = {
  estabelecimento: "Café Ipê",
  produto: "bolo de laranja",
  descricao: "Feito no local e vendido em fatias.",
  preco: "R$ 12 por fatia",
  validade: "Válido até domingo, enquanto houver disponibilidade.",
  publico: "Pessoas que moram ou trabalham nas proximidades.",
  tom: "Acolhedor e simples",
  restricoes: "Não afirmar que é sem glúten ou sem lactose.",
  sensacao: "Aconchego e tranquilidade",
  estiloVisual: "Fotografia natural",
  paletaCores: "Tons quentes e terrosos",
  iluminacao: "Luz suave de janela",
  composicao: "Produto à esquerda, com espaço livre à direita.",
  elementosEvitar: "Embalagens e objetos que não fazem parte da oferta."
};
const CAMPOS_VISUAIS = ["sensacao", "estiloVisual", "paletaCores", "iluminacao", "composicao", "elementosEvitar"];
const CAMPOS = ["estabelecimento", "produto", "descricao", "preco", "validade", "publico", "tom", "restricoes", ...CAMPOS_VISUAIS];
const CAMPOS_TEXTO = ["concept", "headline", "caption", "story", "landingText", "visualPrompt"];
const LIMITE_PROMPT = 2048;

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
const campoPrompt = $("#prompt-visual");
const botaoRestaurar = $("#restaurar-prompt");
const erroPrompt = $("#prompt-erro");
const estudio = criarEstudio();

let promptSugerido = "";
let enderecoImagem = "";
let imagemOriginal = null;
const LADO_CRIATIVO = 1080;
const botaoReajustar = $("#reajustar-imagem");
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
  botaoImagem.disabled = ocupado || !promptSugerido || !campoPrompt.value.trim() || campoPrompt.value.length > LIMITE_PROMPT;
  botaoReajustar.disabled = ocupado;
  botaoRestaurar.disabled = ocupado || !promptSugerido;
  campoPrompt.readOnly = ocupado;
  botaoTexto.setAttribute("aria-busy", String(ocupado));
}

function atualizarPrompt() {
  const tamanho = campoPrompt.value.length;
  $("#prompt-contador").textContent = `${tamanho} / ${LIMITE_PROMPT} caracteres`;
  const invalido = !campoPrompt.value.trim() || tamanho > LIMITE_PROMPT;
  erroPrompt.textContent = invalido ? "Informe uma descrição visual com até 2048 caracteres para gerar a imagem." : "";
  erroPrompt.hidden = !invalido;
  campoPrompt.setAttribute("aria-invalid", String(invalido));
  atualizarBotoes();
}

function lerBriefing() {
  const dados = {};
  for (const campo of CAMPOS) {
    const valor = formulario.elements[campo].value.trim();
    if (valor) dados[campo] = valor;
  }
  return dados;
}

function carregarImagem(endereco) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => (img.naturalWidth > 0 && img.naturalHeight > 0 ? resolve(img) : reject(new Error()));
    img.onerror = () => reject(new Error());
    img.src = endereco;
  });
}

// Recorta o centro em 1:1, exporta 1080x1080 e desenha a marca d'água no navegador.
async function criarCriativo(original) {
  const url = URL.createObjectURL(original);
  try {
    let img;
    try {
      img = await carregarImagem(url);
    } catch {
      throw new Error("A imagem não carregou corretamente. Gere a imagem de novo.");
    }
    try {
      const lado = Math.min(img.naturalWidth, img.naturalHeight);
      const tela = document.createElement("canvas");
      tela.width = LADO_CRIATIVO;
      tela.height = LADO_CRIATIVO;
      const ctx = tela.getContext("2d");
      if (!ctx) throw new Error("sem canvas");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado,
        0, 0, LADO_CRIATIVO, LADO_CRIATIVO);

      const faixa = ctx.createLinearGradient(0, LADO_CRIATIVO - 220, 0, LADO_CRIATIVO);
      faixa.addColorStop(0, "rgba(0, 0, 0, 0)");
      faixa.addColorStop(1, "rgba(0, 0, 0, 0.6)");
      ctx.fillStyle = faixa;
      ctx.fillRect(0, LADO_CRIATIVO - 220, LADO_CRIATIVO, 220);

      const margem = 48;
      const fonte = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = "right";
      ctx.textBaseline = "alphabetic";
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 6;
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 40px ${fonte}`;
      ctx.fillText("Vitrine Viva IA", LADO_CRIATIVO - margem, LADO_CRIATIVO - margem - 36);
      ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
      ctx.font = `400 28px ${fonte}`;
      ctx.fillText("imagem criada com IA", LADO_CRIATIVO - margem, LADO_CRIATIVO - margem);

      const final = await new Promise((resolve) => tela.toBlob(resolve, "image/jpeg", 0.92));
      if (!final || final.size === 0) throw new Error("sem exportação");
      return final;
    } catch {
      throw new Error("Não foi possível preparar o criativo quadrado neste navegador. Tente de novo ou use outro navegador.");
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function montarCriativo() {
  const final = await criarCriativo(imagemOriginal);
  if (enderecoImagem) URL.revokeObjectURL(enderecoImagem);
  enderecoImagem = URL.createObjectURL(final);
  imagem.src = enderecoImagem;
  imagem.hidden = false;
  $("#quadro-imagem").hidden = false;
  $("#previa-imagem").src = enderecoImagem;
  $("#previa-imagem").hidden = false;
  $("#previa-imagem-vazio").hidden = true;
  linkDownload.href = enderecoImagem;
  linkDownload.download = "vitrine-viva-instagram-whatsapp.jpg";
  linkDownload.hidden = false;
  botaoReajustar.hidden = false;
}

function limparImagem() {
  estudio.limparImagem();
  if (enderecoImagem) URL.revokeObjectURL(enderecoImagem);
  enderecoImagem = "";
  imagemOriginal = null;
  botaoReajustar.hidden = true;
  $("#quadro-imagem").hidden = true;
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

function mostrarDirecao(briefing, sugestao) {
  for (const campo of CAMPOS_VISUAIS) {
    $(`#direcao-${campo}`).textContent = briefing[campo] || "Não informado";
  }
  promptSugerido = sugestao;
  campoPrompt.value = sugestao;
  $("#direcao-arte").hidden = false;
  atualizarPrompt();
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
      typeof resultado[campo] !== "string" || !resultado[campo].trim()) ||
      resultado.visualPrompt.length > LIMITE_PROMPT) {
      throw new Error("A resposta da IA veio incompleta. Tente gerar novamente.");
    }
    mostrarResultados(resultado);
    mostrarPrevia(briefing, resultado);
    mostrarDirecao(briefing, resultado.visualPrompt);
    estudio.definirTextos(briefing, resultado);
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

campoPrompt.addEventListener("input", atualizarPrompt);
botaoRestaurar.addEventListener("click", () => {
  campoPrompt.value = promptSugerido;
  atualizarPrompt();
});

botaoImagem.addEventListener("click", async () => {
  const prompt = campoPrompt.value.trim();
  if (!promptSugerido || !prompt || campoPrompt.value.length > LIMITE_PROMPT) {
    atualizarPrompt();
    return;
  }
  ocupado = true;
  atualizarBotoes();
  definirStatus(statusImagem, "Gerando imagem... isso pode levar alguns segundos.", "carregando");
  try {
    const resposta = await enviar("/api/generate-image", { prompt });
    const arquivo = await resposta.blob();
    if (!arquivo.type.startsWith("image/") || arquivo.size === 0) {
      throw new Error("A resposta não trouxe uma imagem válida. Tente novamente.");
    }
    limparImagem();
    imagemOriginal = arquivo;
    await montarCriativo();
    const enderecoOriginal = URL.createObjectURL(arquivo);
    try {
      estudio.definirImagem(await carregarImagem(enderecoOriginal));
    } catch {
      estudio.informarErro();
    } finally {
      URL.revokeObjectURL(enderecoOriginal);
    }
    definirStatus(statusImagem, "Imagem gerada por IA e preparada em 1:1 com marca d'água. Confira se combina com a oferta antes de baixar.", "sucesso");
    marcarEtapa(4, [1, 2, 3]);
  } catch (erro) {
    definirStatus(statusImagem, `Não foi possível gerar a imagem: ${erro.message}`, "erro");
  } finally {
    ocupado = false;
    atualizarBotoes();
  }
});

botaoReajustar.addEventListener("click", async () => {
  if (!imagemOriginal) return;
  ocupado = true;
  atualizarBotoes();
  definirStatus(statusImagem, "Preparando o criativo quadrado...", "carregando");
  try {
    await montarCriativo();
    definirStatus(statusImagem, "Criativo quadrado preparado de novo, sem gerar outra imagem.", "sucesso");
  } catch (erro) {
    definirStatus(statusImagem, erro.message, "erro");
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
