const API = "https://ciphernode.onrender.com";

function salvarToken(token, usuario) {
  localStorage.setItem("token", token);
  localStorage.setItem("usuario", usuario);
}

function getToken() {
  return localStorage.getItem("token");
}

function limparToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getToken()}`
  };
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) { btn.classList.add("loading"); btn.disabled = true; }
  else { btn.classList.remove("loading"); btn.disabled = false; }
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

  if (!usuario || !senha) { mostrarMensagem("⚠️ Preencha todos os campos"); return; }

  setLoading("btnEntrar", true);
  try {
    const resposta = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, senha })
    });
    const dados = await resposta.json();
    if (dados.status === "ok") {
      salvarToken(dados.token, dados.usuario);
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

  if (!usuario || !senha || !confirmar) { mostrarMensagem("⚠️ Preencha todos os campos"); return; }
  if (senha.length < 4) { mostrarMensagem("❌ A senha deve ter pelo menos 4 caracteres"); return; }
  if (senha !== confirmar) { mostrarMensagem("❌ As senhas não coincidem"); return; }

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
  const token = getToken();
  if (!token) { window.location.href = "index.html"; return; }

  try {
    const resposta = await fetch(`${API}/check`, { headers: authHeaders() });
    const dados = await resposta.json();
    if (!dados.logado) { limparToken(); window.location.href = "index.html"; return; }

    const hora = new Date().getHours();
    const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
    document.getElementById("user").innerText = `${saudacao}, ${dados.usuario} 👋`;
    document.body.style.display = "block";
  } catch (erro) {
    window.location.href = "index.html";
  }
}

async function carregarDados() {
  try {
    const resposta = await fetch(`${API}/stats`, { headers: authHeaders() });
    const dados = await resposta.json();

    document.getElementById("totalUsuarios").innerText = dados.total_usuarios;

    // último login
    if (dados.logins && dados.logins.length > 0) {
      document.getElementById("ultimoLogin").innerText = dados.logins[0].usuario;
    }

    // lista de usuários
    const listaUsuarios = document.getElementById("listaUsuarios");
    if (dados.usuarios && dados.usuarios.length > 0) {
      listaUsuarios.innerHTML = dados.usuarios.map(u => `
        <div class="lista-row">
          <span class="lista-nome">${u.usuario}</span>
          <span class="lista-data">${u.data}</span>
        </div>
      `).join("");
    } else {
      listaUsuarios.innerText = "Nenhum usuário encontrado";
    }

    // histórico de logins
    const listaLogins = document.getElementById("listaLogins");
    if (dados.logins && dados.logins.length > 0) {
      listaLogins.innerHTML = dados.logins.map(l => `
        <div class="lista-row">
          <span class="lista-nome" style="color:#4affb4">${l.usuario}</span>
          <span class="lista-data">${l.hora}</span>
        </div>
      `).join("");
    } else {
      listaLogins.innerText = "Nenhum login registrado";
    }

    // gráfico
    const grafico = document.getElementById("grafico");
    if (dados.grafico && dados.grafico.length > 0) {
      const max = Math.max(...dados.grafico.map(g => g.total));
      grafico.innerHTML = `
        <div class="grafico-barras">
          ${dados.grafico.map(g => `
            <div class="barra-wrap">
              <div class="barra" style="height:${Math.round((g.total / max) * 60)}px"></div>
              <div class="barra-label">${g.dia ? g.dia.slice(0,5) : "—"}</div>
            </div>
          `).join("")}
        </div>
      `;
    } else {
      grafico.innerText = "Nenhum dado disponível";
    }

  } catch (erro) {
    console.error("Erro ao carregar dados:", erro);
  }
}

async function logout() {
  await fetch(`${API}/logout`, { method: "POST", headers: authHeaders() });
  limparToken();
  window.location.href = "index.html";
}

if (document.getElementById("hora")) {
  setInterval(() => {
    document.getElementById("hora").innerText = new Date().toLocaleString();
  }, 1000);
}

if (document.getElementById("user")) {
  verificar().then(carregarDados);
}
