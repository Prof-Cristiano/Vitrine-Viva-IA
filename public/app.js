const dadosOferta = {
  estabelecimento: "Café Ipê",
  produto: "bolo de laranja em fatias",
  preco: "R$ 12",
  validade: "até domingo, enquanto houver disponibilidade",
  cta: "Ver detalhes da oferta fictícia"
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

async function enviarPedido(url) {
  const resposta = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dadosOferta)
  });

  if (!resposta.ok) {
    const erro = await resposta.json();
    throw new Error(erro.error || `Falha na solicitação (${resposta.status}).`);
  }
  return resposta;
}

gerarTexto.addEventListener("click", async () => {
  gerarTexto.disabled = true;
  statusTexto.textContent = "Gerando textos...";
  try {
    const resposta = await enviarPedido("/api/generate-text");
    const resultado = await resposta.json();
    if (typeof resultado.campaignText !== "string" ||
        typeof resultado.landingTitle !== "string" ||
        typeof resultado.landingDescription !== "string" ||
        !resultado.campaignText.trim() || !resultado.landingTitle.trim() ||
        !resultado.landingDescription.trim()) {
      throw new Error("A resposta de texto está incompleta ou inválida.");
    }
    textoCampanha.textContent = resultado.campaignText;
    textoCampanha.hidden = false;
    document.querySelector("#landing-titulo").textContent = resultado.landingTitle;
    document.querySelector("#landing-descricao").textContent = resultado.landingDescription;
    copiarTexto.disabled = false;
    statusTexto.textContent = "Texto gerado. Confira as informações antes de copiar.";
  } catch (erro) {
    statusTexto.textContent = `Não foi possível gerar os textos: ${erro.message}`;
  } finally {
    gerarTexto.disabled = false;
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
  gerarImagem.disabled = true;
  statusImagem.textContent = "Gerando imagem...";
  try {
    const resposta = await enviarPedido("/api/generate-image");
    const imagem = await resposta.blob();
    if (!imagem.type.startsWith("image/") || imagem.size === 0) {
      throw new Error("A resposta não contém uma imagem válida.");
    }
    if (enderecoImagem) URL.revokeObjectURL(enderecoImagem);
    enderecoImagem = URL.createObjectURL(imagem);
    imagemCampanha.src = enderecoImagem;
    imagemCampanha.hidden = false;
    baixarImagem.href = enderecoImagem;
    baixarImagem.download = "cafe-ipe";
    baixarImagem.hidden = false;
    statusImagem.textContent = "Imagem gerada. Confira o resultado antes de baixar.";
  } catch (erro) {
    statusImagem.textContent = `Não foi possível gerar a imagem: ${erro.message}`;
  } finally {
    gerarImagem.disabled = false;
  }
});
