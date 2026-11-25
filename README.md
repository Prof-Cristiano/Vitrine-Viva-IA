# Vitrine Viva IA

Projeto didático de marketing digital para um aluno iniciante. O caso é fictício: Café Ipê oferece fatias de bolo de laranja por R$ 12, até domingo e enquanto houver disponibilidade.

## Situação inicial

A interface gera textos e uma imagem para o caso fictício e atualiza a prévia da landing page. Gere os textos primeiro para obter a descrição visual usada na imagem. Não há publicação ou agendamento de conteúdo.

Os modelos configurados são [GLM-4.7-Flash](https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/) para texto e [FLUX.1 schnell](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/) para imagem. Confira disponibilidade, preço e limites antes de usá-los.

## Estrutura

- `public/`: página, estilos e JavaScript do navegador, sem framework ou build.
- `functions/api/`: endpoints `POST /api/generate-text` e `POST /api/generate-image`.
- `.dev.vars.example`: nomes das variáveis para configuração local.

## Desenvolvimento local

Quando for executar o projeto:

1. Instale Node.js e npm. Na raiz do projeto, execute `npm install`.
2. Copie `.dev.vars.example` para `.dev.vars` e configure `TEXT_MODEL` como `@cf/zai-org/glm-4.7-flash` e `IMAGE_MODEL` como `@cf/black-forest-labs/flux-1-schnell`. Não coloque tokens no arquivo nem no navegador.
3. Autentique o Wrangler com `npx wrangler login`.
4. Execute `npm run dev` e abra `http://localhost:8788`.

O comando serve `public/`, encontra `functions/` na raiz e disponibiliza o binding `AI`. O Workers AI usa a conta Cloudflare mesmo durante testes locais e pode gerar custos.

## Fluxo de geração

1. A página envia os dados da oferta à Function de texto, que retorna `concept`, `headline`, `caption`, `story`, `landingText` e `visualPrompt`.
2. A chamada principal e o resumo atualizam a prévia. Os textos podem ser copiados após revisão.
3. A página envia `visualPrompt` como `prompt` à Function de imagem e oferece o JPEG para download. Ao gerar novos textos, a imagem anterior é removida.

## Cloudflare Pages

Configure o projeto com `public` como diretório de saída e `functions/` na raiz. Adicione o binding Workers AI com nome `AI` e as variáveis `TEXT_MODEL` e `IMAGE_MODEL` nos ambientes necessários. Faça um novo deploy após alterar bindings. Para upload direto com Functions, use Wrangler; o upload por arrastar arquivos no painel não compila a pasta `functions/`.

Não são usados D1, R2, login, pagamento, Instagram ou publicação automática. O CTA “Ver detalhes da oferta fictícia” não abre contatos nem páginas externas.
