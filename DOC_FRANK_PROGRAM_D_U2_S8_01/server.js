import express from "express";
import mysql from "mysql2/promise"; // Importar la versión de promesas
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// Configuración del Pool de Conexiones (¡Recomendado!)
// El Pool gestiona eficientemente la apertura y cierre (liberación) de conexiones.
const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "1234",
    database: "sis_notas",
    waitForConnections: true,
    connectionLimit: 10, // Un límite para el número máximo de conexiones activas
    queueLimit: 0
});

// Probar el Pool de Conexiones al iniciar el servidor
pool.getConnection()
    .then(connection => {
        console.log("✅ Pool de conexiones listo. Conexión de prueba exitosa.");
        connection.release(); // Importante: liberar la conexión de prueba
    })
    .catch(err => {
        console.error("❌ Error al inicializar el Pool de MySQL:", err);
        // Opcional: Cerrar el proceso si la base de datos no está disponible
        process.exit(1); 
    });


// ----------------------------------------------------------------------
// 🔒 Ruta de Login (Apertura y Cierre por Solicitud)
// ----------------------------------------------------------------------
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    let connection; // Variable para almacenar la conexión obtenida del pool

    try {
        // 1. Apertura: Obtener una conexión del Pool
        connection = await pool.getConnection();

        // 2. Consulta Preparada
        // Usamos execute() para consultas preparadas
        const sql = "SELECT id_docente, nombre, apellido, password FROM Docentes WHERE email = ?";
        const [results] = await connection.execute(sql, [email]);

        if (results.length === 0) {
            return res.json({ ok: false, mensaje: "❌ Credenciales incorrectas" });
        }
        
        const docente = results[0];
        
        // **Nota Importante:** Esto es vulnerable. En producción, aquí se usaría bcrypt.compare()
        if (docente.password === password) {
            res.json({ 
                ok: true, 
                mensaje: "✅ Acceso concedido", 
                docente: { id_docente: docente.id_docente, nombre: docente.nombre, apellido: docente.apellido }
            });
        } else {
            res.json({ ok: false, mensaje: "❌ Credenciales incorrectas" });
        }

    } catch (err) {
        console.error("Error en la consulta de Login:", err);
        res.status(500).json({ ok: false, mensaje: "Error interno en el servidor" });
    } finally {
        // 3. Cierre: Liberar la conexión al Pool para que pueda ser reusada
        if (connection) {
            connection.release(); 
            console.log("Conexión liberada después de LOGIN.");
        }
    }
});


// ----------------------------------------------------------------------
// 📘 Ruta para obtener las asignaciones del docente
// ----------------------------------------------------------------------
app.get("/asignaciones/:id_docente", async (req, res) => {
    const id_docente = parseInt(req.params.id_docente, 10); 
    let connection;

    // Verificar si el ID es válido antes de consultar la BD
    if (isNaN(id_docente)) {
        return res.status(400).json({ ok: false, mensaje: "ID de docente inválido." });
    }

    try {
        connection = await pool.getConnection();

        // **CONSULTA CORREGIDA**
        const sql = `
            SELECT 
                a.id_asignacion, 
                c.nombre AS nombre_curso,  
                a.periodo, 
                a.seccion 
            FROM Asignaciones a
            JOIN Cursos c ON a.id_curso = c.id_curso
            WHERE a.id_docente = ?
        `;
        // Los campos 'semestre' y 'seccion' no existen en tu esquema. Usamos 'periodo' y 'seccion' de la tabla Asignaciones, y 'nombre' de la tabla Cursos.
        const [rows] = await connection.execute(sql, [id_docente]);

        res.json({ ok: true, asignaciones: rows });
    } catch (err) {
        console.error("❌ Error al obtener asignaciones:", err);
        // Devolvemos el error de la BD al cliente (no en producción)
        res.status(500).json({ ok: false, mensaje: "Error al obtener asignaciones. Revise la consola del servidor." });
    } finally {
        if (connection) connection.release();
        console.log("Conexión liberada después de GET ASIGNACIONES.");
    }
});

// ----------------------------------------------------------------------
// Servidor
// ----------------------------------------------------------------------
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));