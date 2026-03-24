# 📖 Guia Completo de Configuração
## Álbum de Memórias — Cloudinary + MongoDB + Netlify

---

## ✅ O que foi resolvido

| Problema anterior | Solução aplicada |
|---|---|
| Imagens salvas como base64 no MongoDB | Upload direto para **Cloudinary** — MongoDB guarda apenas a URL |
| Erro 413 (payload muito grande) | Arquivos nunca passam pelo Netlify Functions — vão direto para Cloudinary |
| Erro 502 após imagem grande | Eliminado junto com o base64 |
| Imagens cortadas de forma estranha | `object-fit: contain` — a imagem é exibida inteira, sem cortes |
| Grid em lista vertical | Grid responsivo com colunas dinâmicas |
| Botões do modal empilhados verticalmente | `flex-direction: row` forçado — sempre lado a lado |

---

## 🏗️ Arquitetura nova

```
Usuário seleciona arquivo
        │
        ▼
Frontend pede assinatura ao backend
  (/.netlify/functions/cloudinary-sign)
        │
        ▼
Frontend faz upload DIRETO para Cloudinary
  (sem passar pelo Netlify Functions)
        │
        ▼
Cloudinary devolve URL segura (HTTPS)
        │
        ▼
Frontend envia apenas { url, data, legenda }
  para /.netlify/functions/photos (POST)
        │
        ▼
Backend salva apenas a URL no MongoDB ✅
```

---

## 🔧 Passo 1 — Criar conta no Cloudinary

1. Acesse **https://cloudinary.com** e clique em **Sign Up Free**
2. Preencha nome, e-mail e senha (pode usar conta Google)
3. Após login, você verá o **Dashboard**

### Onde encontrar as credenciais:

No Dashboard, procure o card **"Product Environment Credentials"**:

| Campo | Onde fica |
|---|---|
| **Cloud Name** | Linha "Cloud name" — ex: `minha-nuvem` |
| **API Key**    | Linha "API key"  — ex: `123456789012345` |
| **API Secret** | Linha "API secret" — clique em 👁 para revelar |

> ⚠️ **Nunca exponha o API Secret no frontend!** Ele fica apenas no backend (variável de ambiente no Netlify).

---

## 🔧 Passo 2 — Configurar variáveis de ambiente no Netlify

1. No Netlify, abra seu site → **Site configuration** → **Environment variables**
2. Clique em **Add a variable** para cada uma abaixo:

| Variável | Valor |
|---|---|
| `MONGODB_URI` | Sua connection string do MongoDB Atlas |
| `CLOUDINARY_CLOUD_NAME` | Cloud name do Cloudinary |
| `CLOUDINARY_API_KEY` | API Key do Cloudinary |
| `CLOUDINARY_API_SECRET` | API Secret do Cloudinary |

3. Clique em **Save** e depois faça um novo **Deploy** (Deploys → Trigger deploy → Deploy site)

---

## 🔧 Passo 3 — Configurar o upload no Cloudinary (Upload Preset)

Para o upload **assinado** (que já está implementado neste projeto), não é necessário criar um preset.

A função `cloudinary-sign.js` gera a assinatura automaticamente no backend, então o upload é sempre seguro.

Se quiser verificar os uploads: no painel do Cloudinary, vá em **Media Library** → pasta `nossas-memorias`.

---

## 🔧 Passo 4 — Testar localmente

### Pré-requisitos:
```bash
npm install -g netlify-cli
```

### Configurar variáveis locais:
Crie um arquivo `.env` na raiz do projeto (nunca commitar!):
```env
MONGODB_URI=mongodb+srv://...
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
```

### Rodar:
```bash
npm install
netlify dev
```

Acesse **http://localhost:8888**

---

## 🔧 Passo 5 — Deploy no Netlify

### Via GitHub (recomendado):
1. Faça push do projeto para um repositório GitHub
2. No Netlify: **Add new site** → **Import an existing project** → GitHub
3. Selecione o repositório
4. Build settings:
   - **Build command:** `npm install`
   - **Publish directory:** `public`
   - **Functions directory:** `netlify/functions`
5. Clique em **Deploy site**

### Via Netlify CLI:
```bash
netlify login
netlify deploy --prod
```

---

## 📁 Estrutura dos arquivos

```
projeto/
├── public/
│   ├── index.html       ← Página principal do álbum
│   ├── login.html       ← Página de login
│   ├── script.js        ← Lógica frontend (upload Cloudinary)
│   └── style.css        ← Estilos responsivos
├── netlify/
│   └── functions/
│       ├── photos.js          ← CRUD no MongoDB (só URLs)
│       └── cloudinary-sign.js ← Gera assinatura de upload seguro
├── netlify.toml         ← Configuração do Netlify
├── package.json
└── .env.example         ← Modelo das variáveis de ambiente
```

---

## 🎨 Melhorias de interface implementadas

### Exibição proporcional das mídias
- `object-fit: contain` — imagem exibida inteira, sem cortes
- `max-height: 400px` — teto para imagens muito altas
- Grid se adapta à proporção de cada imagem

### Grid responsivo
| Tela | Colunas |
|---|---|
| Desktop > 900px | 3–4 colunas automáticas |
| Tablet 600–900px | 2–3 colunas |
| Mobile 380–600px | 2 colunas |
| Mobile < 380px | 1 coluna |

### Modal de visualização
- Botões Anterior / Baixar / Próxima sempre **lado a lado** (`flex-direction: row`)
- Em telas pequenas os botões ficam menores mas permanecem horizontais
- Imagem com `object-fit: contain` — nunca cortada

### Toast de feedback
- Mensagens de sucesso/erro sem `alert()` bloqueante
- Aparecem no canto inferior da tela

---

## 🚨 Solução de problemas

### "Variáveis de ambiente do Cloudinary não configuradas"
→ Verifique se as 3 variáveis estão no painel do Netlify e que fez novo deploy após adicioná-las.

### Upload falha com erro de assinatura
→ Verifique se o `CLOUDINARY_API_SECRET` está correto (sem espaços extras).

### Fotos antigas (base64) não aparecem
→ Fotos salvas antes dessa migração ficaram corrompidas no banco. Você pode:
  1. Limpar a collection do MongoDB: `db.photos.deleteMany({})`
  2. Adicionar as fotos novamente — agora serão salvas com URL do Cloudinary

### Erro 502 ainda acontece
→ Verifique o `MONGODB_URI` no Netlify. O erro 502 após a migração é quase sempre conexão com o banco.
