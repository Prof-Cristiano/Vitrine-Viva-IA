const MAX_BODY_BYTES = 16384;

async function readJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError();

  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RangeError();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export async function onRequestPost(context) {
  if (!context.env.AI || context.env.IMAGE_MODEL !== "@cf/black-forest-labs/flux-1-schnell") {
    return Response.json(
      { error: "Configure o binding AI e o modelo de imagem." },
      { status: 503 }
    );
  }

  let input;
  try {
    input = await readJson(context.request);
  } catch (error) {
    return Response.json(
      { error: error instanceof RangeError ? "Pedido muito grande." : "JSON inválido." },
      { status: error instanceof RangeError ? 413 : 400 }
    );
  }

  if (!input || typeof input !== "object" || Array.isArray(input) ||
      typeof input.prompt !== "string" || !input.prompt.trim() || input.prompt.length > 2048) {
    return Response.json(
      { error: "Informe um prompt visual com até 2048 caracteres." },
      { status: 400 }
    );
  }

  try {
    const result = await context.env.AI.run(context.env.IMAGE_MODEL, {
      prompt: input.prompt.trim()
    });
    if (typeof result?.image !== "string" || !result.image) throw new Error();
    const binary = atob(result.image);
    if (!binary.length) throw new Error();
    const image = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new Response(image, { headers: { "Content-Type": "image/jpeg" } });
  } catch {
    return Response.json(
      { error: "Não foi possível gerar a imagem. A cota pode ter sido atingida; tente novamente mais tarde." },
      { status: 502 }
    );
  }
}
