const dadosOferta = {
  estabelecimento: "Café Ipê",
  produto: "bolo de laranja em fatias",
  preco: "R$ 12",
  validade: "até domingo, enquanto houver disponibilidade"
};

const gerarTexto = document.querySelector("#gerar-texto");
const copiarTexto = document.querySelector("#copiar-texto");
const statusTexto = document.querySelector("#status-texto");
const textoCampanha = document.querySelector("#texto-campanha");
const gerarImagem = document.querySelector("#gerar-imagem");
const baixarImagem = document.querySelector("#baixar-imagem");
const statusImagem = document.querySelector("#status-imagem");
const imagemCampanha = document.querySelector("#imagem-campanha");
let enderecoImagem;
let promptVisual;

async function enviarPedido(url, dados) {
  const resposta = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });

  if (!resposta.ok) {
    let mensagem = `Falha na solicitação (${resposta.status}).`;
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

gerarTexto.addEventListener("click", async () => {
  gerarTexto.disabled = true;
  gerarImagem.disabled = true;
  statusTexto.textContent = "Gerando textos...";
  try {
    const resposta = await enviarPedido("/api/generate-text", dadosOferta);
    const resultado = await resposta.json();
    const campos = ["concept", "headline", "caption", "story", "landingText", "visualPrompt"];
    if (!resultado || campos.some((campo) =>
      typeof resultado[campo] !== "string" || !resultado[campo].trim()
    ) || resultado.visualPrompt.length > 2048) {
      throw new Error("A resposta de texto está incompleta ou inválida.");
    }
    textoCampanha.textContent = [
      `Conceito: ${resultado.concept}`,
      `Chamada: ${resultado.headline}`,
      `Legenda: ${resultado.caption}`,
      `Story: ${resultado.story}`,
      `Resumo da landing page: ${resultado.landingText}`,
      `Descrição visual: ${resultado.visualPrompt}`
    ].join("\n\n");
    textoCampanha.hidden = false;
    document.querySelector("#landing-titulo").textContent = resultado.headline;
    document.querySelector("#landing-descricao").textContent = resultado.landingText;
    promptVisual = resultado.visualPrompt;
    if (enderecoImagem) URL.revokeObjectURL(enderecoImagem);
    enderecoImagem = undefined;
    imagemCampanha.removeAttribute("src");
    imagemCampanha.hidden = true;
    baixarImagem.removeAttribute("href");
    baixarImagem.hidden = true;
    statusImagem.textContent = "Agora você pode gerar a imagem para esta campanha.";
    copiarTexto.disabled = false;
    statusTexto.textContent = "Texto gerado. Confira as informações antes de copiar.";
  } catch (erro) {
    statusTexto.textContent = `Não foi possível gerar os textos: ${erro.message}`;
  } finally {
    gerarTexto.disabled = false;
    gerarImagem.disabled = !promptVisual;
  }
});

copiarTexto.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(textoCampanha.textContent);
    statusTexto.textContent = "Texto copiado.";
  } catch (erro) {
    statusTexto.textContent = "Não foi possível copiar. Selecione e copie o texto manualmente.";
  }
});

gerarImagem.addEventListener("click", async () => {
  if (!promptVisual) return;
  gerarImagem.disabled = true;
  gerarTexto.disabled = true;
  statusImagem.textContent = "Gerando imagem...";
  try {
    const resposta = await enviarPedido("/api/generate-image", { prompt: promptVisual });
    const imagem = await resposta.blob();
    if (!imagem.type.startsWith("image/") || imagem.size === 0) {
      throw new Error("A resposta não contém uma imagem válida.");
    }
    if (enderecoImagem) URL.revokeObjectURL(enderecoImagem);
    enderecoImagem = URL.createObjectURL(imagem);
    imagemCampanha.src = enderecoImagem;
    imagemCampanha.hidden = false;
    baixarImagem.href = enderecoImagem;
    baixarImagem.download = "cafe-ipe.jpg";
    baixarImagem.hidden = false;
    statusImagem.textContent = "Imagem gerada. Confira o resultado antes de baixar.";
  } catch (erro) {
    statusImagem.textContent = `Não foi possível gerar a imagem: ${erro.message}`;
  } finally {
    gerarImagem.disabled = false;
    gerarTexto.disabled = false;
  }
});
