export async function onRequestPost(context) {
  if (!context.env.AI || !context.env.TEXT_MODEL) {
    return Response.json(
      { error: "Configure o binding AI e a variável TEXT_MODEL." },
      { status: 503 }
    );
  }

  // A chamada depende do modelo escolhido e da documentação atual.
  return Response.json(
    { error: "A geração de textos ainda não foi implementada para um modelo." },
    { status: 501 }
  );
}
