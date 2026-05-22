const API = "https://ciphernode.onrender.com";
// ========== UTILITÁRIOS ==========

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.classList.add("loading");
    btn.disabled = true;
  } else {
    btn.classList.remove("loading");
    btn.disabled = false;
  }
}

function mostrarMensagem(texto, sucesso = false) {
  const msg = document.getElementById("mensagem");
  if (!msg) return;
  msg.style.color = sucesso ? "#22c55e" : "#f87171";
  msg.innerText = texto;
}

// ========== LOGIN ==========

async function entrar() {
  const usuario = document.getElementById("usuario").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!usuario || !senha) {
    mostrarMensagem("⚠️ Preencha todos os campos");
    return;
  }

  setLoading("btnEntrar", true);

  try {
    const resposta = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ usuario, senha })
    });

    const dados = await resposta.json();

    if (dados.status === "ok") {
      window.location.href = "dashboard.html";
    } else {
      mostrarMensagem("Usuário ou senha incorretos ❌");
    }
  } catch (erro) {
    mostrarMensagem("Erro ao conectar com o servidor");
  } finally {
    setLoading("btnEntrar", false);
  }
}

// ========== CADASTRO ==========

async function cadastrar() {
  const usuario = document.getElementById("usuario").value.trim();
  const senha = document.getElementById("senha").value.trim();
  const confirmar = document.getElementById("confirmar").value.trim();

  if (!usuario || !senha || !confirmar) {
    mostrarMensagem("⚠️ Preencha todos os campos");
    return;
  }

  if (senha.length < 4) {
    mostrarMensagem("❌ A senha deve ter pelo menos 4 caracteres");
    return;
  }

  if (senha !== confirmar) {
    mostrarMensagem("❌ As senhas não coincidem");
    return;
  }

  setLoading("btnCadastrar", true);

  try {
    const resposta = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, senha })
    });

    const dados = await resposta.json();

    if (dados.status === "usuario criado") {
      mostrarMensagem("✅ Conta criada! Redirecionando...", true);
      setTimeout(() => { window.location.href = "index.html"; }, 1500);
    } else {
      mostrarMensagem(dados.msg || "Erro ao cadastrar");
    }
  } catch (erro) {
    mostrarMensagem("Erro ao conectar com o servidor");
  } finally {
    setLoading("btnCadastrar", false);
  }
}

// ========== DASHBOARD ==========

async function verificar() {
  try {
    const resposta = await fetch(`${API}/check`, { credentials: "include" });
    const dados = await resposta.json();

    if (!dados.logado) {
      window.location.href = "index.html";
      return;
    }

    const hora = new Date().getHours();
    const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
    document.getElementById("user").innerText = `${saudacao}, ${dados.usuario} 👋`;
    document.body.style.display = "block";

  } catch (erro) {
    console.error("Erro ao verificar login:", erro);
    window.location.href = "index.html";
  }
}

async function carregarDados() {
  try {
    const resposta = await fetch(`${API}/stats`, { credentials: "include" });
    const dados = await resposta.json();

    document.getElementById("totalUsuarios").innerText =
      "Total de usuários: " + dados.total_usuarios;

    document.getElementById("usuarioNome").innerText =
      "Usuário: " + dados.usuario;

  } catch (erro) {
    console.error("Erro ao carregar dados:", erro);
  }
}

async function logout() {
  await fetch(`${API}/logout`, { method: "POST", credentials: "include" });
  window.location.href = "index.html";
}

// Relógio em tempo real
if (document.getElementById("hora")) {
  setInterval(() => {
    document.getElementById("hora").innerText = new Date().toLocaleString();
  }, 1000);
}

// Inicialização do dashboard
if (document.getElementById("user")) {
  verificar().then(carregarDados);
}
