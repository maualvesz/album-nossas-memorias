# 🌹 Nossa História - Álbum de Memórias

Um site permanente e romântico para guardar suas memórias especiais, com funcionalidades completas de adicionar, editar e excluir fotos.

## 🚀 Como Publicar no Netlify

### Passo 1: Criar uma Conta no MongoDB Atlas (Banco de Dados Grátis)

1. Acesse [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Clique em "Sign Up" e crie uma conta
3. Crie um novo projeto chamado "nossa_historia"
4. Crie um cluster (escolha a opção grátis)
5. Aguarde o cluster ser criado (~5 minutos)
6. Clique em "Connect" e escolha "Connect your application"
7. Copie a string de conexão (será algo como: `mongodb+srv://usuario:senha@cluster.mongodb.net/nossa_historia?retryWrites=true&w=majority`)

### Passo 2: Criar um Repositório no GitHub

1. Acesse [github.com](https://github.com) e faça login
2. Clique em "New repository"
3. Nomeie como "album-nossas-memorias"
4. Escolha "Public" ou "Private"
5. Clique em "Create repository"

### Passo 3: Fazer Upload do Código para GitHub

No seu computador, abra o terminal e execute:

```bash
# Navegue até a pasta do projeto
cd /caminho/para/album_netlify

# Inicialize o repositório Git
git init

# Adicione todos os arquivos
git add .

# Faça o primeiro commit
git commit -m "Inicial: Álbum de memórias"

# Adicione o repositório remoto (substitua SEU_USUARIO e SEU_REPO)
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git

# Envie para o GitHub
git branch -M main
git push -u origin main
```

### Passo 4: Conectar ao Netlify

1. Acesse [netlify.com](https://netlify.com)
2. Clique em "Sign up" e escolha "GitHub"
3. Autorize o Netlify a acessar seu GitHub
4. Clique em "New site from Git"
5. Escolha seu repositório "album-nossas-memorias"
6. Configure assim:
   - **Build command:** `npm run build`
   - **Publish directory:** `public`
   - **Functions directory:** `netlify/functions`

### Passo 5: Adicionar as Variáveis de Ambiente

1. No Netlify, vá para "Site settings" → "Build & deploy" → "Environment"
2. Clique em "Edit variables"
3. Adicione uma nova variável:
   - **Key:** `MONGODB_URI`
   - **Value:** Cole a string de conexão do MongoDB que você copiou no Passo 1

### Passo 6: Deploy

1. Clique em "Deploy site"
2. Aguarde o deploy terminar (~2-3 minutos)
3. Seu site estará online! 🎉

## 📝 Como Usar

- **Adicionar Foto:** Clique no card "Adicionar Foto", escolha uma imagem, adicione a data e legenda
- **Editar Foto:** Passe o mouse sobre a foto e clique em "Editar"
- **Excluir Foto:** Passe o mouse sobre a foto e clique em "Excluir"
- **Visualizar:** Clique na foto para abrir em modo ampliado

## 🔒 Segurança

- Suas fotos são armazenadas de forma segura no MongoDB
- A string de conexão é protegida e não fica visível no código
- Apenas você tem acesso ao seu álbum

## 📱 Responsivo

O site funciona perfeitamente em:
- 💻 Desktop
- 📱 Celular
- 📲 Tablet

## 🎨 Design

- Design minimalista e romântico
- Cores rosa, dourado e creme
- Animações suaves e elegantes
- Totalmente responsivo

---

**Criado com ❤️ para guardar suas memórias especiais**
