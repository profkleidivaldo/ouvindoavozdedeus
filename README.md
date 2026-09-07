# Ouvindo a Voz de Deus — Estudo Bíblico Interativo

Aplicação estática para GitHub Pages, sem build e sem servidor próprio.

## Estrutura

```text
/
├── index.html
├── README.md
└── assets/
    ├── app.js
    ├── biblia.js
    ├── data.js
    └── styles.css
```

## Como publicar no GitHub Pages

1. Substitua os arquivos antigos por estes arquivos, mantendo a pasta `assets`.
2. Faça commit e push para o repositório.
3. Em **Settings → Pages**, selecione a branch que contém o projeto e a pasta `/ (root)`.
4. Abra a URL do GitHub Pages.
5. Faça um recarregamento forçado (`Ctrl+F5`) depois da atualização.

## O que foi corrigido

- `biblia.js` agora é carregado antes de `app.js`; sem isso o popup bíblico não conseguia encontrar `parseReferencias()` e `buscarPassagem()`.
- O nome do CSS está alinhado com o `index.html`: `assets/styles.css`.
- O parser bíblico agora respeita referências como `Mateus 24:6, 7, 10`, sem transformar a lista em um intervalo 6–10.
- Referências com capítulo compartilhado, como `João 16:13; 8:32`, continuam funcionando.
- O popup permite trocar a versão bíblica e mostra apenas os versículos solicitados.
- A busca de imagens foi reforçada com consultas específicas para vários estudos e continua usando a API pública do Wikimedia Commons.
- O crédito da imagem passa a exibir autor/crédito e licença quando esses metadados estiverem disponíveis.
- O site continua funcionando sem IA: o tutor de ajuda usa dicas estáticas quando não há uma chave configurada.

## Observações

O texto bíblico é obtido sob demanda da API configurada em `assets/biblia.js`. Portanto, o popup depende de conexão com a internet e da disponibilidade dessa API.

As imagens são buscadas sob demanda no Wikimedia Commons. Cada arquivo possui sua própria licença; por isso o aplicativo exibe os metadados de crédito/licença disponíveis e não assume que todas as obras têm a mesma licença.

A chave de IA, quando usada, fica somente no `localStorage` do navegador. Não coloque chaves de API diretamente em `app.js` ou `data.js`.
