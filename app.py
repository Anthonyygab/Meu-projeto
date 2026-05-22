from flask import Flask, request, jsonify, session
from flask_cors import CORS
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["https://shimmering-jelly-6748ef.netlify.app"], allow_headers=["Content-Type"], methods=["GET", "POST", "OPTIONS"])
app.secret_key = os.environ.get("SECRET_KEY", "dev-local")  
app.config["SESSION_COOKIE_SAMESITE"] = "None"
app.config["SESSION_COOKIE_SECURE"] = True

def conectar():
    return sqlite3.connect("usuarios.db")

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
        conn.close()
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
    conn.close()

    if user and check_password_hash(user[2], senha):
        session["logado"] = True
        session["usuario"] = usuario
        return jsonify({"status": "ok"})
    else:
        return jsonify({"status": "erro", "msg": "usuário ou senha incorretos"}), 401

@app.route("/check")
def check():
    if session.get("logado"):
        return jsonify({"logado": True, "usuario": session.get("usuario")})
    return jsonify({"logado": False})

@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"status": "ok"})

@app.route("/stats")
def stats():
    if not session.get("logado"):
        return jsonify({"erro": "não autorizado"}), 401

    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM usuarios")
    total = cursor.fetchone()[0]
    conn.close()

    return jsonify({
        "total_usuarios": total,
        "usuario": session.get("usuario")
    })

if __name__ == "__main__":
    app.run(debug=True)
