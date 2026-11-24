# Vitrine Viva IA

Projeto didático de marketing digital para um aluno iniciante. O caso é fictício: Café Ipê oferece fatias de bolo de laranja por R$ 12, até domingo e enquanto houver disponibilidade.

## Situação inicial

A interface e a prévia da landing page estão prontas para servir de base. A geração de textos e imagens **ainda não está implementada**: os botões mostram uma mensagem explicativa. Não há publicação ou agendamento de conteúdo.

Os modelos devem ser escolhidos no [catálogo do Workers AI](https://developers.cloudflare.com/workers-ai/models/). Antes de implementar cada chamada, confira na documentação atual do modelo seu ID, disponibilidade, preço, entradas, saídas e limites. Os formatos e IDs não foram presumidos.

## Estrutura

- `public/`: página, estilos e JavaScript do navegador, sem framework ou build.
- `functions/api/`: endpoints `POST /api/generate-text` e `POST /api/generate-image`.
- `.dev.vars.example`: nomes das variáveis para configuração local.
- `.github/copilot-instructions.md`: orientações do projeto para o Copilot.

## Desenvolvimento local

Quando for executar o projeto:

1. Instale Node.js e npm. Na raiz do projeto, execute `npm install`.
2. Copie `.dev.vars.example` para `.dev.vars` e substitua os exemplos pelos IDs dos modelos escolhidos. Não coloque tokens no arquivo nem no navegador.
3. Autentique o Wrangler com `npx wrangler login`.
4. Execute `npm run dev` e abra `http://localhost:8788`.

O comando serve `public/`, encontra `functions/` na raiz e disponibiliza o binding `AI`. O Workers AI usa a conta Cloudflare mesmo durante testes locais e pode gerar custos. Nesta estrutura inicial, os endpoints ainda não chamam nenhum modelo.

## Próximos passos para a geração

1. Implementar cada Function com `context.env.AI` e o ID configurado em `context.env.TEXT_MODEL` ou `context.env.IMAGE_MODEL`.
2. Validar o pedido, adaptar a entrada e interpretar a saída conforme a documentação do modelo escolhido. Responder com erros claros em caso de falha.
3. A Function de texto deve retornar JSON com `campaignText`, `landingTitle` e `landingDescription`, todos textos não vazios. A Function de imagem deve retornar os bytes da imagem com `Content-Type` apropriado. Esses são contratos da aplicação, não formatos presumidos dos modelos.
4. Verificar os dados da oferta, o botão demonstrativo, a cópia e o download, incluindo falhas de configuração e geração.

## Cloudflare Pages

Configure o projeto com `public` como diretório de saída e `functions/` na raiz. Adicione o binding Workers AI com nome `AI` e as variáveis `TEXT_MODEL` e `IMAGE_MODEL` nos ambientes necessários. Faça um novo deploy após alterar bindings. Para upload direto com Functions, use Wrangler; o upload por arrastar arquivos no painel não compila a pasta `functions/`.

Não são usados D1, R2, login, pagamento, Instagram ou publicação automática. O CTA “Ver detalhes da oferta fictícia” não abre contatos nem páginas externas.
