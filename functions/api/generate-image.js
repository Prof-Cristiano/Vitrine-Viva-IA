const LIMITE_PROMPT = 2048;
const BASE64_VALIDO = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function respostaErro(mensagem, status) {
  return Response.json({ error: mensagem }, { status });
}

export async function onRequestPost(context) {
  const ambiente = context.env;
  if (!ambiente?.AI || typeof ambiente.AI.run !== "function" ||
      typeof ambiente.IMAGE_MODEL !== "string" || !ambiente.IMAGE_MODEL.trim()) {
    return respostaErro("Configure o binding AI e a variável IMAGE_MODEL.", 503);
  }

  let dados;
  try {
    dados = await context.request.json();
  } catch {
    return respostaErro("Envie um JSON válido.", 400);
  }

  if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
    return respostaErro("Envie um objeto JSON com o prompt visual.", 400);
  }

  const valorPrompt = typeof dados.visualPrompt === "string"
    ? dados.visualPrompt
    : dados.prompt;
  if (typeof valorPrompt !== "string" || !valorPrompt.trim()) {
    return respostaErro("Informe o prompt visual como texto.", 400);
  }

  const prompt = valorPrompt.trim();
  if (prompt.length > LIMITE_PROMPT) {
    return respostaErro(`O prompt visual deve ter no máximo ${LIMITE_PROMPT} caracteres.`, 413);
  }

  let resultado;
  try {
    resultado = await ambiente.AI.run(ambiente.IMAGE_MODEL.trim(), { prompt });
  } catch {
    return respostaErro(
      "Não foi possível gerar a imagem. A cota do Workers AI pode ter sido atingida; tente novamente mais tarde.",
      502
    );
  }

  const imagemBase64 = resultado?.image;
  if (typeof imagemBase64 !== "string" || !imagemBase64 ||
      !BASE64_VALIDO.test(imagemBase64)) {
    return respostaErro("O modelo retornou uma imagem inválida. Tente novamente.", 502);
  }

  let bytes;
  try {
    const binario = atob(imagemBase64);
    bytes = new Uint8Array(binario.length);
    for (let indice = 0; indice < binario.length; indice += 1) {
      bytes[indice] = binario.charCodeAt(indice);
    }
  } catch {
    return respostaErro("O modelo retornou uma imagem inválida. Tente novamente.", 502);
  }

  return new Response(bytes, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "no-store"
    }
  });
}
