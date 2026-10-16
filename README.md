# Urna Brasil 2026 — simulação educacional
Projeto independente, **não oficial**, sem vínculo com o TSE. Não é pesquisa de intenção de voto e não produz resultados eleitorais válidos.

## Usar
- Código publicado no GitHub. Site estático sem build: publique a raiz no Netlify.
- Mobile-first: Android, iPhone e desktop. Digite **22** (Flávio Bolsonaro), **13** (Lula); voto branco disponível.
- Som de teclado e confirmação: carregados de `JohnPetros/urna-eletronica/public/audios`, sob licença MIT. Para operação offline, copie os WAV originais para `audios/` e altere `AUDIO_BASE`.
- Fotos de Wikimedia Commons (imagens remotas; credite os fotógrafos segundo as licenças).
- O gráfico mostra **apenas participações nesta simulação**, nunca votos oficiais.

## Conectar Google Sheets
1. Abra o arquivo Google Sheets Urna Eletronica fornecido; a planilha ID já está em `google-apps-script/Code.gs`.
2. Extensões → Apps Script → cole `google-apps-script/Code.gs`, salve.
3. Implantar → Nova implantação → Aplicativo da web → Executar como você; acesso: qualquer pessoa.
4. Copie a URL terminada em `/exec` para `window.URNA_API_URL` no arquivo `config.js` e faça commit.
5. Teste cadastro, voto, tentativa de votar novamente, atualização do placar e dispositivos móveis.

O Apps Script cria as abas `Cadastros` e `Votos` quando usado. `Cadastros` armazena nome, nascimento e hash de token; `Votos` contém apenas data e número. Não compartilhe a planilha com o público. Dados de nascimento e participação política são sensíveis. Informe finalidade, retenção, exclusão e consentimento. Proteja o arquivo e restrinja acesso. Um token por cadastro **não garante uma pessoa por voto**; não é uma urna segura contra fraude ou registro falso.
## Créditos
Inspirado em [JohnPetros/urna-eletronica](https://github.com/JohnPetros/urna-eletronica), Copyright (c) 2023 João Pedro Carvalho (MIT). Ver [licença original](https://github.com/JohnPetros/urna-eletronica/blob/main/LICENSE). Esta é uma adaptação independente e **não uma clonagem completa** do código original.
