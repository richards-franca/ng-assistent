<div align="center">

<img src="https://raw.githubusercontent.com/richards-franca/ng-assistent/refs/heads/main/assets/niggatron-logo.png" alt="NiggaTron" width="360" />

# NiggaTron

### Assistente de suporte para gravar, transcrever e registrar atendimentos.

<p>
  <img src="https://img.shields.io/badge/Windows-10%2F11-50D9E8?style=for-the-badge&logo=windows&logoColor=111118" alt="Windows 10 e 11" />
  <img src="https://img.shields.io/badge/Electron-37-ef326f?style=for-the-badge&logo=electron&logoColor=ffffff" alt="Electron" />
  <img src="https://img.shields.io/badge/Groq-IA-F5C84B?style=for-the-badge&logo=groq&logoColor=111118" alt="Groq" />
</p>

`> GRAVE. RESUMA. REGISTRE.`

</div>

---

## O que é

O **NiggaTron** ajuda equipes de suporte que atendem clientes por voz. Durante a chamada, ele captura o microfone e o áudio do computador; ao final, transcreve a conversa e gera um registro pronto para ser copiado para a plataforma de atendimento.

Tudo foi pensado para reduzir a tarefa manual de anotar contexto, problema e resolução.

## Recursos

| Recurso | Como ajuda |
| --- | --- |
| 🎙️ **Captura de duas fontes** | Combina sua voz com o áudio reproduzido no computador para registrar os dois lados do atendimento. |
| ✨ **Transcrição com IA** | Envia o áudio para a Groq após a finalização e retorna a transcrição da conversa. |
| 📝 **Três versões de descrição** | Gera uma descrição padrão, uma com resolução e uma versão mais detalhada. |
| 🏷️ **Título e tags sugeridos** | Cria um título curto e seleciona de 1 a 3 tags da lista predefinida. |
| 📋 **Cópia rápida** | Copie título, descrição ou o registro completo com um clique. |
| 🗂️ **Histórico local** | Armazena os atendimentos, e-mail do cliente, tags, transcrição e as três descrições. |
| 🔐 **Dados protegidos** | A chave da Groq e o histórico são criptografados localmente pelo Windows. |
| ⏱️ **Chamadas longas** | Divide a gravação em partes menores antes da transcrição para evitar limites de tamanho. |

## Instalação

### Opção recomendada — instalador

1. Baixe o arquivo `NiggaTron-Setup-0.1.0.exe` na página de releases.
2. Execute o instalador.
3. Escolha a pasta de instalação e conclua o assistente.
4. Abra o **NiggaTron** pelo Menu Iniciar ou atalho da área de trabalho.

### Rodar a partir do código-fonte

Pré-requisito: [Node.js LTS](https://nodejs.org/).

```bash
npm install
npm start
```

Para gerar um novo instalador Windows:

```bash
npm run dist
```

O instalador será criado na pasta `dist`.

## Primeiro uso

1. Abra a aba **Encrypted**.
2. Informe uma chave de API da Groq no formato `gsk_...`.
3. Volte para **Central** e escolha o microfone.
4. Clique em **Iniciar gravação** e permita o compartilhamento do áudio do computador quando solicitado.
5. Ao encerrar a chamada, clique em **Finalizar e gerar**.
6. Revise o e-mail, título, tags e as três descrições.
7. Use os botões de cópia para registrar o atendimento na sua plataforma.

> **Importante:** avise o cliente sobre a gravação conforme a política da sua empresa e a legislação aplicável.

## Estrutura do registro

Cada atendimento pode conter:

```text
E-mail do cliente
Título
Tags
Descrição padrão
Descrição com resolução
Descrição mais detalhada
Transcrição
```

Os registros ficam disponíveis na aba **Atendimentos**, onde também podem ser apagados individualmente.

## Tags disponíveis

`API Oficial` · `Áudio` · `Automação` · `Botões/cmd` · `Bug` · `conexão` · `configurações` · `Disparos` · `Dúvidas` · `End Points` · `Financeiro` · `GHL` · `Grupos` · `instabilidade` · `Integração` · `Meta ADS Privacy` · `Migração` · `Notificação` · `Planos/Assinaturas` · `Proxy` · `Receptor` · `Restrição` · `Script` · `SDK` · `SMS` · `ST Chat` · `Stevo` · `Stevo Fusão` · `Stevo IA` · `Stevo Voice` · `Switch/Número De Referência` · `Toolkit` · `Transmissor` · `Webhook`

## Privacidade

- O áudio não é salvo permanentemente pelo aplicativo.
- A transmissão à Groq ocorre somente quando o atendimento é finalizado.
- A chave de API e o histórico são salvos de forma criptografada no computador atual.
- Você pode remover qualquer atendimento do histórico pela própria interface.

---

<div align="center">
  Feito para deixar o suporte mais rápido, organizado e humano. ⚡
</div>
