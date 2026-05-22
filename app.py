from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import os
import jwt
import datetime

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["https://ciphernodee.netlify.app"], allow_headers=["Content-Type", "Authorization"], methods=["GET", "POST", "OPTIONS"])
app.secret_key = os.environ.get("SECRET_KEY", "dev-local")

def conectar():
    return sqlite3.connect("usuarios.db")

def gerar_token(usuario):
    payload = {
        "usuario": usuario,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    return jwt.encode(payload, app.secret_key, algorithm="HS256")

def verificar_token(request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.split(" ")[1]
    try:
        payload = jwt.decode(token, app.secret_key, algorithms=["HS256"])
        return payload["usuario"]
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data:
        return jsonify({"status": "erro", "msg": "sem dados"}), 400

    usuario = data.get("usuario", "").strip()
    senha = data.get("senha", "").strip()

    if not usuario or not senha:
        return jsonify({"status": "erro", "msg": "campos obrigatórios"}), 400

    if len(senha) < 4:
        return jsonify({"status": "erro", "msg": "senha muito curta"}), 400

    senha_hash = generate_password_hash(senha)
    conn = conectar()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO usuarios (usuario, senha) VALUES (?, ?)",
            (usuario, senha_hash)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({"status": "erro", "msg": "usuário já existe"}), 409
    finally:
        conn.close()

    return jsonify({"status": "usuario criado"})

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"status": "erro", "msg": "sem dados"}), 400

    usuario = data.get("usuario", "").strip()
    senha = data.get("senha", "").strip()

    if not usuario or not senha:
        return jsonify({"status": "erro", "msg": "campos obrigatórios"}), 400

    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM usuarios WHERE usuario=?", (usuario,))
    user = cursor.fetchone()

    if user and check_password_hash(user[2], senha):
        # registra login no histórico
        cursor.execute(
            "INSERT INTO logins (usuario, data_hora) VALUES (?, ?)",
            (usuario, datetime.datetime.now().strftime("%d/%m/%Y %H:%M"))
        )
        conn.commit()
        conn.close()
        token = gerar_token(usuario)
        return jsonify({"status": "ok", "token": token, "usuario": usuario})
    else:
        conn.close()
        return jsonify({"status": "erro", "msg": "usuário ou senha incorretos"}), 401

@app.route("/check")
def check():
    usuario = verificar_token(request)
    if usuario:
        return jsonify({"logado": True, "usuario": usuario})
    return jsonify({"logado": False})

@app.route("/logout", methods=["POST"])
def logout():
    return jsonify({"status": "ok"})

@app.route("/stats")
def stats():
    usuario = verificar_token(request)
    if not usuario:
        return jsonify({"erro": "não autorizado"}), 401

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM usuarios")
    total = cursor.fetchone()[0]

    cursor.execute("SELECT usuario, data_cadastro FROM usuarios ORDER BY id DESC LIMIT 10")
    usuarios = [{"usuario": r[0], "data": r[1] or "—"} for r in cursor.fetchall()]

    cursor.execute("SELECT usuario, data_hora FROM logins ORDER BY id DESC LIMIT 10")
    logins = [{"usuario": r[0], "hora": r[1]} for r in cursor.fetchall()]

    # cadastros por dia da semana (últimos 7 dias)
    cursor.execute("""
        SELECT data_cadastro, COUNT(*) FROM usuarios
        WHERE data_cadastro IS NOT NULL
        GROUP BY data_cadastro
        ORDER BY data_cadastro DESC
        LIMIT 7
    """)
    grafico = [{"dia": r[0], "total": r[1]} for r in cursor.fetchall()]

    conn.close()

    return jsonify({
        "total_usuarios": total,
        "usuario": usuario,
        "usuarios": usuarios,
        "logins": logins,
        "grafico": grafico
    })

if __name__ == "__main__":
    app.run(debug=True)
